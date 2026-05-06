from typing import List, Dict, Any, Optional, Tuple
import random
import logging

import torch
import torchvision
from torchvision.models.detection import FasterRCNN
from torchvision.models.detection.rpn import AnchorGenerator
from torchvision.ops import MultiScaleRoIAlign
from torch.utils.data import Dataset, DataLoader

import cv2
import numpy as np

from app.domain.entities.base_detection_model import BaseDetectionModel
from app.domain.ml_schemas import BoundingBoxPrediction
from app.infrastructure.utils.dataset_loader import load_yolo_dataset

logger = logging.getLogger(__name__)

class DetectionDataset(Dataset):
    def __init__(self, train_data: List[Dict[str, Any]], transform=None):

        self.samples = []
        for item in train_data:
            img_path = item['image_path']
            anns = item['annotations']
            if not anns:
                continue
            self.samples.append((img_path, anns))
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, anns = self.samples[idx]
        image = cv2.imread(img_path)
        if image is None:
            raise ValueError(f"Could not load image: {img_path}")
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        orig_h, orig_w = image.shape[:2]

        boxes = []
        labels = []
        for ann in anns:
            class_id, xc, yc, w_n, h_n = ann
            x1 = (xc - w_n/2) * orig_w
            y1 = (yc - h_n/2) * orig_h
            x2 = (xc + w_n/2) * orig_w
            y2 = (yc + h_n/2) * orig_h
            boxes.append([x1, y1, x2, y2])
            labels.append(class_id + 1)

        boxes = torch.as_tensor(boxes, dtype=torch.float32)
        labels = torch.as_tensor(labels, dtype=torch.int64)
        image_id = torch.tensor([idx])
        area = (boxes[:, 3] - boxes[:, 1]) * (boxes[:, 2] - boxes[:, 0])
        iscrowd = torch.zeros((len(anns),), dtype=torch.int64)

        target = {
            'boxes': boxes,
            'labels': labels,
            'image_id': image_id,
            'area': area,
            'iscrowd': iscrowd
        }

        image_tensor = torch.from_numpy(image).permute(2,0,1).float() / 255.0

        if self.transform:
            image_tensor = self.transform(image_tensor)

        return image_tensor, target

def collate_fn(batch):
    return tuple(zip(*batch))

class PyTorchAdapter(BaseDetectionModel):
    def __init__(self, num_classes: int = 91, backbone_frozen: bool = False):
        self.model = None
        self.num_classes = num_classes
        self.backbone_frozen = backbone_frozen
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    def load(self, model_path: str, config_path: Optional[str] = None) -> None:
        self.model = torch.load(model_path, map_location=self.device, weights_only=False)
        self.model.to(self.device)
        self.model.eval()

    def _build_model(self, num_classes: int = 2) -> FasterRCNN:
        backbone = torchvision.models.mobilenet_v2(pretrained=False).features
        backbone.out_channels = 1280
        anchor_sizes = ((32, 64, 128, 256, 512),)
        aspect_ratios = ((0.5, 1.0, 2.0),)
        rpn_anchor_generator = AnchorGenerator(anchor_sizes, aspect_ratios)
        roi_pooler = MultiScaleRoIAlign(featmap_names=['0'], output_size=7, sampling_ratio=2)
        model = FasterRCNN(
            backbone=backbone,
            num_classes=num_classes,
            rpn_anchor_generator=rpn_anchor_generator,
            box_roi_pool=roi_pooler,
            min_size=256,
            max_size=1333
        )
        return model

    def predict(self, image: np.ndarray, confidence_threshold: float = 0.5) -> List[BoundingBoxPrediction]:
        img_tensor = torch.from_numpy(image).permute(2, 0, 1).float() / 255.0
        img_tensor = img_tensor.to(self.device)
        with torch.no_grad():
            predictions = self.model([img_tensor])[0]
        boxes = predictions['boxes'].cpu().numpy()
        scores = predictions['scores'].cpu().numpy()
        labels = predictions['labels'].cpu().numpy()
        h, w = image.shape[:2]
        result = []
        for box, score, label in zip(boxes, scores, labels):
            if score < confidence_threshold:
                continue
            x1, y1, x2, y2 = box
            result.append(BoundingBoxPrediction(
                x=float(x1 / w),
                y=float(y1 / h),
                width=float((x2 - x1) / w),
                height=float((y2 - y1) / h),
                label=str(label),
                confidence=float(score)
            ))
        return result

    def predict_with_uncertainty(self, image: np.ndarray, confidence_threshold: float = 0.5) -> Tuple[List[BoundingBoxPrediction], float]:
        predictions = self.predict(image, confidence_threshold)
        return predictions, 0.0

    def train(self, 
              train_data: List[Dict[str, Any]], 
              epochs: int, 
              batch_size: int, 
              learning_rate: float,
              val_split: float = 0.1, 
              save_best: bool = True, 
              **kwargs
              ) -> Dict[str, Any]:

        if kwargs.get('data_yaml'):
            train_data = load_yolo_dataset(kwargs['data_yaml'])
        
        random.shuffle(train_data)
        val_size = int(len(train_data) * val_split)
        train_samples = train_data[val_size:]
        val_samples = train_data[:val_size] if val_size > 0 else []

        train_dataset = DetectionDataset(train_samples)
        val_dataset = DetectionDataset(val_samples) if val_samples else None

        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True,
                                  collate_fn=collate_fn, num_workers=2, pin_memory=True)
        val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False,
                                collate_fn=collate_fn, num_workers=2, pin_memory=True) if val_dataset else None

        params = [p for p in self.model.parameters() if p.requires_grad]
        optimizer = torch.optim.SGD(params, lr=learning_rate, momentum=kwargs.get('momentum', 0.9),
                                    weight_decay=kwargs.get('weight_decay', 0.0005))
        scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=kwargs.get('step_size', 3),
                                                    gamma=kwargs.get('gamma', 0.1))

        device = self.device
        self.model.to(device)
        self.model.train()

        best_val_loss = float('inf')
        best_model_state = None
        history = {'train_loss': [], 'val_loss': []}

        for epoch in range(epochs):
            self.model.train()
            epoch_loss = 0.0
            for images, targets in train_loader:
                images = [img.to(device) for img in images]
                targets = [{k: v.to(device) for k, v in t.items()} for t in targets]

                loss_dict = self.model(images, targets)
                losses = sum(loss for loss in loss_dict.values())

                optimizer.zero_grad()
                losses.backward()
                optimizer.step()

                epoch_loss += losses.item()

            avg_train_loss = epoch_loss / len(train_loader)
            history['train_loss'].append(avg_train_loss)
            logger.info(f"Epoch {epoch+1}/{epochs} - Train loss: {avg_train_loss:.4f}")

            avg_val_loss = 0.0
            if val_loader:
                self.model.eval()
                val_loss = 0.0
                with torch.no_grad():
                    for images, targets in val_loader:
                        images = [img.to(device) for img in images]
                        targets = [{k: v.to(device) for k, v in t.items()} for t in targets]
                        loss_dict = self.model(images, targets)
                        losses = sum(loss for loss in loss_dict.values())
                        val_loss += losses.item()
                avg_val_loss = val_loss / len(val_loader)
                history['val_loss'].append(avg_val_loss)
                logger.info(f"Epoch {epoch+1}/{epochs} - Val loss: {avg_val_loss:.4f}")

            scheduler.step()

            if save_best and (avg_val_loss < best_val_loss or not val_loader):
                best_val_loss = avg_val_loss if val_loader else avg_train_loss
                best_model_state = {k: v.cpu().clone() for k, v in self.model.state_dict().items()}
                logger.info(f"New best model saved (loss: {best_val_loss:.4f})")

        if best_model_state:
            self.model.load_state_dict(best_model_state)
        self.model.to(self.device)
        self.model.eval()
        map_score = 0.0

        return {
            'loss': history['train_loss'][-1],
            'val_loss': history['val_loss'][-1] if history['val_loss'] else 0.0,
            'mAP': map_score,
            'train_losses': history['train_loss'],
            'val_losses': history['val_loss']
        }

    def save(self, path: str) -> None:
        torch.save(self.model, path)

    def supports_incremental_learning(self) -> bool:
        return True

    def add_new_classes(self, new_class_names: List[str]) -> None:
        old_num_classes = self.model.roi_heads.box_predictor.cls_score.out_features
        new_num_classes = old_num_classes + len(new_class_names)
        in_features = self.model.roi_heads.box_predictor.cls_score.in_features
        new_predictor = torchvision.models.detection.faster_rcnn.FastRCNNPredictor(in_features, new_num_classes)
        new_state = new_predictor.state_dict()
        old_state = self.model.roi_heads.box_predictor.state_dict()
        new_state['cls_score.weight'][:old_num_classes] = old_state['cls_score.weight']
        new_state['cls_score.bias'][:old_num_classes] = old_state['cls_score.bias']
        new_predictor.load_state_dict(new_state)
        self.model.roi_heads.box_predictor = new_predictor
        self.num_classes = new_num_classes
        if self.backbone_frozen:
            self.freeze_backbone(True)

    def freeze_backbone(self, frozen: bool = True) -> None:
        for param in self.model.backbone.parameters():
            param.requires_grad = not frozen

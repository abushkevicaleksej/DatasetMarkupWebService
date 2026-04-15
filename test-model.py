import torch
import torchvision

from torchvision.models.detection import FasterRCNN
from torchvision.models.detection.rpn import AnchorGenerator
from torchvision.models.detection.image_list import ImageList
from torchvision.ops import MultiScaleRoIAlign

def build_detection_model(num_classes: int = 91) -> torch.nn.Module:
    backbone = torchvision.models.mobilenet_v2(pretrained=False).features
    backbone.out_channels = 1280

    anchor_sizes = ((32, 64, 128, 256, 512),)
    aspect_ratios = ((0.5, 1.0, 2.0),)
    rpn_anchor_generator = AnchorGenerator(anchor_sizes, aspect_ratios)

    roi_pooler = MultiScaleRoIAlign(
        featmap_names=['0'],
        output_size=7,
        sampling_ratio=2
    )

    model = FasterRCNN(
        backbone=backbone,
        num_classes=num_classes,
        rpn_anchor_generator=rpn_anchor_generator,
        box_roi_pool=roi_pooler,
        min_size=256,
        max_size=1333,
    )

    return model

def save_model(model: torch.nn.Module, path: str = "object_detection_model.pt"):
    
    model.eval()
    torch.save(model, path)
    print(f"Модель сохранена в {path}")

if __name__ == "__main__":
    NUM_CLASSES = 91
    
    model = build_detection_model(num_classes=NUM_CLASSES)
    model.eval()
    dummy_input = [torch.rand(3, 300, 400)]
    with torch.no_grad():
        out = model(dummy_input)
    print("Пример вывода модели (случайные веса):")
    print(out)
    
    save_model(model, "object_detection_model.pt")
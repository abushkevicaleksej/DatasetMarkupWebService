from typing import List, Dict
from pathlib import Path

def load_yolo_dataset(data_yaml: str) -> List[Dict]:
    import yaml
    from pathlib import Path
    import cv2

    with open(data_yaml, 'r') as f:
        cfg = yaml.safe_load(f)

    dataset_path = Path(cfg['path'])
    train_path = cfg.get('train')
    if isinstance(train_path, list):
        train_path = train_path[0]

    images_dir = dataset_path / train_path
    labels_dir = dataset_path / 'labels'

    extensions = ('*.jpg', '*.jpeg', '*.png', '*.bmp', '*.JPG', '*.JPEG', '*.PNG')
    image_paths = []
    for ext in extensions:
        image_paths.extend(images_dir.glob(ext))

    print(f"Images dir: {images_dir}, found {len(image_paths)} images")
    print(f"Labels dir: {labels_dir}")

    train_data = []
    for img_path in image_paths:
        label_path = labels_dir / (img_path.stem + '.txt')
        if not label_path.exists():
            continue
        with open(label_path, 'r') as lf:
            lines = lf.readlines()
        anns = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            parts = list(map(float, line.split()))
            if len(parts) != 5:
                continue
            class_id = int(parts[0])
            xc, yc, w, h = parts[1:5]
            anns.append([class_id, xc, yc, w, h])
        if anns:
            train_data.append({'image_path': str(img_path), 'annotations': anns})
    return train_data
import os
import torch
import numpy as np
import urllib.request
from fastapi import FastAPI, UploadFile, File, Form
from PIL import Image
import io
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

app = FastAPI()

# Конфиги
CHECKPOINT_URL = "https://dl.fbaipublicfiles.com/segment_anything_2/072824/sam2_hiera_tiny.pt"
CHECKPOINT_PATH = "/app/weights/sam2_hiera_tiny.pt" # Путь внутри контейнера
CONFIG_NAME = "sam2_hiera_t.yaml"

def download_weights():
    if not os.path.exists(CHECKPOINT_PATH):
        print("Downloading weights...")
        os.makedirs(os.path.dirname(CHECKPOINT_PATH), exist_ok=True)
        urllib.request.urlretrieve(CHECKPOINT_URL, CHECKPOINT_PATH)

download_weights()

# ПРИНУДИТЕЛЬНО CPU
device = torch.device("cpu")
model = build_sam2(CONFIG_NAME, CHECKPOINT_PATH, device=device)
predictor = SAM2ImagePredictor(model)

@app.post("/annotate")
async def annotate(file: UploadFile = File(...), x: int = Form(...), y: int = Form(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    image_np = np.array(image)

    predictor.set_image(image_np)
    
    input_point = np.array([[x, y]])
    input_label = np.array([1])

    with torch.no_grad(): # Отключаем градиенты для экономии памяти
        masks, scores, _ = predictor.predict(
            point_coords=input_point,
            point_labels=input_label,
            multimask_output=False,
        )

    mask = masks[0]
    coords = np.argwhere(mask)
    if coords.size == 0:
        return {"bbox": None}

    y_min, x_min = coords.min(axis=0)
    y_max, x_max = coords.max(axis=0)

    return {
        "bbox": [int(x_min), int(y_min), int(x_max), int(y_max)],
        "score": float(scores[0])
    }
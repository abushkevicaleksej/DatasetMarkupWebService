import os
import datetime
import httpx

from PIL import Image

from faststream import FastStream
from faststream.rabbit import RabbitBroker

from app.domain.entities.job_messages_model import SmartBBoxTaskMessage, JobStatus
from app.infrastructure.database import SessionLocal
from app.infrastructure.repositories.async_job_repository import AsyncJobRepository
from app.infrastructure.repositories.file_repository import FileRepository
from app.infrastructure.repositories.annotation_repository import AnnotationRepository

broker = RabbitBroker()
app = FastStream(broker)

@broker.subscriber("smart_bbox")
async def handle_smart_bbox(msg: SmartBBoxTaskMessage):
    db = SessionLocal()
    job_repo = AsyncJobRepository(db)

    try:
        job_repo.update_job(
            msg.job_id, 
            status=JobStatus.PROCESSING, 
            updated_at=datetime.utcnow()
        )

        with Image.open(msg.file_path) as img:
            img_w, img_h = img.size

        SAM2_URL = "http://localhost:5000/annotate"

        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(msg.file_path, "rb") as f:
                
                files = {"file": (os.path.basename(msg.file_path), f, "image/jpeg")}
                payload = {"x": msg.x, "y": msg.y}
                sam_response = await client.post(SAM2_URL, files=files, data=payload)
            
            if sam_response.status_code != 200:
                raise Exception(f"SAM2 error: {sam_response.text}")
            result = sam_response.json()
            
            if not result.get("bbox"):
                raise Exception("Object not detected")
            x_min, y_min, x_max, y_max = result["bbox"]

        norm_x = x_min / img_w
        norm_y = y_min / img_h
        norm_w = (x_max - x_min) / img_w
        norm_h = (y_max - y_min) / img_h

        annotation_repo = AnnotationRepository(db)
        bbox_data = [{
            "x": norm_x,
            "y": norm_y,
            "width": norm_w,
            "height": norm_h,
            "label": "auto-detected",
            "confidence": result.get("score", 1.0)
        }]
        new_ann = annotation_repo.create_annotation(
            file_id=msg.file_id,
            task_id=msg.task_id,
            bounding_boxes=bbox_data
        )

        result_data = {
            "annotation_id": str(new_ann.id),
            "bbox": [bbox_data[0]]
        }
        job_repo.update_job(msg.job_id,
                            status=JobStatus.COMPLETED,
                            result=json.dumps(result_data),
                            updated_at=datetime.utcnow())

    except Exception as e:
        job_repo.update_job(msg.job_id,
                            status=JobStatus.FAILED,
                            error_message=str(e),
                            updated_at=datetime.utcnow())
    finally:
        db.close()
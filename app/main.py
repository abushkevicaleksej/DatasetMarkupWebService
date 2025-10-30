from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.routers import create_api_router

BASE_DIR = Path(__file__).resolve().parent
app = FastAPI(title="Image Annotator", version="1.0.0")

api_router = create_api_router()

app.include_router(api_router)

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

@app.get("/")
async def root():
    index_path = BASE_DIR / "static" / "index.html"
    return FileResponse(index_path)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
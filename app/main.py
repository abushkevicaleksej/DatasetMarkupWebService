from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import create_api_router
from app.infrastructure.database import create_tables, engine

create_tables()

BASE_DIR = Path(__file__).resolve().parent

origins = [
    "http://localhost:5173",
    "localhost:5173"
]

app = FastAPI(title="Dataset Markup Web Service")

app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

api_router = create_api_router()

app.include_router(api_router)

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

@app.get("/")
async def root():
    index_path = BASE_DIR / "static" / "templates" / "index.html"
    return FileResponse(index_path)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
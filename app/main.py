from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.routes import router as api_router
import os


def create_app() -> FastAPI:
    app = FastAPI(title="Image Annotator", version="1.0.0")

    os.makedirs("uploads", exist_ok=True)
    os.makedirs("app/static", exist_ok=True)

    app.include_router(api_router, prefix="/api/v1")

    app.mount("/static", StaticFiles(directory="/app/static/"), name="static")

    @app.get("/")
    async def read_index():
        return FileResponse("app/static/index.html")

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
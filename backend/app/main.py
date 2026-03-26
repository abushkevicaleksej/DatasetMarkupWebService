from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import create_api_router
from app.infrastructure.database import create_tables


create_tables()


app = FastAPI(title="Dataset Markup Web Service")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


api_router = create_api_router()


app.include_router(api_router)


@app.get("/", tags=["root"])
async def root() -> dict:
    return {"message": "Welcome to Dataset Markup Web Service"}

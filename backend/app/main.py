from pathlib import Path

from faststream.rabbit import RabbitBroker
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routers import annotations
from app.api.routers import create_api_router
from app.infrastructure.database import create_tables
from app.infrastructure.utils.model_initializer import initialize_predefined_models

create_tables()
initialize_predefined_models()

app = FastAPI(title="Dataset Markup Web Service")
broker = RabbitBroker()
annotations.broker = broker

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

@app.on_event("startup")
async def startup():
    await broker.connect()

@app.on_event("shutdown")
async def shutdown():
    await broker.close()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqladmin import Admin

from app.api.routers import create_api_router
from app.infrastructure.database import create_tables, engine
from app.infrastructure.utils.model_initializer import initialize_predefined_models
from app.admin import setup_admin_panel

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

create_tables()
initialize_predefined_models()

admin = Admin(app, engine)
setup_admin_panel(admin)

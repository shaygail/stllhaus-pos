from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.session import engine, Base
from app.api.routes import menu, sales


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="STLL Haus POS", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (LAN + localhost)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(menu.router, tags=["Menu"])
app.include_router(sales.router, tags=["Sales"])


@app.get("/")
async def root():
    return {"message": "STLL Haus POS API is running"}

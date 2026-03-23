import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

raw_url = settings.DATABASE_URL
print(f"DEBUG DATABASE_URL = '{raw_url}'", flush=True)

db_url = (raw_url or "")
db_url = db_url.replace("postgres://", "postgresql+asyncpg://")
db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

print(f"DEBUG FINAL URL = '{db_url}'", flush=True)

engine = create_async_engine(db_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

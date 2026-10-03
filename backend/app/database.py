"""
database.py
------------------------------------------------------------------
SQLAlchemy engine/session setup. Uses SQLite by default (zero
config, one file) - point DATABASE_URL at Postgres in .env when
you're ready to move off SQLite; nothing else in the app needs to
change since we only use SQLAlchemy's ORM layer.
------------------------------------------------------------------
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency - yields a DB session per request, always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

"""
main.py
------------------------------------------------------------------
FastAPI app entrypoint. Run with:
    uvicorn app.main:app --reload --port 8000

Then open http://localhost:8000/docs for interactive API docs
(Swagger UI) - useful for testing /captures and /verify by hand
before the mobile app or web dashboard call them for real.
------------------------------------------------------------------
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import captures, verify

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Content Authenticity Network API",
    description=(
        "Backend for the AI + Blockchain Content Authenticity Network "
        "capstone project. Stores signed captures from the mobile app, "
        "anchors their hashes on-chain, and verifies uploaded photos "
        "against those records."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(captures.router)
app.include_router(verify.router)


@app.get("/health", tags=["health"])
def health_check():
    from app.blockchain import blockchain_client

    return {
        "status": "ok",
        "blockchain_enabled": blockchain_client.enabled,
    }

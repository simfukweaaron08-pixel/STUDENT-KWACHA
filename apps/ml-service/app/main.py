from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.categorization import router as categorization_router
from app.api.predictions import router as predictions_router
from app.api.training import router as training_router
from app.api.overspending import router as overspending_router

app = FastAPI(
    title="Student Kwacha - ML Service",
    description="Transaction categorization and savings prediction ML service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categorization_router, prefix="/ml/v1", tags=["categorization"])
app.include_router(predictions_router, prefix="/ml/v1", tags=["predictions"])
app.include_router(training_router, prefix="/ml/v1", tags=["training"])
app.include_router(overspending_router, prefix="/ml/v1", tags=["overspending"])


@app.get("/ml/v1/health", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "ml-service"}

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class RetrainResponse(BaseModel):
    status: str
    message: str


@router.post("/train/retrain", response_model=RetrainResponse)
async def retrain_models():
    """Trigger model retraining (admin only)."""
    # In production, this would retrain the categorization model
    # with new labeled data and update the savings prediction model
    return RetrainResponse(
        status="success",
        message="Model retraining triggered. This is a placeholder for the training pipeline.",
    )

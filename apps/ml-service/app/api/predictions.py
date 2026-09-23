from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

from app.services.predictor import SavingsPredictor

router = APIRouter()
predictor = SavingsPredictor()


class SavingsEntry(BaseModel):
    amount: float
    date: str


class SavingsPredictionRequest(BaseModel):
    goal_id: str
    target_amount: float
    current_amount: float
    target_date: str
    entries: List[SavingsEntry]


class SavingsPredictionResponse(BaseModel):
    prediction_available: bool
    predicted_monthly_savings: Optional[float] = None
    months_remaining: Optional[int] = None
    estimated_completion: Optional[str] = None
    confidence: Optional[str] = None
    message: str


@router.post("/predictions/savings/{user_id}", response_model=SavingsPredictionResponse)
async def predict_savings(user_id: str, request: SavingsPredictionRequest):
    """Predict savings trajectory based on historical data."""
    if len(request.entries) < 3:
        return SavingsPredictionResponse(
            prediction_available=False,
            message="Not enough data for prediction. Continue tracking to enable insights.",
        )

    result = predictor.predict(
        target_amount=request.target_amount,
        current_amount=request.current_amount,
        target_date=request.target_date,
        entries=[{"amount": e.amount, "date": e.date} for e in request.entries],
    )
    return SavingsPredictionResponse(**result)

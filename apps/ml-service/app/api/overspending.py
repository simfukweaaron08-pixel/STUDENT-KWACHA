from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional

from app.services.overspending import OverspendingPredictor

router = APIRouter()
predictor = OverspendingPredictor()


class DailyExpense(BaseModel):
    date: str
    amount: float


class OverspendingRequest(BaseModel):
    daily_expenses: List[DailyExpense]
    total_budget: float = Field(gt=0)
    days_elapsed: int = Field(gt=0)
    days_in_month: int = Field(gt=0, le=31)


class OverspendingResponse(BaseModel):
    prediction_available: bool
    predicted_month_end_spend: Optional[float] = None
    total_budget: Optional[float] = None
    total_spent: Optional[float] = None
    overspend_amount: Optional[float] = None
    will_overspend: Optional[bool] = None
    will_exhaust_before_month_end: Optional[bool] = None
    estimated_exhaustion_date: Optional[str] = None
    days_to_exhaustion: Optional[int] = None
    avg_daily_spend: Optional[float] = None
    recommended_daily_spend: Optional[float] = None
    budget_pace_ratio: Optional[float] = None
    risk_level: Optional[str] = None
    confidence: Optional[str] = None
    r_squared: Optional[float] = None
    model: Optional[str] = None
    message: str


@router.post("/predictions/overspending", response_model=OverspendingResponse)
async def predict_overspending(request: OverspendingRequest):
    """Predict whether the user will overspend or exhaust their budget before month end."""
    result = predictor.predict(
        daily_expenses=[{"date": e.date, "amount": e.amount} for e in request.daily_expenses],
        total_budget=request.total_budget,
        days_elapsed=request.days_elapsed,
        days_in_month=request.days_in_month,
    )
    return OverspendingResponse(**result)

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

from app.services.categorizer import TransactionCategorizer

router = APIRouter()
categorizer = TransactionCategorizer()


class CategorizeRequest(BaseModel):
    description: str
    amount: float
    source: Optional[str] = None


class CategorizeBatchRequest(BaseModel):
    transactions: List[CategorizeRequest]


class CategorizeResponse(BaseModel):
    category_id: str
    category_name: str
    confidence: float


@router.post("/categorize", response_model=CategorizeResponse)
async def categorize_transaction(request: CategorizeRequest):
    """Categorize a single transaction using rule-based + ML approach."""
    result = categorizer.categorize(
        description=request.description,
        amount=request.amount,
        source=request.source,
    )
    return CategorizeResponse(**result)


@router.post("/categorize-batch")
async def categorize_batch(request: CategorizeBatchRequest):
    """Categorize multiple transactions at once."""
    results = []
    for tx in request.transactions:
        result = categorizer.categorize(
            description=tx.description,
            amount=tx.amount,
            source=tx.source,
        )
        results.append(result)
    return {"results": results}

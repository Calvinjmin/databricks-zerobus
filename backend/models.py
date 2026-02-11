from pydantic import BaseModel
from datetime import datetime
from enum import Enum


class TransactionType(str, Enum):
    PAYMENT = "payment"
    TRANSFER = "transfer"
    REFUND = "refund"
    WITHDRAWAL = "withdrawal"


class TransactionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    FLAGGED = "flagged"


class Transaction(BaseModel):
    id: str
    timestamp: str
    sender: str
    receiver: str
    amount: float
    currency: str
    type: TransactionType
    status: TransactionStatus
    category: str
    risk_score: float

import random
import uuid
from datetime import datetime, timezone

from models import Transaction, TransactionType, TransactionStatus

FIRST_NAMES = [
    "Alice", "Bob", "Carlos", "Diana", "Eve", "Frank", "Grace", "Hank",
    "Iris", "Jack", "Karen", "Leo", "Mona", "Nate", "Olivia", "Paul",
    "Quinn", "Rosa", "Sam", "Tina", "Uma", "Victor", "Wendy", "Xander",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Rodriguez", "Martinez", "Chen", "Kim", "Patel", "Singh",
    "Lopez", "Lee", "Walker", "Hall", "Allen", "Young",
]

CATEGORIES = [
    "groceries", "electronics", "dining", "travel", "healthcare",
    "entertainment", "utilities", "rent", "salary", "investment",
    "insurance", "subscription", "charity", "education", "retail",
]

CURRENCIES = ["USD", "EUR", "GBP"]
CURRENCY_WEIGHTS = [0.6, 0.25, 0.15]

TYPES = list(TransactionType)
TYPE_WEIGHTS = [0.45, 0.30, 0.15, 0.10]


def _random_name() -> str:
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def _random_amount() -> float:
    r = random.random()
    if r < 0.6:
        amount = random.uniform(1, 500)
    elif r < 0.9:
        amount = random.uniform(500, 5000)
    else:
        amount = random.uniform(5000, 50000)
    return round(amount, 2)


def generate_transaction() -> Transaction:
    tx_type = random.choices(TYPES, weights=TYPE_WEIGHTS, k=1)[0]
    currency = random.choices(CURRENCIES, weights=CURRENCY_WEIGHTS, k=1)[0]
    amount = _random_amount()

    is_anomalous = random.random() < 0.05
    if is_anomalous:
        risk_score = round(random.uniform(0.8, 1.0), 3)
        status = random.choices(
            [TransactionStatus.FLAGGED, TransactionStatus.FAILED],
            weights=[0.7, 0.3],
            k=1,
        )[0]
        if random.random() < 0.5:
            amount = round(random.uniform(20000, 50000), 2)
    else:
        risk_score = round(random.uniform(0.0, 0.3), 3)
        status = random.choices(
            [TransactionStatus.COMPLETED, TransactionStatus.PENDING, TransactionStatus.FAILED],
            weights=[0.75, 0.20, 0.05],
            k=1,
        )[0]

    sender = _random_name()
    receiver = _random_name()
    while receiver == sender:
        receiver = _random_name()

    return Transaction(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(timezone.utc).isoformat(),
        sender=sender,
        receiver=receiver,
        amount=amount,
        currency=currency,
        type=tx_type,
        status=status,
        category=random.choice(CATEGORIES),
        risk_score=risk_score,
    )

"""
Transaction Categorizer

Uses a rule-based keyword matching approach, with an optional ML classifier
that can be trained once sufficient labeled data is accumulated.

Default categories and their keyword mappings for the Zambian market.
"""

from typing import Optional

# Category mapping: category_name -> (category_id_placeholder, keywords, icon)
CATEGORY_KEYWORDS = {
    "Food": [
        "shoprite", "market", "grocery", "supermarket", "food", "lunch", "dinner",
        "breakfast", "restaurant", "kfc", "chicken", "meal", "cooking", "rice",
        "mealie", "nsima", "vegetables", "fruit", "bread", "milk", "meat",
        "fish", "takeaway", "bakery", "butchery", "spice",
    ],
    "Transport": [
        "minibus", "taxi", "uber", "fuel", "petrol", "diesel", "transport",
        "bus", "route", "fare", "car", "maintenance", "tyre", "tire", "oil change",
        "parking", "toll", "bp", "total", "puma",
    ],
    "Utilities": [
        "zesco", "electricity", "water", "bill", "utility", "dstv", "gotv",
        "internet", "wifi", "electric", "power", "sewerage", "waste",
    ],
    "Entertainment": [
        "movie", "cinema", "netflix", "showmax", "game", "bar", "club",
        "entertainment", "concert", "event", "music", "sports", "gym",
        "eastpark", "arcades", "leisure",
    ],
    "Shopping": [
        "clothing", "shoes", "shop", "mall", "purchase", "accessories",
        "manda hill", "arcades", "chainda", "lilayi", "fashion", "tech",
        "gadget", "electronics", "phone",
    ],
    "Education": [
        "school", "fees", "university", "college", "tuition", "course",
        "book", "stationery", "training", "certificate", "examination",
        "learners", "student",
    ],
    "Healthcare": [
        "clinic", "hospital", "pharmacy", "medicine", "doctor", "health",
        "medical", "dental", "optical", "healthcare", "lab", "test",
        "vaccine", "insurance",
    ],
    "Housing": [
        "rent", "house", "apartment", "maintenance", "repair", "furniture",
        "decor", "cleaning", "security", "gate", "compound", "mortgage",
    ],
    "Communication": [
        "airtime", "airtel", "mtn", "tigo", "data", "bundle", "sms",
        "call", "phone", "sim", "recharge", "vodafone", "communication",
    ],
    "Savings": [
        "savings", "save", "deposit", "investment", "fixed deposit",
        "mutual fund", "bond", "treasury",
    ],
    "Income": [
        "salary", "payment", "received", "transfer", "income", "freelance",
        "commission", "bonus", "refund", "dividend",
    ],
}

# Known category IDs (these would come from the database in production)
# For now, we use name-based matching
DEFAULT_CATEGORY_MAP = {
    "Food": "cat-food",
    "Transport": "cat-transport",
    "Utilities": "cat-utilities",
    "Entertainment": "cat-entertainment",
    "Shopping": "cat-shopping",
    "Education": "cat-education",
    "Healthcare": "cat-healthcare",
    "Housing": "cat-housing",
    "Communication": "cat-communication",
    "Savings": "cat-savings",
    "Income": "cat-income",
    "Other": "cat-other",
}


class TransactionCategorizer:
    """Rule-based transaction categorizer with keyword matching."""

    def __init__(self):
        self.category_keywords = CATEGORY_KEYWORDS
        self.category_map = DEFAULT_CATEGORY_MAP

    def categorize(
        self,
        description: str,
        amount: float,
        source: Optional[str] = None,
    ) -> dict:
        """
        Categorize a transaction based on its description, amount, and source.

        Returns:
            dict with category_id, category_name, and confidence score.
        """
        description_lower = description.lower().strip()
        scores = {}

        # Keyword matching
        for category, keywords in self.category_keywords.items():
            score = 0
            matched_keywords = []
            for keyword in keywords:
                if keyword in description_lower:
                    score += 1
                    matched_keywords.append(keyword)
            if score > 0:
                scores[category] = (score, matched_keywords)

        # Amount-based heuristics (boost confidence)
        if scores:
            top_category = max(scores, key=lambda k: scores[k][0])
            score, matched = scores[top_category]

            # Boost confidence if multiple keywords match
            confidence = min(0.5 + (score * 0.15), 0.95)

            # Amount heuristics for Zambian context
            if top_category == "Transport" and amount < 50:
                confidence = min(confidence + 0.1, 0.95)  # Small amounts likely transport
            elif top_category == "Communication" and amount < 100:
                confidence = min(confidence + 0.1, 0.95)  # Airtime is usually small
            elif top_category == "Housing" and amount > 1000:
                confidence = min(confidence + 0.1, 0.95)  # Rent is usually large

            return {
                "category_id": self.category_map.get(top_category, "cat-other"),
                "category_name": top_category,
                "confidence": round(confidence, 2),
            }

        # No keywords matched — default to Other
        return {
            "category_id": "cat-other",
            "category_name": "Other",
            "confidence": 0.1,
        }

    def batch_categorize(self, transactions: list) -> list:
        """Categorize a batch of transactions."""
        return [
            self.categorize(tx["description"], tx["amount"], tx.get("source"))
            for tx in transactions
        ]

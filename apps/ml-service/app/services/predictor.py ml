"""
Savings Predictor

Uses linear regression on historical savings entries to predict
future savings trajectory and estimated goal completion date.
"""

import numpy as np
from datetime import datetime, timedelta
from typing import List, Optional


class SavingsPredictor:
    """Predict savings trajectory using linear regression."""

    def predict(
        self,
        target_amount: float,
        current_amount: float,
        target_date: str,
        entries: List[dict],
    ) -> dict:
        """
        Predict savings trajectory based on historical entries.

        Args:
            target_amount: Savings goal target
            current_amount: Current amount saved
            target_date: Target completion date
            entries: List of {amount, date} dicts

        Returns:
            dict with prediction results
        """
        if len(entries) < 3:
            return {
                "prediction_available": False,
                "message": "Not enough data for prediction. Continue tracking to enable insights.",
            }

        # Sort entries by date
        sorted_entries = sorted(entries, key=lambda e: e["date"])

        # Calculate monthly savings rate
        amounts = [e["amount"] for e in sorted_entries]
        dates = [datetime.fromisoformat(e["date"].replace("Z", "+00:00")) for e in sorted_entries]

        # Group by month
        monthly_totals = {}
        for date, amount in zip(dates, amounts):
            month_key = date.strftime("%Y-%m")
            monthly_totals[month_key] = monthly_totals.get(month_key, 0) + amount

        monthly_values = list(monthly_totals.values())

        if len(monthly_values) < 2:
            # Not enough monthly data points
            avg_monthly = np.mean(amounts)
            remaining = target_amount - current_amount
            months_needed = int(np.ceil(remaining / avg_monthly)) if avg_monthly > 0 else 999

            target_dt = datetime.fromisoformat(target_date.replace("Z", "+00:00"))
            estimated_completion = datetime.now() + timedelta(days=months_needed * 30)

            return {
                "prediction_available": True,
                "predicted_monthly_savings": round(float(avg_monthly), 2),
                "months_remaining": months_needed,
                "estimated_completion": estimated_completion.strftime("%Y-%m-%d"),
                "confidence": "low",
                "message": f"Based on your average monthly savings of K{avg_monthly:.2f}, you'll reach your goal in approximately {months_needed} months.",
            }

        # Linear regression on monthly savings
        X = np.arange(len(monthly_values)).reshape(-1, 1)
        y = np.array(monthly_values)

        # Simple linear regression: y = mx + c
        X_mean = np.mean(X)
        y_mean = np.mean(y)
        slope = np.sum((X.flatten() - X_mean) * (y - y_mean)) / np.sum((X.flatten() - X_mean) ** 2)
        intercept = y_mean - slope * X_mean

        # Predicted monthly savings (use the most recent trend)
        predicted_monthly = slope * len(monthly_values) + intercept
        predicted_monthly = max(predicted_monthly, 0)  # Can't be negative

        # Calculate R-squared for confidence
        y_pred = slope * X.flatten() + intercept
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - y_mean) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

        # Confidence level
        if r_squared > 0.7:
            confidence = "high"
        elif r_squared > 0.4:
            confidence = "medium"
        else:
            confidence = "low"

        # Estimate months to completion
        remaining = target_amount - current_amount
        if predicted_monthly > 0:
            months_needed = int(np.ceil(remaining / predicted_monthly))
        else:
            months_needed = 999

        estimated_completion = datetime.now() + timedelta(days=months_needed * 30)

        # Check if user is on track
        target_dt = datetime.fromisoformat(target_date.replace("Z", "+00:00"))
        months_until_target = (target_dt - datetime.now()).days / 30
        on_track = months_needed <= months_until_target

        message = (
            f"Based on your savings trend, you're predicted to save K{predicted_monthly:.2f}/month. "
            f"You'll reach your goal in approximately {months_needed} months."
        )
        if on_track:
            message += " You're on track to meet your target! 🎯"
        else:
            message += f" You may need to increase your savings rate to meet your {target_date} target."

        return {
            "prediction_available": True,
            "predicted_monthly_savings": round(float(predicted_monthly), 2),
            "months_remaining": months_needed,
            "estimated_completion": estimated_completion.strftime("%Y-%m-%d"),
            "confidence": confidence,
            "r_squared": round(float(r_squared), 3),
            "on_track": on_track,
            "message": message,
        }

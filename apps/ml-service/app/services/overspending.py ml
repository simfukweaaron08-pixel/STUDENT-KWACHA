"""
Overspending / Budget Exhaustion Predictor

Predicts whether a user will overspend or exhaust their budget before the
end of the current period, using a linear-regression trend on daily spending
combined with pace analysis (least-squares regression with a numpy fallback).
"""

from datetime import datetime, timedelta
from typing import List, Optional

import numpy as np


class OverspendingPredictor:
    """Predicts month-end spend, overspend risk, and budget exhaustion date."""

    def predict(
        self,
        daily_expenses: List[dict],
        total_budget: float,
        days_elapsed: int,
        days_in_month: int,
    ) -> dict:
        """
        Args:
            daily_expenses: list of {"date": "YYYY-MM-DD", "amount": float}
            total_budget: total active budget for the period
            days_elapsed: days elapsed in the period
            days_in_month: total days in the period

        Returns:
            dict with prediction results
        """
        if not daily_expenses or total_budget <= 0:
            return {
                "prediction_available": False,
                "message": "Add expenses and a budget to enable overspending prediction.",
            }

        # ── Aggregate spend per calendar day (fills zero-spend days) ──
        spend_by_day = {}
        for e in daily_expenses:
            day = str(e["date"])[:10]
            spend_by_day[day] = spend_by_day.get(day, 0.0) + float(e["amount"])

        today = datetime.now().date()
        # Build a continuous series for the days elapsed in this month
        month_start = today.replace(day=1)
        series = []
        for i in range(days_elapsed):
            day = month_start + timedelta(days=i)
            series.append(spend_by_day.get(day.strftime("%Y-%m-%d"), 0.0))

        total_spent = float(sum(series))
        avg_daily_spend = total_spent / max(days_elapsed, 1)

        # ── Trend via least-squares linear regression on daily spend ──
        slope = 0.0
        r_squared = 0.0
        if len(series) >= 3:
            X = np.arange(len(series), dtype=float)
            y = np.array(series, dtype=float)
            x_mean, y_mean = X.mean(), y.mean()
            denom = np.sum((X - x_mean) ** 2)
            if denom > 0:
                slope = float(np.sum((X - x_mean) * (y - y_mean)) / denom)
            y_pred = slope * X + (y_mean - slope * x_mean)
            ss_res = float(np.sum((y - y_pred) ** 2))
            ss_tot = float(np.sum((y - y_mean) ** 2))
            r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

        # Trend-adjusted daily rate: recent spending weighted by trend,
        # clamped to avoid wild extrapolation from short histories.
        trend_daily = max(avg_daily_spend + slope * 0.5, 0.0)
        alpha = min(0.5, max(0.0, r_squared))  # trust the trend only as far as it fits
        adjusted_daily = (1 - alpha) * avg_daily_spend + alpha * trend_daily

        projected_total = adjusted_daily * days_in_month

        # ── Exhaustion estimate ──
        remaining_budget = total_budget - total_spent
        if adjusted_daily > 0:
            days_to_exhaustion = int(max(remaining_budget, 0) // adjusted_daily)
        else:
            days_to_exhaustion = None

        will_overspend = projected_total >= total_budget
        exhaustion_date = None
        if will_overspend and adjusted_daily > 0:
            exhaustion_date = (today + timedelta(days=days_to_exhaustion)).strftime("%Y-%m-%d")

        # ── Risk level combines pace ratio and trend ──
        days_left = max(days_in_month - days_elapsed, 0)
        ideal_daily = remaining_budget / days_left if days_left > 0 else remaining_budget
        pace_ratio = (adjusted_daily / ideal_daily) if ideal_daily > 0 else (2.0 if remaining_budget < 0 else 0.0)

        if pace_ratio >= 1.25 or (will_overspend and r_squared >= 0.5):
            risk_level = "high"
        elif pace_ratio >= 1.0 or will_overspend:
            risk_level = "medium"
        else:
            risk_level = "low"

        # ── Confidence from data volume + model fit ──
        if days_elapsed >= 15 and r_squared >= 0.4:
            confidence = "high"
        elif days_elapsed >= 7:
            confidence = "medium"
        else:
            confidence = "low"

        overspend_amount = max(projected_total - total_budget, 0.0)
        if will_overspend:
            message = (
                f"At your current pace (K{adjusted_daily:.2f}/day), you're projected to spend "
                f"K{projected_total:.2f} by month end — K{overspend_amount:.2f} over your "
                f"K{total_budget:.2f} budget"
                + (f", with funds running out around {exhaustion_date}." if exhaustion_date else ".")
            )
        else:
            message = (
                f"At your current pace (K{adjusted_daily:.2f}/day), you're projected to spend "
                f"K{projected_total:.2f} of your K{total_budget:.2f} budget — you're on track. "
                f"You can spend about K{ideal_daily:.2f}/day for the rest of the month."
            )

        return {
            "prediction_available": True,
            "predicted_month_end_spend": round(projected_total, 2),
            "total_budget": round(float(total_budget), 2),
            "total_spent": round(total_spent, 2),
            "overspend_amount": round(overspend_amount, 2),
            "will_overspend": bool(will_overspend),
            "will_exhaust_before_month_end": bool(will_overspend),
            "estimated_exhaustion_date": exhaustion_date,
            "days_to_exhaustion": days_to_exhaustion,
            "avg_daily_spend": round(avg_daily_spend, 2),
            "recommended_daily_spend": round(max(ideal_daily, 0.0), 2),
            "budget_pace_ratio": round(pace_ratio, 2),
            "risk_level": risk_level,
            "confidence": confidence,
            "r_squared": round(r_squared, 3),
            "model": "linear_trend_v1",
            "message": message,
        }

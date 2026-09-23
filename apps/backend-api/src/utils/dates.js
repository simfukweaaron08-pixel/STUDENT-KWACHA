const getDateRange = (period, startDate) => {
  const start = new Date(startDate || Date.now());
  const end = new Date(start);

  switch (period) {
    case 'weekly':
      end.setDate(start.getDate() + 7);
      break;
    case 'monthly':
      end.setMonth(start.getMonth() + 1);
      break;
    case 'quarterly':
      end.setMonth(start.getMonth() + 3);
      break;
    case 'yearly':
      end.setFullYear(start.getFullYear() + 1);
      break;
    default:
      end.setMonth(start.getMonth() + 1);
  }

  return { start, end };
};

const getCurrentPeriodRange = (period) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  switch (period) {
    case 'weekly': {
      const dayOfWeek = now.getDay();
      start.setDate(now.getDate() - dayOfWeek);
      break;
    }
    case 'monthly':
      start.setDate(1);
      break;
    case 'quarterly':
      start.setMonth(Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case 'yearly':
      start.setMonth(0, 1);
      break;
  }

  const { end } = getDateRange(period, start);
  return { start, end };
};

/**
 * Compute the next funding date for a budget, from a given date.
 *
 * - one_time: null (no recurrence)
 * - weekly:   same weekday next week
 * - monthly:  same day next month (clamped to 28, which funding_day already is)
 * - quarterly: same day 3 months ahead
 * - yearly:   same day next year
 *
 * @param {object} budget - budget with frequency + funding_day
 * @param {Date} fromDate - the date to advance from (usually the last funding date)
 * @returns {string|null} YYYY-MM-DD or null for one_time budgets
 */
const computeNextFundingDate = (budget, fromDate) => {
  const from = new Date(fromDate);
  const day = Math.min(Math.max(parseInt(budget.funding_day, 10) || from.getDate(), 1), 28);

  // Format a Date in LOCAL time as YYYY-MM-DD (toISOString would shift the
  // date in UTC+X timezones like Zambia's CAT).
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  switch (budget.frequency) {
    case 'one_time':
      return null;
    case 'weekly': {
      const next = new Date(from);
      next.setDate(next.getDate() + 7);
      return fmt(next);
    }
    case 'monthly': {
      return fmt(new Date(from.getFullYear(), from.getMonth() + 1, day));
    }
    case 'quarterly': {
      return fmt(new Date(from.getFullYear(), from.getMonth() + 3, day));
    }
    case 'yearly': {
      return fmt(new Date(from.getFullYear() + 1, from.getMonth(), day));
    }
    default:
      return null;
  }
};

module.exports = { getDateRange, getCurrentPeriodRange, computeNextFundingDate };

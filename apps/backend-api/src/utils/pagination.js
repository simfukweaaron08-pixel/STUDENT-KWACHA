const { Op } = require('sequelize');

const paginate = (query, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  return {
    ...query,
    limit: Math.min(limit, 100),
    offset,
  };
};

const buildPaginationResponse = (data, total, page, limit) => ({
  data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  },
});

module.exports = { paginate, buildPaginationResponse, Op };

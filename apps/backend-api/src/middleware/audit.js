const { AuditLog } = require('../models');

const auditLog = (action, resourceType) => async (req, res, next) => {
  try {
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      // Log after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await AuditLog.create({
          actor_id: req.userId || null,
          actor_type: req.adminRole ? 'admin' : (req.userId ? 'user' : 'system'),
          action,
          resource_type: resourceType,
          resource_id: req.params.id || (body?.data?.id) || null,
          details: {
            method: req.method,
            path: req.originalUrl,
            params: req.params,
          },
          ip_address: req.ip,
        });
      }
      return originalJson(body);
    };
    next();
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('Audit log error:', error);
    next();
  }
};

module.exports = auditLog;

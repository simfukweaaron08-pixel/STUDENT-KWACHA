const jwt = require('jsonwebtoken');
const { User, AdminUser } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Authenticate JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Access token required' },
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password_hash'] },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found' },
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Account is not active' },
      });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Access token expired' },
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid access token' },
      });
    }
    next(error);
  }
};

// Require admin role
const requireAdmin = async (req, res, next) => {
  try {
    const adminUser = await AdminUser.findOne({ where: { user_id: req.userId } });
    if (!adminUser) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      });
    }
    req.adminRole = adminUser.role;
    next();
  } catch (error) {
    next(error);
  }
};

// Require super admin role
const requireSuperAdmin = async (req, res, next) => {
  try {
    const adminUser = await AdminUser.findOne({ where: { user_id: req.userId } });
    if (!adminUser || adminUser.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Super admin access required' },
      });
    }
    req.adminRole = adminUser.role;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticate, requireAdmin, requireSuperAdmin };

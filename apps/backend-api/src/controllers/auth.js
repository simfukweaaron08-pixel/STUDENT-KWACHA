const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User, RefreshToken, AuditLog } = require('../models');
const { Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

const parseExpiry = (expiry) => {
  const match = expiry.match(/^(\d+)([mhd])$/);
  if (!match) return 15 * 60 * 1000;
  const [, val, unit] = match;
  const num = parseInt(val, 10);
  switch (unit) {
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
};

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  const refreshToken = jwt.sign({ userId, jti: uuidv4() }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });
  return { accessToken, refreshToken };
};

// POST /api/v1/auth/register
const register = async (req, res, next) => {
  try {
    const { email, full_name, phone_number, password, institution, student_id } = req.validated.body;

    // Check existing user
    const existing = await User.findOne({ where: { [Op.or]: [{ email }, ...(phone_number ? [{ phone_number }] : [])] } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'User with this email or phone already exists' },
      });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      full_name,
      phone_number: phone_number || null,
      password_hash,
      is_student: true,
      institution: institution || null,
      student_id: student_id || null,
    });

    const tokens = generateTokens(user.id);

    // Store refresh token
    const decoded = jwt.decode(tokens.refreshToken);
    await RefreshToken.create({
      user_id: user.id,
      token: await bcrypt.hash(tokens.refreshToken, 10),
      expires_at: new Date(decoded.exp * 1000),
    });

    // Audit log
    await AuditLog.create({
      actor_id: user.id,
      actor_type: 'user',
      action: 'user.register',
      resource_type: 'user',
      resource_id: user.id,
      ip_address: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone_number: user.phone_number,
          currency: user.currency,
          status: user.status,
          is_student: user.is_student,
          institution: user.institution,
          student_id: user.student_id,
        },
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.validated.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' },
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const tokens = generateTokens(user.id);

    // Store refresh token
    const decoded = jwt.decode(tokens.refreshToken);
    await RefreshToken.create({
      user_id: user.id,
      token: await bcrypt.hash(tokens.refreshToken, 10),
      expires_at: new Date(decoded.exp * 1000),
    });

    await AuditLog.create({
      actor_id: user.id,
      actor_type: 'user',
      action: 'user.login',
      resource_type: 'user',
      resource_id: user.id,
      ip_address: req.ip,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone_number: user.phone_number,
          currency: user.currency,
          status: user.status,
          is_student: user.is_student,
          institution: user.institution,
          student_id: user.student_id,
        },
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/refresh
const refresh = async (req, res, next) => {
  try {
    const { refresh_token } = req.validated.body;

    const decoded = jwt.verify(refresh_token, JWT_REFRESH_SECRET);

    // Find and validate refresh token
    const storedTokens = await RefreshToken.findAll({
      where: { user_id: decoded.userId, revoked_at: null },
    });

    let validToken = null;
    for (const st of storedTokens) {
      if (await bcrypt.compare(refresh_token, st.token)) {
        validToken = st;
        break;
      }
    }

    if (!validToken) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' },
      });
    }

    // Revoke old token
    await validToken.update({ revoked_at: new Date() });

    // Generate new tokens
    const tokens = generateTokens(decoded.userId);
    const newDecoded = jwt.decode(tokens.refreshToken);
    await RefreshToken.create({
      user_id: decoded.userId,
      token: await bcrypt.hash(tokens.refreshToken, 10),
      expires_at: new Date(newDecoded.exp * 1000),
    });

    res.json({ success: true, data: tokens });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' },
      });
    }
    next(error);
  }
};

// POST /api/v1/auth/logout
const logout = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) {
      const decoded = jwt.decode(refresh_token);
      if (decoded) {
        await RefreshToken.update(
          { revoked_at: new Date() },
          { where: { user_id: decoded.userId, revoked_at: null } }
        );
      }
    }

    await AuditLog.create({
      actor_id: req.userId,
      actor_type: 'user',
      action: 'user.logout',
      resource_type: 'user',
      resource_id: req.userId,
      ip_address: req.ip,
    });

    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.validated.body;
    const user = await User.findByPk(req.userId);

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' },
      });
    }

    user.password_hash = await bcrypt.hash(new_password, 12);
    await user.save();

    // Revoke all refresh tokens
    await RefreshToken.update({ revoked_at: new Date() }, { where: { user_id: req.userId } });

    await AuditLog.create({
      actor_id: req.userId,
      actor_type: 'user',
      action: 'user.change_password',
      resource_type: 'user',
      resource_id: req.userId,
      ip_address: req.ip,
    });

    res.json({ success: true, data: { message: 'Password changed successfully' } });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.validated.body;
    // In production, send email with reset link
    // For now, just acknowledge the request
    res.json({
      success: true,
      data: { message: 'If an account exists with this email, a reset link has been sent.' },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    // In production, validate the reset token and update password
    res.json({ success: true, data: { message: 'Password reset successfully' } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
};

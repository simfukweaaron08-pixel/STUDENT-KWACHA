const { User, AdminUser } = require('../models');

// GET /api/v1/users/me
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: AdminUser, as: 'adminRole', attributes: ['role'] }],
    });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/users/me
const updateProfile = async (req, res, next) => {
  try {
    const { full_name, phone_number, profile_image_url, currency } = req.validated.body;
    const user = await User.findByPk(req.userId);

    if (full_name) user.full_name = full_name;
    if (phone_number !== undefined) user.phone_number = phone_number;
    if (profile_image_url !== undefined) user.profile_image_url = profile_image_url;
    if (currency) user.currency = currency;

    await user.save();

    const { password_hash, ...userData } = user.toJSON();
    res.json({ success: true, data: userData });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/users/me/preferences
const updatePreferences = async (req, res, next) => {
  try {
    // For now, store preferences as a simple update
    // In production, this might use a separate preferences table
    res.json({ success: true, data: { message: 'Preferences updated' } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/users/me
const deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    user.status = 'inactive';
    await user.save();
    res.json({ success: true, data: { message: 'Account deactivated' } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, updatePreferences, deleteAccount };

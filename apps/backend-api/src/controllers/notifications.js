const { Notification } = require('../models');

// GET /api/v1/notifications
const listNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
      where: { user_id: req.userId },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    const unreadCount = await Notification.count({
      where: { user_id: req.userId, is_read: false },
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
        unread_count: unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found' },
      });
    }

    notification.is_read = true;
    await notification.save();
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/notifications/read-all
const markAllRead = async (req, res, next) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.userId, is_read: false } }
    );
    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/notifications/preferences
const updatePreferences = async (req, res, next) => {
  try {
    // In production, store notification preferences
    res.json({ success: true, data: { message: 'Notification preferences updated' } });
  } catch (error) {
    next(error);
  }
};

module.exports = { listNotifications, markRead, markAllRead, updatePreferences };

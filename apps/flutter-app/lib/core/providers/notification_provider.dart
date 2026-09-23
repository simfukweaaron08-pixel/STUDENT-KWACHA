import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class NotificationProvider extends ChangeNotifier {
  List<Map<String, dynamic>> _notifications = [];
  int _unreadCount = 0;
  bool _isLoading = false;
  AuthService? _auth;

  List<Map<String, dynamic>> get notifications => _notifications;
  int get unreadCount => _unreadCount;
  bool get isLoading => _isLoading;

  void update(AuthService auth) {
    _auth = auth;
    if (auth.isAuthenticated) fetchNotifications();
  }

  ApiService get _api => _auth!.api;

  Future<void> fetchNotifications() async {
    if (_auth == null || !_auth!.isAuthenticated) return;
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.getNotifications();
      _notifications = List<Map<String, dynamic>>.from(response['data'] ?? []);
      _unreadCount = response['pagination']?['unread_count'] ?? 0;
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  Future<void> markRead(String id) async {
    try {
      await _api.markNotificationRead(id);
      final idx = _notifications.indexWhere((n) => n['id'] == id);
      if (idx != -1 && _notifications[idx]['is_read'] != true) {
        _notifications[idx]['is_read'] = true;
        _unreadCount = (_unreadCount - 1).clamp(0, _unreadCount);
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> markAllRead() async {
    try {
      await _api.markAllNotificationsRead();
      _notifications = _notifications
          .map((n) => {...n, 'is_read': true})
          .toList();
      _unreadCount = 0;
      notifyListeners();
    } catch (_) {}
  }
}

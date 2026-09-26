import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/providers/notification_provider.dart';
import '../common/app_colors.dart';
import '../common/app_widgets.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationProvider>().fetchNotifications();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            decoration: const BoxDecoration(
              color: AppColors.heroSolid,
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(32),
                bottomRight: Radius.circular(32),
              ),
            ),
            child: SafeArea(
              bottom: false,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Notifications',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        provider.unreadCount > 0
                            ? '${provider.unreadCount} unread'
                            : 'All caught up',
                        style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13),
                      ),
                    ],
                  ),
                  if (provider.notifications.isNotEmpty)
                    TextButton(
                      onPressed: provider.unreadCount > 0
                          ? () => provider.markAllRead()
                          : null,
                      child: const Text(
                        'Mark all read',
                        style: TextStyle(color: Colors.white, fontSize: 13),
                      ),
                    ),
                ],
              ),
            ),
          ),
          Expanded(
            child: provider.isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : provider.notifications.isEmpty
                    ? const EmptyState(
                        icon: Icons.notifications_off_outlined,
                        title: 'No Notifications',
                        subtitle: 'Budget alerts and financial insights will appear here',
                      )
                    : RefreshIndicator(
                        onRefresh: () => provider.fetchNotifications(),
                        color: AppColors.primary,
                        child: ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                          itemCount: provider.notifications.length,
                          itemBuilder: (context, index) =>
                              _buildNotificationTile(provider.notifications[index]),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationTile(Map<String, dynamic> n) {
    final isUnread = n['is_read'] != true;
    final type = n['type'] ?? 'general';

    final (IconData icon, Color color, Color bg) = switch (type) {
      'budget_alert' => (
          Icons.warning_amber_rounded,
          AppColors.warning,
          const Color(0xFFFFF3E0),
        ),
      'savings_reminder' => (
          Icons.savings_rounded,
          AppColors.savings,
          const Color(0xFFE3F2FD),
        ),
      'insight' => (
          Icons.lightbulb_outline,
          AppColors.primary,
          AppColors.primarySurface,
        ),
      _ => (
          Icons.notifications_rounded,
          AppColors.blueSolid,
          const Color(0xFFE3F2FD),
        ),
    };

    return AppCard(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.all(14),
      onTap: isUnread ? () => context.read<NotificationProvider>().markRead(n['id']) : null,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        n['title'] ?? '',
                        style: TextStyle(
                          fontWeight: isUnread ? FontWeight.w700 : FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    if (isUnread)
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  n['body'] ?? '',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import '../../core/services/auth_service.dart';
import '../common/app_colors.dart';
import '../common/app_widgets.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final user = auth.user;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: ListView(
        children: [
          // Solid profile header
          _buildProfileHeader(context, user),
          const SizedBox(height: 20),

          // Account section
          _buildSectionHeader('Account'),
          _buildCardGroup([
            _buildSettingsTile(
              icon: Icons.person_outline_rounded,
              title: 'Edit Profile',
              color: AppColors.blueSolid,
              onTap: () {},
            ),
            _buildDivider(),
            _buildSettingsTile(
              icon: Icons.lock_outline_rounded,
              title: 'Change Password',
              color: AppColors.purpleSolid,
              onTap: () {},
            ),
            _buildDivider(),
            _buildSettingsTile(
              icon: Icons.notifications_outlined,
              title: 'Notification Settings',
              color: AppColors.orangeSolid,
              onTap: () {},
            ),
          ]),

          const SizedBox(height: 16),

          // Mobile Money section
          _buildSectionHeader('Mobile Money'),
          _buildCardGroup([
            _buildSettingsTile(
              icon: Icons.phone_android_rounded,
              title: 'Connected Accounts',
              subtitle: 'Manage Airtel Money & MTN MoMo',
              color: AppColors.incomeSolid,
              onTap: () {},
            ),
          ]),

          const SizedBox(height: 16),

          // App section
          _buildSectionHeader('App'),
          _buildCardGroup([
            _buildSettingsTile(
              icon: Icons.info_outline_rounded,
              title: 'About Student Kwacha',
              subtitle: 'Version 1.0.0',
              color: AppColors.blueSolid,
              onTap: () {},
            ),
            _buildDivider(),
            _buildSettingsTile(
              icon: Icons.description_outlined,
              title: 'Financial Disclaimer',
              color: AppColors.orangeSolid,
              onTap: () => _showDisclaimer(context),
            ),
          ]),

          const SizedBox(height: 24),

          // Logout
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Material(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFFFCDD2)),
                ),
                child: ListTile(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFEBEE),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.logout_rounded, color: AppColors.expense, size: 20),
                  ),
                  title: const Text(
                    'Logout',
                    style: TextStyle(
                      color: AppColors.expense,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  onTap: () async {
                    await auth.logout();
                    if (context.mounted) context.go('/login');
                  },
                ),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildProfileHeader(BuildContext context, Map<String, dynamic>? user) {
    if (user == null) return const SizedBox.shrink();

    final name = user['full_name'] ?? 'User';
    final email = user['email'] ?? '';
    final phone = user['phone_number'];

    return Container(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 28),
      decoration: const BoxDecoration(
        color: AppColors.heroSolid,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Column(
          children: [
            const SizedBox(height: 16),
            // Avatar
            SolidAvatar(
              text: name,
              radius: 40,
              color: Colors.white.withOpacity(0.3),
            ),
            const SizedBox(height: 16),
            Text(
              name,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 22,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              email,
              style: TextStyle(
                color: Colors.white.withOpacity(0.7),
                fontSize: 14,
              ),
            ),
            if (phone != null) ...[
              const SizedBox(height: 4),
              Text(
                phone,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.6),
                  fontSize: 13,
                ),
              ),
            ],
            const SizedBox(height: 16),
            // Quick stats
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.15),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildProfileStat('Status', 'Active'),
                  Container(width: 1, height: 24, color: Colors.white.withOpacity(0.2)),
                  _buildProfileStat('Since', '2024'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileStat(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withOpacity(0.6),
            fontSize: 11,
          ),
        ),
      ],
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: 12,
          color: Colors.grey[500],
          letterSpacing: 1,
        ),
      ),
    );
  }

  Widget _buildCardGroup(List<Widget> children) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        child: Column(children: children),
      ),
    );
  }

  Widget _buildDivider() {
    return Divider(height: 1, indent: 60, color: Colors.grey[100]);
  }

  Widget _buildSettingsTile({
    required IconData icon,
    required String title,
    String? subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ),
      subtitle: subtitle != null
          ? Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey[500]))
          : null,
      trailing: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(Icons.chevron_right_rounded, color: Colors.grey[500], size: 18),
      ),
      onTap: onTap,
    );
  }

  void _showDisclaimer(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primarySurface,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.info_outline_rounded, color: AppColors.primary, size: 22),
            ),
            const SizedBox(width: 12),
            const Text('Financial Disclaimer'),
          ],
        ),
        content: const Text(
          'Student Kwacha provides financial insights and recommendations based on your transaction data. '
          'These insights are for informational purposes only and should not be considered professional financial advice. '
          'Please consult a qualified financial advisor for important financial decisions.',
          style: TextStyle(fontSize: 14, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('I Understand'),
          ),
        ],
      ),
    );
  }
}

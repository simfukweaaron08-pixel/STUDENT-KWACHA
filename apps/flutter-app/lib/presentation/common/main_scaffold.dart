import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'app_colors.dart';

class MainScaffold extends StatelessWidget {
  final Widget child;
  const MainScaffold({super.key, required this.child});

  static int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    if (location.startsWith('/transactions')) return 1;
    if (location.startsWith('/budgets')) return 2;
    if (location.startsWith('/savings')) return 3;
    if (location.startsWith('/analytics')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _calculateSelectedIndex(context);

    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 12,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: NavigationBar(
          selectedIndex: selectedIndex,
          onDestinationSelected: (index) {
            switch (index) {
              case 0: context.go('/');
              case 1: context.go('/transactions');
              case 2: context.go('/budgets');
              case 3: context.go('/savings');
              case 4: context.go('/analytics');
            }
          },
          height: 70,
          animationDuration: const Duration(milliseconds: 400),
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          indicatorColor: AppColors.primarySurface,
          indicatorShape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.dashboard_outlined, size: 24),
              selectedIcon: Icon(Icons.dashboard_rounded, size: 24, color: AppColors.primary),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.receipt_long_outlined, size: 24),
              selectedIcon: Icon(Icons.receipt_long_rounded, size: 24, color: AppColors.primary),
              label: 'Transactions',
            ),
            NavigationDestination(
              icon: Icon(Icons.pie_chart_outline, size: 24),
              selectedIcon: Icon(Icons.pie_chart_rounded, size: 24, color: AppColors.primary),
              label: 'Budgets',
            ),
            NavigationDestination(
              icon: Icon(Icons.savings_outlined, size: 24),
              selectedIcon: Icon(Icons.savings_rounded, size: 24, color: AppColors.primary),
              label: 'Savings',
            ),
            NavigationDestination(
              icon: Icon(Icons.bar_chart_outlined, size: 24),
              selectedIcon: Icon(Icons.bar_chart_rounded, size: 24, color: AppColors.primary),
              label: 'Analytics',
            ),
          ],
        ),
      ),
    );
  }
}

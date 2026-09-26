import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/dashboard_provider.dart';
import '../common/app_colors.dart';
import '../common/app_widgets.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final dashboard = context.watch<DashboardProvider>();
    final data = dashboard.dashboardData;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: dashboard.isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : RefreshIndicator(
              onRefresh: () => dashboard.fetchDashboard(),
              color: AppColors.primary,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // Solid header
                  SliverToBoxAdapter(child: _buildHeader(context, data)),
                  // Content
                  SliverPadding(
                    padding: const EdgeInsets.only(top: 8, bottom: 24),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        // Summary cards
                        if (data != null) ...[
                          _buildSummaryCards(context, data),
                          const SizedBox(height: 8),
                          _buildBudgetCard(context, data),
                          const SizedBox(height: 8),
                          _buildNextFundingCard(context),
                          const SizedBox(height: 8),
                          _buildSavingsCard(context, data),
                        ],
                        const SizedBox(height: 8),
                        // Recent Transactions
                        SectionHeader(
                          title: 'Recent Transactions',
                          actionText: 'See All',
                          onAction: () => context.go('/transactions'),
                        ),
                        if (data?['recent_transactions'] != null)
                          ...(data!['recent_transactions'] as List).take(5).map(
                            (t) => _buildTransactionTile(t),
                          ),
                        if (data?['recent_transactions'] == null ||
                            (data!['recent_transactions'] as List).isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: EmptyState(
                              icon: Icons.receipt_long_outlined,
                              title: 'No Transactions Yet',
                              subtitle: 'Start tracking your income and expenses',
                              actionText: 'Add Transaction',
                              onAction: () => context.go('/transactions'),
                            ),
                          ),
                        const SizedBox(height: 8),
                        // Financial Insights
                        const SectionHeader(title: 'Financial Insights'),
                        if (dashboard.insights.isNotEmpty)
                          ...dashboard.insights.take(3).map(
                            (insight) => _buildInsightCard(insight),
                          ),
                        if (dashboard.insights.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Card(
                              child: Padding(
                                padding: const EdgeInsets.all(20),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: AppColors.primarySurface,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Icon(
                                        Icons.lightbulb_outline,
                                        color: AppColors.primary,
                                        size: 24,
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Text(
                                        'Add more transactions to get personalized financial insights',
                                        style: TextStyle(
                                          color: Colors.grey[600],
                                          fontSize: 13,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildHeader(BuildContext context, Map<String, dynamic>? data) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top bar
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Good ${_getGreeting()}',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.7),
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Student Kwacha',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    _buildHeaderIcon(
                      icon: Icons.account_balance_wallet_rounded,
                      onTap: () => context.go('/wallet'),
                    ),
                    const SizedBox(width: 8),
                    _buildHeaderIcon(
                      icon: Icons.notifications_outlined,
                      onTap: () => context.go('/notifications'),
                    ),
                    const SizedBox(width: 8),
                    _buildHeaderIcon(
                      icon: Icons.settings_outlined,
                      onTap: () => context.go('/settings'),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),
            // Quick balance
            if (data != null) ...[
              Text(
                'Monthly Overview',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.7),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'K${((data['monthly_summary']?['income'] ?? 0) as num).toStringAsFixed(0)}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(
                      'total income',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.6),
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderIcon({required IconData icon, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: Colors.white, size: 22),
      ),
    );
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  }

  Widget _buildSummaryCards(BuildContext context, Map<String, dynamic> data) {
    final summary = data['monthly_summary'] ?? {};
    final income = (summary['income'] ?? 0).toDouble();
    final expenses = (summary['expenses'] ?? 0).toDouble();
    final net = (summary['net'] ?? 0).toDouble();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: StatCard(
              label: 'Income',
              value: 'K${income.toStringAsFixed(0)}',
              icon: Icons.arrow_upward_rounded,
              color: AppColors.incomeSolid,
              isCompact: true,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: StatCard(
              label: 'Expenses',
              value: 'K${expenses.toStringAsFixed(0)}',
              icon: Icons.arrow_downward_rounded,
              color: AppColors.expenseSolid,
              isCompact: true,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: StatCard(
              label: 'Net Balance',
              value: 'K${net.toStringAsFixed(0)}',
              icon: Icons.account_balance_wallet_rounded,
              color: net >= 0 ? AppColors.blueSolid : AppColors.orangeSolid,
              isCompact: true,
            ),
          ),
        ],
      ),
    );
  }

  /// "Next Funding Date" card — when the card will next be charged.
  Widget _buildNextFundingCard(BuildContext context) {
    final fs = context.watch<DashboardProvider>().fundingStatus;
    if (fs == null) return const SizedBox.shrink();

    final upcoming = (fs['upcoming_funding'] as List? ?? []);
    final failed = (fs['failed_funding'] as List? ?? []);
    if (upcoming.isEmpty && failed.isEmpty) return const SizedBox.shrink();

    final Map<String, dynamic> item = failed.isNotEmpty
        ? failed.first as Map<String, dynamic>
        : upcoming.first as Map<String, dynamic>;
    final isFailed = failed.isNotEmpty;
    final nextDate = item['next_funding_date'] ?? item['failed_at'];
    final dateLabel = nextDate != null
        ? DateFormat('MMMM d').format(DateTime.tryParse(nextDate.toString()) ?? DateTime.now())
        : '—';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: AppCard(
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isFailed ? const Color(0xFFFFEBEE) : AppColors.primarySurface,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                isFailed ? Icons.error_outline : Icons.event_repeat_rounded,
                color: isFailed ? AppColors.expense : AppColors.primary,
                size: 22,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isFailed ? 'Funding failed' : 'Next Funding Date',
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isFailed
                        ? '${item['name'] ?? 'Budget'} — update payment method'
                        : '$dateLabel — K${((item['amount'] ?? 0) as num).toStringAsFixed(0)}',
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 14, color: Colors.black87),
                  ),
                ],
              ),
            ),
            if (isFailed)
              TextButton(
                onPressed: () => context.push('/link-card'),
                child: const Text('Fix'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildBudgetCard(BuildContext context, Map<String, dynamic> data) {
    final budgets = data['budgets'] ?? {};
    final totalBudget = double.tryParse((budgets['total_budget'] ?? 0).toString()) ?? 0.0;
    final totalSpent = double.tryParse((budgets['total_spent'] ?? 0).toString()) ?? 0.0;
    final progress = totalBudget > 0 ? (totalSpent / totalBudget).clamp(0.0, 1.0) : 0.0;

    return AppCard(
      onTap: () => context.go('/budgets'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primarySurface,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.pie_chart_rounded, color: AppColors.primary, size: 20),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Monthly Budget',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                ],
              ),
              const Icon(Icons.chevron_right, color: Colors.grey),
            ],
          ),
          const SizedBox(height: 16),
          SolidProgressIndicator(
            progress: progress.toDouble(),
            height: 10,
            borderRadius: 5,
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'K${totalSpent.toStringAsFixed(0)} spent',
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
              Text(
                'K${totalBudget.toStringAsFixed(0)} budget',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSavingsCard(BuildContext context, Map<String, dynamic> data) {
    final savings = data['savings'] ?? {};
    final target = double.tryParse((savings['total_target'] ?? 0).toString()) ?? 0.0;
    final saved = double.tryParse((savings['total_saved'] ?? 0).toString()) ?? 0.0;
    final progress = target > 0 ? (saved / target).clamp(0.0, 1.0) : 0.0;

    return AppCard(
      onTap: () => context.go('/savings'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE3F2FD),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.savings_rounded, color: AppColors.savings, size: 20),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Savings Goals',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                ],
              ),
              const Icon(Icons.chevron_right, color: Colors.grey),
            ],
          ),
          const SizedBox(height: 16),
          if (target > 0) ...[
            SolidProgressIndicator(
              progress: progress.toDouble(),
              color: AppColors.blueSolid,
              height: 10,
              borderRadius: 5,
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'K${saved.toStringAsFixed(0)} saved',
                  style: TextStyle(color: Colors.grey[600], fontSize: 13),
                ),
                Text(
                  'K${target.toStringAsFixed(0)} target',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
              ],
            ),
          ] else
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Icon(Icons.add_circle_outline, color: Colors.grey[400], size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'No active savings goals. Tap to create one.',
                    style: TextStyle(color: Colors.grey[500], fontSize: 13),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTransactionTile(Map<String, dynamic> transaction) {
    final category = transaction['category'];
    final isIncome = transaction['type'] == 'income';
    final amount = double.tryParse(transaction['amount'].toString()) ?? 0;

    return AppCard(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: isIncome ? AppColors.incomeSolid : AppColors.expenseSolid,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isIncome ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
              color: Colors.white,
              size: 20,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  transaction['description'] ?? 'Transaction',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                ),
                const SizedBox(height: 2),
                Text(
                  category?['name'] ?? 'Uncategorized',
                  style: TextStyle(color: Colors.grey[500], fontSize: 12),
                ),
              ],
            ),
          ),
          Text(
            '${isIncome ? '+' : '-'}K${amount.toStringAsFixed(2)}',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 14,
              color: isIncome ? AppColors.income : AppColors.expense,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInsightCard(Map<String, dynamic> insight) {
    final priority = insight['priority'];
    final Color color;
    final IconData icon;
    final Color bgColor;

    switch (priority) {
      case 'high':
        color = AppColors.warning;
        icon = Icons.warning_amber_rounded;
        bgColor = const Color(0xFFFFF3E0);
        break;
      case 'medium':
        color = AppColors.accentBlue;
        icon = Icons.info_outline;
        bgColor = const Color(0xFFE3F2FD);
        break;
      default:
        color = AppColors.primary;
        icon = Icons.lightbulb_outline;
        bgColor = AppColors.primarySurface;
    }

    return AppCard(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  insight['title'] ?? '',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                ),
                const SizedBox(height: 4),
                Text(
                  insight['body'] ?? '',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
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

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/budget_provider.dart';
import '../../core/services/auth_service.dart';
import '../common/app_colors.dart';
import '../common/app_widgets.dart';

class BudgetsScreen extends StatefulWidget {
  const BudgetsScreen({super.key});

  @override
  State<BudgetsScreen> createState() => _BudgetsScreenState();
}

class _BudgetsScreenState extends State<BudgetsScreen> {
  Map<String, dynamic>? _prediction;

  @override
  void initState() {
    super.initState();
    _loadPrediction();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<BudgetProvider>().fetchFundingStatus();
    });
  }

  Future<void> _loadPrediction() async {
    try {
      final auth = context.read<AuthService>();
      final response = await auth.api.getBudgetPrediction();
      if (mounted) {
        setState(() => _prediction = response['data']);
      }
    } catch (_) {
      // Prediction unavailable — banner simply won't show
    }
  }

  @override
  Widget build(BuildContext context) {
    final budgetProvider = context.watch<BudgetProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Solid header
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
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
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Budgets',
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Track your spending limits',
                            style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13),
                          ),
                        ],
                      ),
                      // Quick stats
                      if (budgetProvider.budgets.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '${budgetProvider.budgets.length} active',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          // Budget list
          Expanded(
            child: budgetProvider.isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : RefreshIndicator(
                    onRefresh: () async {
                      await budgetProvider.fetchBudgets();
                      await _loadPrediction();
                    },
                    color: AppColors.primary,
                    child: budgetProvider.budgets.isEmpty
                        ? const EmptyState(
                            icon: Icons.pie_chart_outline,
                            title: 'No Budgets Yet',
                            subtitle: 'Create a budget, link your card, and it gets funded automatically',
                            actionText: 'Create Budget',
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
                            itemCount: budgetProvider.budgets.length +
                                (_showPredictionBanner ? 1 : 0) +
                                (_showFundingBanner(budgetProvider) ? 1 : 0),
                            itemBuilder: (context, index) {
                              int i = index;
                              if (_showPredictionBanner && i == 0) {
                                return _buildPredictionBanner();
                              }
                              if (_showPredictionBanner) i -= 1;
                              if (_showFundingBanner(budgetProvider) && i == 0) {
                                return _buildFundingBanner(budgetProvider);
                              }
                              if (_showFundingBanner(budgetProvider)) i -= 1;
                              final budget = budgetProvider.budgets[i];
                              return _buildBudgetCard(context, budget);
                            },
                          ),
                  ),
          ),
        ],
      ),
      floatingActionButton: Container(
        decoration: BoxDecoration(
          color: AppColors.primarySolid,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.4),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: FloatingActionButton(
          onPressed: () => _showAddBudgetDialog(context),
          backgroundColor: Colors.transparent,
          elevation: 0,
          child: const Icon(Icons.add_rounded, color: Colors.white, size: 28),
        ),
      ),
    );
  }

  bool get _showPredictionBanner =>
      _prediction != null &&
      _prediction!['prediction_available'] == true &&
      (_prediction!['risk_level'] == 'high' || _prediction!['risk_level'] == 'medium');

  Widget _buildPredictionBanner() {
    final p = _prediction!;
    final isHigh = p['risk_level'] == 'high';
    final color = isHigh ? AppColors.expense : AppColors.warning;
    final bg = isHigh ? const Color(0xFFFFEBEE) : const Color(0xFFFFF3E0);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.psychology_rounded, color: color, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'AI Overspending Prediction — ${p['risk_level'].toString().toUpperCase()} risk',
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            p['message'] ?? '',
            style: TextStyle(color: Colors.grey[700], fontSize: 12),
          ),
          if (p['recommended_daily_spend'] != null) ...[
            const SizedBox(height: 6),
            Text(
              'Suggested: keep daily spending under K${(p['recommended_daily_spend'] as num).toStringAsFixed(2)}',
              style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBudgetCard(BuildContext context, Map<String, dynamic> budget) {
    final category = budget['category'];
    final amount = double.tryParse(budget['amount']?.toString() ?? '0') ?? 0.0;
    final spent = double.tryParse(budget['spent_amount']?.toString() ?? '0') ?? 0.0;
    final remaining = double.tryParse(budget['remaining']?.toString() ?? '0') ?? 0.0;
    final percentage = double.tryParse((budget['percentage_used'] ?? 0).toString()) ?? 0.0;
    final isOverBudget = percentage > 100;

    final Color progressColor;
    if (isOverBudget) {
      progressColor = AppColors.expense;
    } else if (percentage > 80) {
      progressColor = AppColors.warning;
    } else {
      progressColor = AppColors.success;
    }

    final categoryColor = Color(
      int.parse(category?['color']?.replaceFirst('#', '0xFF') ?? '0xFF4CAF50'),
    );

    return AppCard(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Circular progress
              SizedBox(
                width: 64,
                height: 64,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CircularProgressIndicator(
                      value: (percentage / 100).clamp(0.0, 1.0).toDouble(),
                      strokeWidth: 6,
                      backgroundColor: Colors.grey[200],
                      color: progressColor,
                      strokeCap: StrokeCap.round,
                    ),
                    Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${percentage.toStringAsFixed(0)}%',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                              color: progressColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: categoryColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            category?['name'] ?? 'Overall Budget',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          '${budget['period'] ?? 'monthly'} - K${amount.toStringAsFixed(0)} limit',
                          style: TextStyle(color: Colors.grey[500], fontSize: 12),
                        ),
                        if (budget['enforce'] == true) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF3E0),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'STRICT',
                              style: TextStyle(
                                color: AppColors.warning,
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Progress bar
          SolidProgressIndicator(
            progress: (percentage / 100).clamp(0.0, 1.0).toDouble(),
            height: 8,
            borderRadius: 4,
            color: progressColor,
          ),
          const SizedBox(height: 12),
          // Stats
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildMiniStat('Spent', 'K${spent.toStringAsFixed(0)}', AppColors.expense),
              _buildMiniStat('Remaining', 'K${remaining.toStringAsFixed(0)}', AppColors.income),
              _buildMiniStat('Budget', 'K${amount.toStringAsFixed(0)}', AppColors.primary),
            ],
          ),
          if (isOverBudget) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFFFEBEE),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: AppColors.expense, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'Over budget by K${(spent - amount).toStringAsFixed(0)}',
                    style: const TextStyle(
                      color: AppColors.expense,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMiniStat(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(color: Colors.grey[500], fontSize: 11),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 13,
            color: color,
          ),
        ),
      ],
    );
  }

  void _showAddBudgetDialog(BuildContext context) {
    context.push('/budgets/create');
  }

  /// Show the funding banner when a funding charge failed or is due now.
  bool _showFundingBanner(BudgetProvider provider) {
    final fs = provider.fundingStatus;
    if (fs == null) return false;
    final failed = (fs['failed_funding'] as List? ?? []).isNotEmpty;
    final due = (fs['funding_due'] as List? ?? []).isNotEmpty;
    return failed || due;
  }

  Widget _buildFundingBanner(BudgetProvider provider) {
    final fs = provider.fundingStatus!;
    final failed = (fs['failed_funding'] as List? ?? []);
    final due = (fs['funding_due'] as List? ?? []);

    if (failed.isNotEmpty) {
      final f = failed.first as Map<String, dynamic>;
      return Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFFFEBEE),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.expense.withOpacity(0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.error_outline, color: AppColors.expense, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Funding failed — ${f['name'] ?? 'budget'}',
                    style: const TextStyle(
                        color: AppColors.expense,
                        fontWeight: FontWeight.w700,
                        fontSize: 13),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'K${(f['amount'] as num? ?? 0).toStringAsFixed(2)} could not be charged. Reason: ${f['failure_reason'] ?? 'payment declined'}',
              style: TextStyle(color: Colors.grey[700], fontSize: 12),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => context.push('/link-card'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.expense,
                      side: const BorderSide(color: AppColors.expense),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    icon: const Icon(Icons.credit_card, size: 16),
                    label: const Text('Update Payment', style: TextStyle(fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      final err = await context.read<BudgetProvider>().retryFunding(f['budget_id'] as String);
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                        content: Text(err ?? 'Payment successful — budget funded'),
                      ));
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.expense,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    icon: const Icon(Icons.refresh, size: 16),
                    label: const Text('Retry Payment', style: TextStyle(fontSize: 12)),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    // Due-now banner
    final d = due.first as Map<String, dynamic>;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFE8F5E9),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.event_available, color: AppColors.primary, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Funding due for ${d['name'] ?? 'budget'} — K${(d['amount'] as num? ?? 0).toStringAsFixed(0)} will be charged shortly.',
              style: TextStyle(color: Colors.grey[800], fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

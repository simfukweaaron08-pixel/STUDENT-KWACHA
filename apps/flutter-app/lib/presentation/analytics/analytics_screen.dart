import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';

import '../../core/services/auth_service.dart';
import '../common/app_colors.dart';
import '../common/app_widgets.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  Map<String, dynamic>? _categoryBreakdown;
  List<Map<String, dynamic>> _monthlyComparison = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final auth = context.read<AuthService>();
    if (!auth.isAuthenticated) return;

    try {
      final breakdown = await auth.api.getCategoryBreakdown();
      final comparison = await auth.api.getMonthlyComparison(months: 6);
      setState(() {
        _categoryBreakdown = breakdown['data'];
        _monthlyComparison = List<Map<String, dynamic>>.from(comparison['data']);
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _loadData,
              color: AppColors.primary,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // Solid header
                  SliverToBoxAdapter(
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                      decoration: const BoxDecoration(
                        color: AppColors.analyticsSolid,
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
                            Text(
                              'Analytics',
                              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Insights into your financial habits',
                              style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  // Content
                  SliverPadding(
                    padding: const EdgeInsets.only(top: 16, bottom: 24),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        // Category Pie Chart
                        const SectionHeader(title: 'Spending by Category'),
                        _buildCategoryPieChart(),
                        const SizedBox(height: 16),
                        // Monthly Bar Chart
                        const SectionHeader(title: 'Monthly Comparison'),
                        _buildMonthlyBarChart(),
                        const SizedBox(height: 16),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildCategoryPieChart() {
    final categories = _categoryBreakdown?['categories'] as List? ?? [];
    if (categories.isEmpty) {
      return const AppCard(
        child: EmptyState(
          icon: Icons.pie_chart_outline,
          title: 'No Spending Data',
          subtitle: 'Add transactions to see your spending breakdown',
        ),
      );
    }

    final colors = AppColors.chartColors;

    return AppCard(
      child: Column(
        children: [
          SizedBox(
            height: 220,
            child: PieChart(
              PieChartData(
                sections: categories.asMap().entries.map((entry) {
                  final i = entry.key;
                  final cat = entry.value;
                  final percentage = double.tryParse(cat['percentage']?.toString() ?? '0') ?? 0.0;
                  return PieChartSectionData(
                    value: percentage,
                    title: '${percentage.toStringAsFixed(0)}%',
                    color: colors[i % colors.length],
                    radius: 90,
                    titleStyle: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  );
                }).toList(),
                sectionsSpace: 3,
                centerSpaceRadius: 44,
                centerSpaceColor: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 20),
          // Legend
          Wrap(
            spacing: 20,
            runSpacing: 12,
            children: categories.asMap().entries.map((entry) {
              final i = entry.key;
              final cat = entry.value;
              final name = cat['category']?['name'] ?? 'Other';
              final total = cat['total'] ?? 0;
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: colors[i % colors.length],
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      Text(
                        'K$total',
                        style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                      ),
                    ],
                  ),
                ],
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildMonthlyBarChart() {
    if (_monthlyComparison.isEmpty) {
      return const AppCard(
        child: EmptyState(
          icon: Icons.bar_chart_outlined,
          title: 'No Comparison Data',
          subtitle: 'Add more months of data to see trends',
        ),
      );
    }

    final maxY = _monthlyComparison.fold<double>(0.0, (max, m) {
      final income = double.tryParse((m['income'] ?? 0).toString()) ?? 0.0;
      final expenses = double.tryParse((m['expenses'] ?? 0).toString()) ?? 0.0;
      return income > max ? income : (expenses > max ? expenses : max);
    });

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Legend
          Row(
            children: [
              _buildChartLegend('Income', AppColors.income),
              const SizedBox(width: 20),
              _buildChartLegend('Expenses', AppColors.expense),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 200,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: maxY * 1.2,
                barGroups: _monthlyComparison.asMap().entries.map((entry) {
                  final i = entry.key;
                  final m = entry.value;
                  return BarChartGroupData(
                    x: i,
                    barRods: [
                      BarChartRodData(
                        toY: double.tryParse((m['income'] ?? 0).toString()) ?? 0.0,
                        color: AppColors.incomeSolid,
                        width: 14,
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                      ),
                      BarChartRodData(
                        toY: double.tryParse((m['expenses'] ?? 0).toString()) ?? 0.0,
                        color: AppColors.expenseSolid,
                        width: 14,
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                      ),
                    ],
                  );
                }).toList(),
                titlesData: FlTitlesData(
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, meta) {
                        final i = value.toInt();
                        if (i < _monthlyComparison.length) {
                          final month = _monthlyComparison[i]['month']?.toString() ?? '';
                          final shortMonth = month.length >= 7 ? month.substring(5) : month;
                          return Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              shortMonth,
                              style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                            ),
                          );
                        }
                        return const Text('');
                      },
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 50,
                      getTitlesWidget: (value, meta) {
                        if (value >= 1000) {
                          return Text(
                            '${(value / 1000).toStringAsFixed(0)}k',
                            style: TextStyle(fontSize: 10, color: Colors.grey[500]),
                          );
                        }
                        return Text(
                          value.toStringAsFixed(0),
                          style: TextStyle(fontSize: 10, color: Colors.grey[500]),
                        );
                      },
                    ),
                  ),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                borderData: FlBorderData(show: false),
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: maxY > 0 ? maxY / 4 : 1,
                  getDrawingHorizontalLine: (value) => FlLine(
                    color: Colors.grey[200]!,
                    strokeWidth: 1,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChartLegend(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
      ],
    );
  }
}

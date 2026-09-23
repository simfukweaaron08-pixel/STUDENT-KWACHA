import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/providers/savings_provider.dart';
import '../common/app_colors.dart';
import '../common/app_widgets.dart';

class SavingsScreen extends StatelessWidget {
  const SavingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final savingsProvider = context.watch<SavingsProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Solid header
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            decoration: const BoxDecoration(
              color: AppColors.savingsSolid,
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
                            'Savings Goals',
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${savingsProvider.goals.length} goals',
                            style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13),
                          ),
                        ],
                      ),
                    ],
                  ),
                  // Total progress
                  if (savingsProvider.goals.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    _buildTotalProgress(savingsProvider.goals),
                  ],
                ],
              ),
            ),
          ),
          // Goals list
          Expanded(
            child: savingsProvider.isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.savings))
                : RefreshIndicator(
                    onRefresh: () => savingsProvider.fetchGoals(),
                    color: AppColors.savings,
                    child: savingsProvider.goals.isEmpty
                        ? const EmptyState(
                            icon: Icons.savings_outlined,
                            title: 'No Savings Goals',
                            subtitle: 'Create a goal to start saving towards something important',
                            actionText: 'Create Goal',
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
                            itemCount: savingsProvider.goals.length,
                            itemBuilder: (context, index) {
                              final goal = savingsProvider.goals[index];
                              return _buildGoalCard(context, goal);
                            },
                          ),
                  ),
          ),
        ],
      ),
      floatingActionButton: Container(
        decoration: BoxDecoration(
          color: AppColors.blueSolid,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppColors.savings.withOpacity(0.4),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: FloatingActionButton(
          onPressed: () => _showAddGoalDialog(context),
          backgroundColor: Colors.transparent,
          elevation: 0,
          child: const Icon(Icons.add_rounded, color: Colors.white, size: 28),
        ),
      ),
    );
  }

  Widget _buildTotalProgress(List<Map<String, dynamic>> goals) {
    double totalTarget = 0;
    double totalSaved = 0;
    for (final goal in goals) {
      totalTarget += double.tryParse(goal['target_amount'].toString()) ?? 0;
      totalSaved += double.tryParse(goal['current_amount'].toString()) ?? 0;
    }
    final totalProgress = totalTarget > 0 ? (totalSaved / totalTarget).clamp(0.0, 1.0) : 0.0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 56,
            height: 56,
            child: Stack(
              fit: StackFit.expand,
              children: [
                CircularProgressIndicator(
                  value: totalProgress.toDouble(),
                  strokeWidth: 5,
                  backgroundColor: Colors.white.withOpacity(0.2),
                  color: Colors.white,
                  strokeCap: StrokeCap.round,
                ),
                Center(
                  child: Text(
                    '${(totalProgress * 100).toStringAsFixed(0)}%',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Overall Progress',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                ),
                const SizedBox(height: 4),
                Text(
                  'K${totalSaved.toStringAsFixed(0)} saved of K${totalTarget.toStringAsFixed(0)}',
                  style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGoalCard(BuildContext context, Map<String, dynamic> goal) {
    final targetAmount = double.tryParse(goal['target_amount'].toString()) ?? 0;
    final currentAmount = double.tryParse(goal['current_amount'].toString()) ?? 0;
    final progress = double.tryParse(goal['progress_percentage']?.toString() ?? '0') ?? 0.0;
    final status = goal['status'] ?? 'active';
    final remaining = targetAmount - currentAmount;

    final bool isCompleted = status == 'completed';
    final Color progressColor = isCompleted ? AppColors.success : AppColors.savings;

    return AppCard(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: isCompleted ? AppColors.incomeSolid : AppColors.blueSolid,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        isCompleted ? Icons.check_circle_rounded : Icons.savings_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            goal['name'] ?? 'Goal',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                          ),
                          Text(
                            'Target: K${targetAmount.toStringAsFixed(0)}',
                            style: TextStyle(color: Colors.grey[500], fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isCompleted ? AppColors.primarySurface : const Color(0xFFE3F2FD),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  status.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: isCompleted ? AppColors.primary : AppColors.savings,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Progress
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'K${currentAmount.toStringAsFixed(0)} saved',
                          style: TextStyle(color: Colors.grey[600], fontSize: 12),
                        ),
                        Text(
                          '${progress.toStringAsFixed(0)}%',
                          style: TextStyle(
                            color: progressColor,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    SolidProgressIndicator(
                      progress: (progress / 100).clamp(0.0, 1.0).toDouble(),
                      color: progressColor,
                      height: 8,
                      borderRadius: 4,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Stats row
          Row(
            children: [
              _buildGoalStat('Remaining', 'K${remaining.toStringAsFixed(0)}', Colors.grey[600]!),
              const SizedBox(width: 24),
              _buildGoalStat(
                'Frequency',
                goal['frequency'] ?? 'monthly',
                AppColors.primary,
              ),
            ],
          ),
          // Actions
          if (!isCompleted) ...[
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                _buildActionButton(
                  icon: Icons.add_rounded,
                  label: 'Add',
                  onTap: () => _showAddEntryDialog(context, goal),
                  color: AppColors.blueSolid,
                ),
                const SizedBox(width: 8),
                _buildActionButton(
                  icon: Icons.insights_rounded,
                  label: 'Predict',
                  onTap: () => _showPrediction(context, goal),
                  color: AppColors.purpleSolid,
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildGoalStat(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 11)),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: color),
        ),
      ],
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required Color color,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.2),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: Colors.white, size: 16),
            const SizedBox(width: 4),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddGoalDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const AddGoalSheet(),
    );
  }

  void _showAddEntryDialog(BuildContext context, Map<String, dynamic> goal) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => AddEntrySheet(goalId: goal['id']),
    );
  }

  void _showPrediction(BuildContext context, Map<String, dynamic> goal) async {
    final prediction = await context.read<SavingsProvider>().getPrediction(goal['id']);
    if (context.mounted && prediction != null) {
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
                child: const Icon(Icons.insights_rounded, color: AppColors.primary, size: 22),
              ),
              const SizedBox(width: 12),
              const Text('Savings Prediction'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (prediction['prediction_available'] == true) ...[
                _buildPredictionRow('Monthly Savings', 'K${prediction['predicted_monthly_savings']?.toStringAsFixed(2) ?? '0'}'),
                _buildPredictionRow('Months Remaining', '${prediction['months_remaining'] ?? 'N/A'}'),
                _buildPredictionRow('Confidence', '${prediction['confidence'] ?? 'N/A'}'),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primarySurface,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    prediction['message'] ?? '',
                    style: const TextStyle(fontSize: 13, color: AppColors.primary),
                  ),
                ),
              ] else
                Text(prediction['message'] ?? 'No prediction available'),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
  }

  Widget _buildPredictionRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ],
      ),
    );
  }
}

class AddGoalSheet extends StatefulWidget {
  const AddGoalSheet({super.key});

  @override
  State<AddGoalSheet> createState() => _AddGoalSheetState();
}

class _AddGoalSheetState extends State<AddGoalSheet> {
  final _nameController = TextEditingController();
  final _amountController = TextEditingController();
  String _frequency = 'monthly';
  DateTime _targetDate = DateTime.now().add(const Duration(days: 180));

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 24,
        right: 24,
        top: 12,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          const Text('Create Savings Goal', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 20),
          TextFormField(
            controller: _nameController,
            decoration: InputDecoration(
              labelText: 'Goal Name',
              hintText: 'e.g., Emergency Fund, Vacation',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _amountController,
            keyboardType: TextInputType.number,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
            decoration: InputDecoration(
              labelText: 'Target Amount (K)',
              prefixText: 'K ',
              prefixStyle: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            value: _frequency,
            decoration: InputDecoration(
              labelText: 'Savings Frequency',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
            items: const [
              DropdownMenuItem(value: 'daily', child: Text('Daily')),
              DropdownMenuItem(value: 'weekly', child: Text('Weekly')),
              DropdownMenuItem(value: 'biweekly', child: Text('Biweekly')),
              DropdownMenuItem(value: 'monthly', child: Text('Monthly')),
            ],
            onChanged: (v) => setState(() => _frequency = v ?? 'monthly'),
          ),
          const SizedBox(height: 16),
          // Target date
          GestureDetector(
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _targetDate,
                firstDate: DateTime.now(),
                lastDate: DateTime.now().add(const Duration(days: 3650)),
              );
              if (picked != null) setState(() => _targetDate = picked);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey[300]!),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Target: ${_targetDate.toString().split(' ')[0]}',
                    style: const TextStyle(fontSize: 14),
                  ),
                  const Icon(Icons.calendar_today, color: AppColors.primary, size: 20),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: () async {
                if (_nameController.text.isEmpty || _amountController.text.isEmpty) return;
                final success = await context.read<SavingsProvider>().createGoal({
                  'name': _nameController.text.trim(),
                  'target_amount': double.parse(_amountController.text),
                  'target_date': _targetDate.toIso8601String().split('T')[0],
                  'frequency': _frequency,
                });
                if (success && mounted) Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.savings,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Create Goal', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    super.dispose();
  }
}

class AddEntrySheet extends StatefulWidget {
  final String goalId;
  const AddEntrySheet({super.key, required this.goalId});

  @override
  State<AddEntrySheet> createState() => _AddEntrySheetState();
}

class _AddEntrySheetState extends State<AddEntrySheet> {
  final _amountController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 24,
        right: 24,
        top: 12,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          const Text('Add Savings Entry', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 20),
          TextFormField(
            controller: _amountController,
            keyboardType: TextInputType.number,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
            decoration: InputDecoration(
              labelText: 'Amount (K)',
              prefixText: 'K ',
              prefixStyle: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: AppColors.savings),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: () async {
                if (_amountController.text.isEmpty) return;
                final success = await context.read<SavingsProvider>().addEntry(widget.goalId, {
                  'amount': double.parse(_amountController.text),
                  'entry_date': DateTime.now().toIso8601String().split('T')[0],
                });
                if (success && mounted) Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.savings,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Add Entry', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }
}

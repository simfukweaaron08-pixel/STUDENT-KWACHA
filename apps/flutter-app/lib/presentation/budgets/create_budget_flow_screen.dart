import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/budget_provider.dart';
import '../../core/services/auth_service.dart';
import '../common/app_colors.dart';

/// Multi-step budget creation flow:
///   Step 1 — Budget details (name, amount, frequency, funding date)
///   Step 2 — Expense allocations per category
///   Step 3 — Review summary → Activate
class CreateBudgetFlowScreen extends StatefulWidget {
  const CreateBudgetFlowScreen({super.key});

  @override
  State<CreateBudgetFlowScreen> createState() => _CreateBudgetFlowScreenState();
}

class _CreateBudgetFlowScreenState extends State<CreateBudgetFlowScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _amountController = TextEditingController();

  int _step = 0;
  String _frequency = 'monthly';
  int _fundingDay = 1;
  final List<_Allocation> _allocations = [];

  List<Map<String, dynamic>> _categories = [];
  bool _creating = false;
  bool _activating = false;
  String? _createdBudgetId;

  double get _budgetAmount => double.tryParse(_amountController.text) ?? 0;
  double get _allocatedTotal =>
      _allocations.fold(0, (s, a) => s + (double.tryParse(a.amountText) ?? 0));
  double get _remaining => _budgetAmount - _allocatedTotal;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    for (final a in _allocations) {
      a.controller.dispose();
    }
    super.dispose();
  }

  Future<void> _loadCategories() async {
    try {
      final auth = context.read<AuthService>();
      final response = await auth.api.getCategories();
      if (mounted) {
        setState(() {
          _categories = List<Map<String, dynamic>>.from(response['data'] ?? []);
        });
      }
    } catch (_) {}
  }

  Future<void> _submit() async {
    // Step 2 → Step 3 validation
    if (_allocations.isEmpty) {
      _snack('Add at least one expense category');
      return;
    }
    final invalid = _allocations.where((a) => (double.tryParse(a.amountText) ?? 0) <= 0);
    if (invalid.isNotEmpty) {
      _snack('Every expense needs an amount');
      return;
    }
    if (_remaining < -0.001) {
      _snack('Allocations exceed the budget amount');
      return;
    }

    final budgetProvider = context.read<BudgetProvider>();
    setState(() => _creating = true);

    final today = DateTime.now();
    final data = {
      'name': _nameController.text.trim(),
      'amount': _budgetAmount,
      'period': _frequency == 'one_time' ? 'monthly' : _frequency,
      'frequency': _frequency,
      'funding_day': _fundingDay,
      'start_date': today.toIso8601String().split('T')[0],
      'allocations': _allocations
          .map((a) => {'category_id': a.categoryId, 'amount': double.parse(a.amountText)})
          .toList(),
    };

    try {
      final response = await context.read<AuthService>().api.createBudget(data);
      final budgetId = response['data']?['id'] as String?;
      if (!mounted) return;

      if (budgetId == null) {
        _snack('Could not create budget');
        setState(() => _creating = false);
        return;
      }

      setState(() {
        _createdBudgetId = budgetId;
        _step = 2;
        _creating = false;
      });
      // Keep provider state fresh
      await budgetProvider.fetchBudgets();
    } catch (e) {
      if (mounted) {
        setState(() => _creating = false);
        _snack('Could not create budget: $e');
      }
    }
  }

  Future<void> _activate() async {
    if (_createdBudgetId == null) return;
    setState(() => _activating = true);
    final error = await context.read<BudgetProvider>().activateBudget(_createdBudgetId!);
    if (!mounted) return;
    setState(() => _activating = false);

    if (error != null) {
      _snack(error);
      return;
    }
    await context.read<BudgetProvider>().fetchFundingStatus();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Budget activated! Funding scheduled.')),
      );
      context.go('/budgets');
    }
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  String _freqLabel(String f) => switch (f) {
        'one_time' => 'One-time',
        'weekly' => 'Weekly',
        'monthly' => 'Monthly',
        'quarterly' => 'Quarterly',
        'yearly' => 'Yearly',
        _ => f,
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(_step == 2 ? 'Confirm Budget' : 'Create Budget'),
        backgroundColor: AppColors.heroSolid,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: switch (_step) {
        0 => _buildDetailsStep(),
        1 => _buildAllocationsStep(),
        _ => _buildReviewStep(),
      },
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  // ── Step indicator ────────────────────────────────────────────
  Widget _buildStepDots() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(3, (i) {
          final active = i == _step;
          return Container(
            width: active ? 24 : 8,
            height: 8,
            margin: const EdgeInsets.symmetric(horizontal: 4),
            decoration: BoxDecoration(
              color: active ? AppColors.primary : Colors.grey[300],
              borderRadius: BorderRadius.circular(4),
            ),
          );
        }),
      ),
    );
  }

  // ── Step 1: details ───────────────────────────────────────────
  Widget _buildDetailsStep() {
    final hasPm = context.watch<BudgetProvider>().hasPaymentMethod;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStepDots(),
            if (!hasPm) _buildLinkCardPrompt(),
            _labeledField(
              label: 'Budget name',
              child: TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  hintText: 'e.g. September Monthly Expenses',
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Budget name is required' : null,
              ),
            ),
            _labeledField(
              label: 'Total amount to fund (K)',
              child: TextFormField(
                controller: _amountController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}$')),
                ],
                decoration: const InputDecoration(hintText: 'e.g. 3000'),
                validator: (v) =>
                    (double.tryParse(v ?? '') ?? 0) <= 0 ? 'Enter a valid amount' : null,
                onChanged: (_) => setState(() {}),
              ),
            ),
            _labeledField(
              label: 'Frequency',
              child: Wrap(
                spacing: 8,
                children: [
                  'monthly', 'weekly', 'quarterly', 'yearly', 'one_time',
                ].map((f) => ChoiceChip(
                      label: Text(_freqLabel(f)),
                      selected: _frequency == f,
                      onSelected: (_) => setState(() => _frequency = f),
                    )).toList(),
              ),
            ),
            _labeledField(
              label: 'Funding date (day of month)',
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (var d = 1; d <= 28; d++)
                    ChoiceChip(
                      label: Text('$d'),
                      selected: _fundingDay == d,
                      onSelected: (_) => setState(() => _fundingDay = d),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.primarySurface,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.event_repeat, color: AppColors.primary, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Your card will be charged K${_budgetAmount.toStringAsFixed(0)} '
                      '${_freqLabel(_frequency).toLowerCase()} on day $_fundingDay.',
                      style: const TextStyle(fontSize: 12.5, color: Colors.black87),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLinkCardPrompt() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7E6),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF0C36D)),
      ),
      child: Row(
        children: [
          const Icon(Icons.credit_card, color: Color(0xFFB8860B)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Link a card first so your budget can be funded automatically.',
              style: TextStyle(fontSize: 12.5, color: Colors.grey[800]),
            ),
          ),
          TextButton(
            onPressed: () => context.push('/link-card'),
            child: const Text('Link Card'),
          ),
        ],
      ),
    );
  }

  // ── Step 2: allocations ───────────────────────────────────────
  Widget _buildAllocationsStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildStepDots(),
          Text(
            'Divide K${_budgetAmount.toStringAsFixed(0)} into expenses',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            'Each expense can only be spent on its category',
            style: TextStyle(fontSize: 12.5, color: Colors.grey[600]),
          ),
          const SizedBox(height: 16),
          ..._allocations.asMap().entries.map((e) => _allocationTile(e.key, e.value)),
          if (_categories.isNotEmpty)
            Center(
              child: TextButton.icon(
                onPressed: () {
                  final used = _allocations.map((a) => a.categoryId).toSet();
                  final next = _categories.firstWhere(
                    (c) => !used.contains(c['id']),
                    orElse: () => _categories.first,
                  );
                  setState(() {
                    _allocations.add(_Allocation(
                      categoryId: next['id'],
                      categoryName: next['name'] ?? 'Category',
                      categoryIcon: next['icon'] ?? 'category',
                    ));
                  });
                },
                icon: const Icon(Icons.add_circle_outline),
                label: const Text('Add expense'),
              ),
            ),
          const SizedBox(height: 8),
          // Running totals
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey[200]!),
            ),
            child: Column(
              children: [
                _summaryRow('Budget amount', _budgetAmount),
                _summaryRow('Allocated', _allocatedTotal),
                const Divider(height: 20),
                _summaryRow('Remaining to allocate', _remaining, bold: true),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _allocationTile(int index, _Allocation a) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primarySurface,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.category_rounded, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DropdownButton<String>(
                  value: a.categoryId,
                  isExpanded: true,
                  underline: const SizedBox.shrink(),
                  items: _categories
                      .map((c) => DropdownMenuItem(
                            value: c['id'] as String,
                            child: Text(c['name'] ?? 'Category',
                                style: const TextStyle(fontSize: 14)),
                          ))
                      .toList(),
                  onChanged: (v) {
                    final cat = _categories.firstWhere((c) => c['id'] == v);
                    setState(() {
                      _allocations[index] = _Allocation(
                        categoryId: v!,
                        categoryName: cat['name'] ?? 'Category',
                        categoryIcon: cat['icon'] ?? 'category',
                        amountText: a.amountText,
                      );
                    });
                  },
                ),
                TextFormField(
                  controller: a.controller,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}$')),
                  ],
                  decoration: const InputDecoration(
                    hintText: 'Amount (K)',
                    isDense: true,
                    border: InputBorder.none,
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.remove_circle_outline, color: Colors.redAccent),
            onPressed: () {
              setState(() => _allocations.removeAt(index));
              a.controller.dispose();
            },
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, double value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
                color: bold ? Colors.black87 : Colors.grey[600],
              )),
          Text('K${value.toStringAsFixed(2)}',
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
                color: value < 0 ? Colors.redAccent : Colors.black87,
              )),
        ],
      ),
    );
  }

  // ── Step 3: review ────────────────────────────────────────────
  Widget _buildReviewStep() {
    final pm = context.watch<BudgetProvider>().paymentMethods.firstOrNull;
    final pmLabel = (pm?['card_brand'] != null)
        ? '${pm!['card_brand']} •• ${pm['card_last4'] ?? '••••'}'
        : 'Card';
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildStepDots(),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey[200]!),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Budget Summary',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                const SizedBox(height: 16),
                _reviewRow('Budget', _nameController.text.trim()),
                _reviewRow('Amount', 'K${_budgetAmount.toStringAsFixed(0)}'),
                _reviewRow('Funding',
                    '${_freqLabel(_frequency)} — day $_fundingDay'),
                _reviewRow('Payment Method', pmLabel),
                const Divider(height: 24),
                ..._allocations.map((a) => _reviewRow(
                      a.categoryName,
                      'K${(double.tryParse(a.amountText) ?? 0).toStringAsFixed(2)}',
                    )),
                const Divider(height: 24),
                _reviewRow('Total allocated',
                    'K${_allocatedTotal.toStringAsFixed(2)}'),
                _reviewRow('Remaining',
                    'K${_remaining.toStringAsFixed(2)}'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.primarySurface,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.verified_user_outlined,
                    color: AppColors.primary, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Activate to schedule automatic card funding. Money will be restricted to each expense category.',
                    style: TextStyle(fontSize: 12, color: Colors.grey[800]),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _reviewRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 13.5, color: Colors.grey[600])),
          Flexible(
            child: Text(value,
                textAlign: TextAlign.end,
                style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87)),
          ),
        ],
      ),
    );
  }

  // ── Bottom bar ────────────────────────────────────────────────
  Widget _buildBottomBar() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
        child: Row(
          children: [
            if (_step > 0)
              TextButton(
                onPressed: () => setState(() => _step -= 1),
                child: const Text('Back'),
              ),
            const Spacer(),
            Expanded(
              flex: 3,
              child: SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: _handleNext,
                  child: _creating || _activating
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : Text(_step == 0
                          ? 'Next: Add Expenses'
                          : _step == 1
                              ? 'Review Budget'
                              : 'Activate Budget'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleNext() {
    if (_step == 0) {
      if (_formKey.currentState?.validate() ?? false) {
        setState(() => _step = 1);
      }
    } else if (_step == 1) {
      _submit();
    } else {
      _activate();
    }
  }

  Widget _labeledField({required String label, required Widget child}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

class _Allocation {
  final String categoryId;
  final String categoryName;
  final String categoryIcon;
  final TextEditingController controller;

  _Allocation({
    required this.categoryId,
    required this.categoryName,
    required this.categoryIcon,
    String amountText = '',
  }) : controller = TextEditingController(text: amountText);

  String get amountText => controller.text;
}

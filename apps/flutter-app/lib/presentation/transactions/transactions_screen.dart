import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../core/providers/transaction_provider.dart';
import '../../core/services/auth_service.dart';
import '../common/app_colors.dart';
import '../common/app_widgets.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  String _searchQuery = '';
  String? _selectedType;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TransactionProvider>().fetchTransactions();
    });
  }

  @override
  Widget build(BuildContext context) {
    final txProvider = context.watch<TransactionProvider>();
    final filteredTransactions = _filterTransactions(txProvider.transactions);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Solid header with search
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
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
                  Text(
                    'Transactions',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${txProvider.transactions.length} total transactions',
                    style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13),
                  ),
                  const SizedBox(height: 16),
                  // Search bar
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: TextField(
                      onChanged: (v) => setState(() => _searchQuery = v),
                      decoration: InputDecoration(
                        hintText: 'Search transactions...',
                        hintStyle: TextStyle(color: Colors.grey[400]),
                        prefixIcon: const Icon(Icons.search, color: AppColors.primary, size: 22),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Filter chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildFilterChip('All', _selectedType == null, () {
                          setState(() => _selectedType = null);
                        }),
                        const SizedBox(width: 8),
                        _buildFilterChip('Income', _selectedType == 'income', () {
                          setState(() => _selectedType = 'income');
                        }),
                        const SizedBox(width: 8),
                        _buildFilterChip('Expenses', _selectedType == 'expense', () {
                          setState(() => _selectedType = 'expense');
                        }),
                        const SizedBox(width: 8),
                        _buildFilterChip('Transfers', _selectedType == 'transfer', () {
                          setState(() => _selectedType = 'transfer');
                        }),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Transaction list
          Expanded(
            child: txProvider.isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : RefreshIndicator(
                    onRefresh: () => txProvider.fetchTransactions(),
                    color: AppColors.primary,
                    child: filteredTransactions.isEmpty
                        ? EmptyState(
                            icon: Icons.receipt_long_outlined,
                            title: _searchQuery.isNotEmpty ? 'No Results Found' : 'No Transactions Yet',
                            subtitle: _searchQuery.isNotEmpty
                                ? 'Try a different search term'
                                : 'Tap + to add your first transaction',
                            actionText: _searchQuery.isEmpty ? 'Add Transaction' : null,
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
                            itemCount: filteredTransactions.length,
                            itemBuilder: (context, index) {
                              final tx = filteredTransactions[index];
                              return _buildTransactionTile(tx);
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
          onPressed: () => _showAddTransactionDialog(context),
          backgroundColor: Colors.transparent,
          elevation: 0,
          child: const Icon(Icons.add_rounded, color: Colors.white, size: 28),
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _filterTransactions(List<Map<String, dynamic>> transactions) {
    return transactions.where((tx) {
      final matchesSearch = _searchQuery.isEmpty ||
          (tx['description']?.toLowerCase().contains(_searchQuery.toLowerCase()) == true) ||
          (tx['category']?['name']?.toLowerCase().contains(_searchQuery.toLowerCase()) == true);
      final matchesType = _selectedType == null || tx['type'] == _selectedType;
      return matchesSearch && matchesType;
    }).toList();
  }

  Widget _buildFilterChip(String label, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.white.withOpacity(0.2),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? Colors.white : Colors.white.withOpacity(0.3),
            width: 1.5,
          ),
          boxShadow: isSelected
              ? [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 6)]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? AppColors.primary : Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildTransactionTile(Map<String, dynamic> tx) {
    final category = tx['category'];
    final isIncome = tx['type'] == 'income';
    final isTransfer = tx['type'] == 'transfer';
    final amount = double.tryParse(tx['amount'].toString()) ?? 0;
    final date = DateTime.tryParse(tx['transaction_date'] ?? '');

    final Color iconColor;
    if (isIncome) {
      iconColor = AppColors.incomeSolid;
    } else if (isTransfer) {
      iconColor = AppColors.blueSolid;
    } else {
      iconColor = AppColors.expenseSolid;
    }

    return Dismissible(
      key: Key(tx['id']),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        margin: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.expenseSolid,
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Icon(Icons.delete_outline, color: Colors.white, size: 26),
      ),
      confirmDismiss: (direction) async {
        return await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Text('Delete Transaction?'),
            content: const Text('This action cannot be undone.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Delete', style: TextStyle(color: AppColors.expense)),
              ),
            ],
          ),
        );
      },
      onDismissed: (_) {
        context.read<TransactionProvider>().deleteTransaction(tx['id']);
      },
      child: AppCard(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: iconColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                isIncome
                    ? Icons.arrow_upward_rounded
                    : isTransfer
                        ? Icons.swap_horiz_rounded
                        : Icons.arrow_downward_rounded,
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
                    tx['description'] ?? 'Transaction',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Text(
                        category?['name'] ?? 'Uncategorized',
                        style: TextStyle(color: Colors.grey[500], fontSize: 12),
                      ),
                      if (date != null) ...[
                        Text(
                          ' - ${DateFormat('dd MMM').format(date)}',
                          style: TextStyle(color: Colors.grey[400], fontSize: 12),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${isIncome ? '+' : isTransfer ? '' : '-'}K${amount.toStringAsFixed(2)}',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    color: isIncome
                        ? AppColors.income
                        : isTransfer
                            ? AppColors.transfer
                            : AppColors.expense,
                  ),
                ),
                if (tx['source'] != null)
                  Text(
                    tx['source'],
                    style: TextStyle(fontSize: 10, color: Colors.grey[400]),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showAddTransactionDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const AddTransactionSheet(),
    );
  }
}

class AddTransactionSheet extends StatefulWidget {
  const AddTransactionSheet({super.key});

  @override
  State<AddTransactionSheet> createState() => _AddTransactionSheetState();
}

class _AddTransactionSheetState extends State<AddTransactionSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _type = 'expense';
  DateTime _date = DateTime.now();
  String? _categoryId;
  List<Map<String, dynamic>> _categories = [];
  String? _budgetWarning;

  @override
  void initState() {
    super.initState();
    _loadCategories();
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
    } catch (_) {
      // Categories unavailable; amount-based auto-categorization still applies
    }
  }

  /// Live budget warning as the user types an expense amount.
  Future<void> _checkBudgetWarning() async {
    if (_type != 'expense') {
      if (mounted && _budgetWarning != null) setState(() => _budgetWarning = null);
      return;
    }
    final amount = double.tryParse(_amountController.text);
    if (amount == null || amount <= 0) {
      if (mounted && _budgetWarning != null) setState(() => _budgetWarning = null);
      return;
    }
    try {
      final auth = context.read<AuthService>();
      final response = await auth.api.getBudgets();
      final budgets = List<Map<String, dynamic>>.from(response['data'] ?? []);
      for (final b in budgets) {
        final limit = double.tryParse(b['amount']?.toString() ?? '0') ?? 0;
        final spent = double.tryParse(b['spent_amount']?.toString() ?? '0') ?? 0;
        final remaining = limit - spent;
        if (amount > remaining && remaining >= 0) {
          final name = b['category']?['name'] ?? 'overall';
          if (mounted) {
            setState(() => _budgetWarning =
                '⚠ This exceeds your $name budget — only K${remaining.toStringAsFixed(0)} left this period.');
          }
          return;
        }
      }
    } catch (_) {}
    if (mounted && _budgetWarning != null) setState(() => _budgetWarning = null);
  }

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
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Handle
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
            const Text(
              'Add Transaction',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 20),

            // Type selector
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  _buildTypeOption('expense', 'Expense', Icons.arrow_downward_rounded, AppColors.expenseSolid),
                  _buildTypeOption('income', 'Income', Icons.arrow_upward_rounded, AppColors.incomeSolid),
                  _buildTypeOption('transfer', 'Transfer', Icons.swap_horiz_rounded, AppColors.blueSolid),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Amount
            TextFormField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
              onChanged: (_) => _checkBudgetWarning(),
              decoration: InputDecoration(
                labelText: 'Amount (K)',
                prefixText: 'K ',
                prefixStyle: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: _type == 'income'
                      ? AppColors.income
                      : _type == 'transfer'
                          ? AppColors.transfer
                          : AppColors.expense,
                ),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Amount is required';
                if (double.tryParse(v) == null || double.parse(v) <= 0) return 'Enter a valid amount';
                return null;
              },
            ),
            if (_budgetWarning != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF3E0),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _budgetWarning!,
                  style: const TextStyle(color: AppColors.warning, fontSize: 12),
                ),
              ),
            ],
            const SizedBox(height: 16),

            // Description
            TextFormField(
              controller: _descriptionController,
              decoration: InputDecoration(
                labelText: 'Description',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (v) => v?.isNotEmpty == true ? null : 'Description is required',
            ),
            const SizedBox(height: 16),

            // Category picker (optional — auto-categorized if left out)
            DropdownButtonFormField<String>(
              value: _categoryId,
              isExpanded: true,
              decoration: InputDecoration(
                labelText: 'Category (auto if empty)',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              items: [
                const DropdownMenuItem<String>(
                  value: null,
                  child: Text('Auto-detect category', style: TextStyle(fontStyle: FontStyle.italic)),
                ),
                ..._categories.map((c) => DropdownMenuItem<String>(
                      value: c['id'] as String,
                      child: Text(c['name'] ?? 'Category'),
                    )),
              ],
              onChanged: (v) => setState(() => _categoryId = v),
            ),
            const SizedBox(height: 16),

            // Date
            GestureDetector(
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _date,
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now(),
                );
                if (picked != null) setState(() => _date = picked);
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
                      DateFormat('EEEE, dd MMMM yyyy').format(_date),
                      style: const TextStyle(fontSize: 14),
                    ),
                    const Icon(Icons.calendar_today, color: AppColors.primary, size: 20),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Save button
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: _handleSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text(
                  'Save Transaction',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeOption(String value, String label, IconData icon, Color color) {
    final isSelected = _type == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _type = value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? color : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isSelected
                ? [BoxShadow(color: color.withOpacity(0.3), blurRadius: 6)]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: isSelected ? Colors.white : Colors.grey[600], size: 18),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.grey[600],
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _handleSubmit() async {
    if (_formKey.currentState?.validate() != true) return;

    final success = await context.read<TransactionProvider>().createTransaction({
      'amount': double.parse(_amountController.text),
      'type': _type,
      'description': _descriptionController.text.trim(),
      if (_categoryId != null) 'category_id': _categoryId,
      'transaction_date': _date.toIso8601String(),
      'source': 'manual',
    });

    if (!mounted) return;
    if (success) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Transaction added successfully'),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not add transaction — a strict budget may have blocked it, or check your connection.'),
          backgroundColor: AppColors.expense,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }
}

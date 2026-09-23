import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/budget_provider.dart';
import '../../core/services/api_exception.dart';
import '../../core/services/auth_service.dart';
import '../common/app_colors.dart';

/// Link Card screen (onboarding gate).
///
/// Students link a **card** — no PayPal account needed. The card is vaulted
/// with PayPal (the processor); Student Kwacha never stores card numbers
/// or CVVs, only the brand, last 4 digits and expiry for display.
class LinkCardScreen extends StatefulWidget {
  const LinkCardScreen({super.key});

  @override
  State<LinkCardScreen> createState() => _LinkCardScreenState();
}

enum _LinkStep { intro, cardForm, processing, success }

class _LinkCardScreenState extends State<LinkCardScreen> {
  _LinkStep _step = _LinkStep.intro;
  final _formKey = GlobalKey<FormState>();
  final _cardNumberController = TextEditingController();
  final _cardholderController = TextEditingController();
  final _cvvController = TextEditingController();
  int _expMonth = 12;
  int _expYear = DateTime.now().year + 1;
  bool _submitting = false;

  @override
  void dispose() {
    _cardNumberController.dispose();
    _cardholderController.dispose();
    _cvvController.dispose();
    super.dispose();
  }

  Future<void> _linkCard() async {
    if (_formKey.currentState?.validate() != true) return;

    setState(() => _submitting = true);
    try {
      final auth = context.read<AuthService>();
      final api = context.read<BudgetProvider>();
      await auth.api.linkCard(
        cardNumber: _cardNumberController.text.replaceAll(' ', ''),
        expMonth: _expMonth,
        expYear: _expYear,
        cvv: _cvvController.text.trim(),
        cardholderName: _cardholderController.text.trim(),
      );

      // Open the onboarding gate + refresh feature state
      await auth.markPaymentMethodConnected();
      await api.fetchPaymentMethods();
      await api.fetchFundingStatus();

      if (mounted) setState(() => _step = _LinkStep.success);
    } on ApiException catch (e) {
      if (mounted) _snack(e.displayMessage);
    } catch (e) {
      if (mounted) _snack('Could not link card: $e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    // When the gate requires this screen, back can't skip onboarding
    final isGated = auth.isAuthenticated && !auth.isPaymentMethodConnected;
    final modeLabel = switch (auth.paymentMode) {
      'sandbox' => 'Secured by PayPal (Sandbox)',
      'live' => 'Secured by PayPal',
      _ => 'Demo mode — Secured by PayPal (Sandbox ready)',
    };

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor:
            _step == _LinkStep.intro ? AppColors.heroSolid : AppColors.background,
        elevation: 0,
        // When gated, back can't skip onboarding
        automaticallyImplyLeading: !isGated || _step != _LinkStep.intro,
        leading: (_step != _LinkStep.intro || !isGated)
            ? BackButton(onPressed: () {
                if (_step == _LinkStep.cardForm) {
                  setState(() => _step = _LinkStep.intro);
                } else if (_step == _LinkStep.success) {
                  context.go('/');
                } else if (!isGated) {
                  context.pop();
                }
              })
            : null,
      ),
      body: switch (_step) {
        _LinkStep.intro => _buildIntro(context, isGated, modeLabel),
        _LinkStep.cardForm => _buildCardForm(context),
        _LinkStep.processing => _buildCardForm(context),
        _LinkStep.success => _buildSuccess(context),
      },
    );
  }

  // ── Intro ─────────────────────────────────────────────────────
  Widget _buildIntro(BuildContext context, bool isGated, String modeLabel) {
    return Container(
      decoration: const BoxDecoration(color: AppColors.heroSolid),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            children: [
              const Spacer(),
              Container(
                width: 110,
                height: 110,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.15),
                      blurRadius: 24,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: const Icon(Icons.credit_card_rounded,
                    size: 54, color: AppColors.primary),
              ),
              const SizedBox(height: 32),
              const Text(
                'Link Your Card',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                isGated
                    ? 'One step before you start: link a debit or credit card so your budgets can be funded automatically on the dates you choose. No PayPal account needed.'
                    : 'Link a debit or credit card to fund your budgets automatically. No PayPal account needed.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.75),
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
              const Spacer(),
              // Trust indicators
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _trustChip(Icons.lock_outline, 'Encrypted'),
                  const SizedBox(width: 8),
                  _trustChip(Icons.shield_outlined, 'PCI-DSS'),
                  const SizedBox(width: 8),
                  _trustChip(Icons.verified_rounded, 'Secure vault'),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                modeLabel,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.6),
                  fontSize: 11,
                ),
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton.icon(
                  onPressed: () => setState(() => _step = _LinkStep.cardForm),
                  icon: const Icon(Icons.credit_card),
                  label: const Text('Link a Card'),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _trustChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: Colors.white),
          const SizedBox(width: 5),
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 11)),
        ],
      ),
    );
  }

  // ── Card form ─────────────────────────────────────────────────
  Widget _buildCardForm(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Enter card details',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              'Your card is vaulted securely with PayPal. We never see or store your full card number.',
              style: TextStyle(color: Colors.grey[600], fontSize: 12.5, height: 1.4),
            ),
            const SizedBox(height: 24),
            // Card preview
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.heroSolid, AppColors.heroSolid.withOpacity(0.8)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.credit_card, color: Colors.white70, size: 32),
                  const SizedBox(height: 14),
                  Text(
                    _cardNumberController.text.isEmpty
                        ? '•••• •••• •••• ••••'
                        : _maskCard(_cardNumberController.text),
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.5),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _cardholderController.text.isEmpty
                            ? 'CARDHOLDER NAME'
                            : _cardholderController.text.toUpperCase(),
                        style: const TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                      Text(
                        '$_expMonth/$_expYear',
                        style: const TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            TextFormField(
              controller: _cardNumberController,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(16),
                _CardNumberFormatter(),
              ],
              decoration: InputDecoration(
                labelText: 'Card number',
                hintText: '4242 4242 4242 4242',
                prefixIcon: const Icon(Icons.credit_card),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onChanged: (_) => setState(() {}),
              validator: (v) {
                final digits = (v ?? '').replaceAll(' ', '');
                if (digits.isEmpty) return 'Card number is required';
                if (digits.length < 13) return 'Card number looks too short';
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _cardholderController,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(
                labelText: 'Cardholder name',
                hintText: 'MAPALO BANDA',
                prefixIcon: const Icon(Icons.person_outline),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onChanged: (_) => setState(() {}),
              validator: (v) =>
                  (v ?? '').trim().length >= 2 ? null : 'Cardholder name is required',
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                // Expiry month
                Expanded(
                  child: DropdownButtonFormField<int>(
                    value: _expMonth,
                    decoration: InputDecoration(
                      labelText: 'Month',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    items: List.generate(12, (i) => i + 1)
                        .map((m) => DropdownMenuItem(
                              value: m,
                              child: Text(m.toString().padLeft(2, '0')),
                            ))
                        .toList(),
                    onChanged: (v) => setState(() => _expMonth = v!),
                  ),
                ),
                const SizedBox(width: 12),
                // Expiry year
                Expanded(
                  child: DropdownButtonFormField<int>(
                    value: _expYear,
                    decoration: InputDecoration(
                      labelText: 'Year',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    items: List.generate(15, (i) => DateTime.now().year + i)
                        .map((y) => DropdownMenuItem(value: y, child: Text('$y')))
                        .toList(),
                    onChanged: (v) => setState(() => _expYear = v!),
                  ),
                ),
                const SizedBox(width: 12),
                // CVV
                Expanded(
                  child: TextFormField(
                    controller: _cvvController,
                    keyboardType: TextInputType.number,
                    obscureText: true,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(4),
                    ],
                    decoration: InputDecoration(
                      labelText: 'CVV',
                      hintText: '123',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    validator: (v) =>
                        (v ?? '').length >= 3 ? null : 'CVV required',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Demo tip: any Luhn-valid number works, e.g. 4242 4242 4242 4242.',
              style: TextStyle(color: Colors.grey[500], fontSize: 11),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: _submitting ? null : _linkCard,
                child: _submitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Link Card Securely'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _maskCard(String number) {
    final digits = number.replaceAll(' ', '');
    final buff = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      buff.write(digits[i]);
      if ((i + 1) % 4 == 0 && i + 1 < digits.length) buff.write(' ');
    }
    return buff.toString();
  }

  // ── Success ───────────────────────────────────────────────────
  Widget _buildSuccess(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 96,
            height: 96,
            decoration: const BoxDecoration(
                color: AppColors.primarySurface, shape: BoxShape.circle),
            child: const Icon(Icons.check_circle_rounded,
                color: AppColors.primary, size: 52),
          ),
          const SizedBox(height: 24),
          const Text(
            'Card Linked',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Text(
            'You can now create budgets that are funded automatically from your card on your chosen dates.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey[600], fontSize: 14, height: 1.5),
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: () => context.go('/budgets/create'),
              child: const Text('Create Your First Budget'),
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => context.go('/'),
            child: const Text('Go to Dashboard'),
          ),
        ],
      ),
    );
  }
}

/// Formats card numbers in groups of 4: "4242 4242 4242 4242".
class _CardNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(' ', '');
    final buff = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      buff.write(digits[i]);
      if ((i + 1) % 4 == 0 && i + 1 < digits.length) buff.write(' ');
    }
    final text = buff.toString();
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

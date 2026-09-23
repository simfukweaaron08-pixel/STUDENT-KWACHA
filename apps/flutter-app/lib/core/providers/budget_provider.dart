import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/api_exception.dart';
import '../services/auth_service.dart';

class BudgetProvider extends ChangeNotifier {
  List<Map<String, dynamic>> _budgets = [];
  Map<String, dynamic>? _fundingStatus;
  List<Map<String, dynamic>> _paymentMethods = [];
  bool _isLoading = false;
  AuthService? _auth;

  List<Map<String, dynamic>> get budgets => _budgets;
  Map<String, dynamic>? get fundingStatus => _fundingStatus;
  List<Map<String, dynamic>> get paymentMethods => _paymentMethods;
  bool get hasPaymentMethod => _paymentMethods.any((pm) => pm['status'] == 'active');
  bool get isLoading => _isLoading;

  void update(AuthService auth) {
    _auth = auth;
    if (auth.isAuthenticated) {
      fetchBudgets();
      fetchFundingStatus();
      fetchPaymentMethods();
    }
  }

  ApiService get _api => _auth!.api;

  Future<void> fetchBudgets() async {
    if (_auth == null || !_auth!.isAuthenticated) return;
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.getBudgets();
      _budgets = List<Map<String, dynamic>>.from(response['data'] ?? []);
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  /// Funding overview: due / failed / upcoming + funds held for budgets.
  Future<void> fetchFundingStatus() async {
    if (_auth == null || !_auth!.isAuthenticated) return;
    try {
      final response = await _api.getFundingStatus();
      _fundingStatus = response['data'];
      notifyListeners();
    } catch (_) {
      _fundingStatus = null;
    }
  }

  /// Linked cards (for gating budget creation).
  Future<void> fetchPaymentMethods() async {
    if (_auth == null || !_auth!.isAuthenticated) return;
    try {
      final response = await _api.getPaymentMethods();
      _paymentMethods = List<Map<String, dynamic>>.from(response['data'] ?? []);
      notifyListeners();
    } catch (_) {
      _paymentMethods = [];
    }
  }

  Future<bool> createBudget(Map<String, dynamic> data) async {
    if (_auth == null || !_auth!.isAuthenticated) return false;
    try {
      await _api.createBudget(data);
      await fetchBudgets();
      await fetchFundingStatus();
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Confirm & activate: schedules the PayPal funding.
  Future<String?> activateBudget(String id) async {
    if (_auth == null || !_auth!.isAuthenticated) return 'Not signed in';
    try {
      await _api.activateBudget(id);
      await fetchBudgets();
      await fetchFundingStatus();
      return null;
    } catch (e) {
      return ApiException.from(e).displayMessage;
    }
  }

  /// Retry a failed PayPal funding charge.
  Future<String?> retryFunding(String id) async {
    if (_auth == null || !_auth!.isAuthenticated) return 'Not signed in';
    try {
      await _api.retryBudgetFunding(id);
      await fetchBudgets();
      await fetchFundingStatus();
      return null;
    } catch (e) {
      return ApiException.from(e).displayMessage;
    }
  }

  Future<bool> deleteBudget(String id) async {
    if (_auth == null || !_auth!.isAuthenticated) return false;
    try {
      await _api.deleteBudget(id);
      _budgets.removeWhere((b) => b['id'] == id);
      notifyListeners();
      await fetchFundingStatus();
      return true;
    } catch (_) {
      return false;
    }
  }
}

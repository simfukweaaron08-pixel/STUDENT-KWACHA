import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class TransactionProvider extends ChangeNotifier {
  List<Map<String, dynamic>> _transactions = [];
  Map<String, dynamic>? _pagination;
  Map<String, dynamic>? _summary;
  bool _isLoading = false;
  AuthService? _auth;

  List<Map<String, dynamic>> get transactions => _transactions;
  Map<String, dynamic>? get pagination => _pagination;
  Map<String, dynamic>? get summary => _summary;
  bool get isLoading => _isLoading;

  void update(AuthService auth) {
    _auth = auth;
    if (auth.isAuthenticated) fetchTransactions();
  }

  ApiService get _api => _auth!.api;

  Future<void> fetchTransactions({Map<String, dynamic>? params}) async {
    if (_auth == null || !_auth!.isAuthenticated) return;
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.getTransactions(params: params);
      _transactions = List<Map<String, dynamic>>.from(response['data']);
      _pagination = response['pagination'];
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchSummary({String? startDate, String? endDate}) async {
    if (_auth == null || !_auth!.isAuthenticated) return;

    try {
      final response = await _api.getTransactionSummary(
        startDate: startDate,
        endDate: endDate,
      );
      _summary = response['data'];
      notifyListeners();
    } catch (_) {}
  }

  Future<bool> createTransaction(Map<String, dynamic> data) async {
    if (_auth == null || !_auth!.isAuthenticated) return false;
    try {
      await _api.createTransaction(data);
      await fetchTransactions();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> deleteTransaction(String id) async {
    if (_auth == null || !_auth!.isAuthenticated) return false;
    try {
      await _api.deleteTransaction(id);
      _transactions.removeWhere((t) => t['id'] == id);
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }
}

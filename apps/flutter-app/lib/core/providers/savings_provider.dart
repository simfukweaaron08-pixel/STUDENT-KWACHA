import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class SavingsProvider extends ChangeNotifier {
  List<Map<String, dynamic>> _goals = [];
  bool _isLoading = false;
  AuthService? _auth;

  List<Map<String, dynamic>> get goals => _goals;
  bool get isLoading => _isLoading;

  void update(AuthService auth) {
    _auth = auth;
    if (auth.isAuthenticated) fetchGoals();
  }

  ApiService get _api => _auth!.api;

  Future<void> fetchGoals() async {
    if (_auth == null || !_auth!.isAuthenticated) return;
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.getSavingsGoals();
      _goals = List<Map<String, dynamic>>.from(response['data']);
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> createGoal(Map<String, dynamic> data) async {
    if (_auth == null || !_auth!.isAuthenticated) return false;
    try {
      await _api.createSavingsGoal(data);
      await fetchGoals();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> addEntry(String goalId, Map<String, dynamic> data) async {
    if (_auth == null || !_auth!.isAuthenticated) return false;
    try {
      await _api.addSavingsEntry(goalId, data);
      await fetchGoals();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<Map<String, dynamic>?> getPrediction(String goalId) async {
    if (_auth == null || !_auth!.isAuthenticated) return null;
    try {
      final response = await _api.getSavingsPrediction(goalId);
      return response['data'];
    } catch (_) {
      return null;
    }
  }
}

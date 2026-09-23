import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class DashboardProvider extends ChangeNotifier {
  Map<String, dynamic>? _dashboardData;
  List<Map<String, dynamic>> _insights = [];
  Map<String, dynamic>? _fundingStatus;
  bool _isLoading = false;
  AuthService? _auth;

  Map<String, dynamic>? get dashboardData => _dashboardData;
  List<Map<String, dynamic>> get insights => _insights;
  Map<String, dynamic>? get fundingStatus => _fundingStatus;
  bool get isLoading => _isLoading;

  void update(AuthService auth) {
    _auth = auth;
    if (auth.isAuthenticated) fetchDashboard();
  }

  ApiService get _api => _auth!.api;

  Future<void> fetchDashboard() async {
    if (_auth == null || !_auth!.isAuthenticated) return;
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.getDashboard();
      _dashboardData = response['data'];

      final insightsResponse = await _api.getInsights();
      _insights = List<Map<String, dynamic>>.from(insightsResponse['data'] ?? []);
    } catch (_) {}

    try {
      final fundingResponse = await _api.getFundingStatus();
      _fundingStatus = fundingResponse['data'];
    } catch (_) {
      _fundingStatus = null;
    }

    _isLoading = false;
    notifyListeners();
  }
}

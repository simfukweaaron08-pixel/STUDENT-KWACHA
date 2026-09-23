import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_service.dart';
import 'api_exception.dart';

class AuthService extends ChangeNotifier {
  final ApiService _api = ApiService();
  bool _isAuthenticated = false;
  Map<String, dynamic>? _user;
  bool _isLoading = false;
  ApiException? _lastError;

  /// Whether the student has linked a card (onboarding gate).
  bool _paymentMethodConnected = false;
  String _paymentMode = 'simulated';
  bool _onboardingChecked = false;

  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  ApiException? get error => _lastError;
  ApiService get api => _api;

  /// True once the onboarding status has been fetched for this session.
  bool get onboardingChecked => _onboardingChecked;

  /// Whether a card is linked — the app requires this before use.
  bool get isPaymentMethodConnected => _paymentMethodConnected;

  /// 'sandbox' | 'simulated' | 'live'
  String get paymentMode => _paymentMode;

  AuthService() {
    _loadSavedAuth();
  }

  /// Fetch the card-link onboarding gate status. Safe to call repeatedly.
  Future<void> checkOnboardingStatus() async {
    if (!_isAuthenticated) return;
    try {
      final response = await _api.getOnboardingStatus();
      final data = response['data'];
      _paymentMethodConnected = data?['payment_method_connected'] == true;
      _paymentMode = data?['payment_mode'] ?? 'simulated';
      _onboardingChecked = true;
    } catch (_) {
      // Network/API failure: don't lock the user out, just retry next time
      _onboardingChecked = true;
    }
    notifyListeners();
  }

  /// Called after the student links a card so the gate opens immediately.
  Future<void> markPaymentMethodConnected() async {
    _paymentMethodConnected = true;
    _onboardingChecked = true;
    notifyListeners();
    await checkOnboardingStatus();
  }

  Future<void> _loadSavedAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final accessToken = prefs.getString('access_token');
    final refreshToken = prefs.getString('refresh_token');

    if (accessToken != null && refreshToken != null) {
      _api.setTokens(accessToken: accessToken, refreshToken: refreshToken);
      try {
        await _fetchProfile();
        _isAuthenticated = true;
        // Onboarding gate for returning users (existing users without
        // card get prompted)
        await checkOnboardingStatus();
      } catch (_) {
        _isAuthenticated = false;
        _api.clearTokens();
      }
      notifyListeners();
    }
  }

  Future<void> _fetchProfile() async {
    final response = await _api.getProfile();
    _user = response['data'];
    notifyListeners();
  }

  Future<bool> login({required String email, required String password}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.login(email: email, password: password);
      if (response['success']) {
        final data = response['data'];
        _api.setTokens(
          accessToken: data['accessToken'],
          refreshToken: data['refreshToken'],
        );

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', data['accessToken']);
        await prefs.setString('refresh_token', data['refreshToken']);

        _user = data['user'];
        _isAuthenticated = true;
        _lastError = null;
        notifyListeners();
        return true;
      }
    } catch (e) {
      _lastError = ApiException.from(e);
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> register({
    required String email,
    required String fullName,
    String? phoneNumber,
    required String password,
    required String confirmPassword,
    String? institution,
    String? studentId,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.register(
        email: email,
        fullName: fullName,
        phoneNumber: phoneNumber,
        password: password,
        confirmPassword: confirmPassword,
        institution: institution,
        studentId: studentId,
      );
      if (response['success']) {
        final data = response['data'];
        _api.setTokens(
          accessToken: data['accessToken'],
          refreshToken: data['refreshToken'],
        );

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', data['accessToken']);
        await prefs.setString('refresh_token', data['refreshToken']);

        _user = data['user'];
        _isAuthenticated = true;
        _lastError = null;
        notifyListeners();

        // Onboarding gate: check card status right after auth
        await checkOnboardingStatus();

        return true;
      }
    } catch (e) {
      _lastError = ApiException.from(e);
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> logout() async {
    await _api.logout();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');

    _isAuthenticated = false;
    _user = null;
    _paymentMethodConnected = false;
    _onboardingChecked = false;
    notifyListeners();
  }
}

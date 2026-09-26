import 'package:dio/dio.dart';

import 'api_exception.dart';

class ApiService {
  /// Base URL of the backend API.
  ///
  /// Override at launch without editing code:
  ///   flutter run --dart-define=API_BASE_URL=http://<host>:<port>/api/v1
  ///
  /// Defaults: physical device on the LAN -> the dev machine's IP (port 3300
  /// matches PORT in apps/backend-api/.env); Android emulator -> 10.0.2.2.
  static const String _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://192.168.0.189:3300/api/v1',
  );
  late final Dio _dio;
  String? _accessToken;
  String? _refreshToken;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_accessToken != null) {
          options.headers['Authorization'] = 'Bearer $_accessToken';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401 && _refreshToken != null) {
          try {
            final refreshed = await _refreshAccessToken();
            if (refreshed) {
              error.requestOptions.headers['Authorization'] = 'Bearer $_accessToken';
              final response = await _dio.fetch(error.requestOptions);
              return handler.resolve(response);
            }
          } catch (_) {
            // Refresh failed, proceed with original error
          }
        }
        handler.next(error);
      },
    ));
  }

  void setTokens({required String accessToken, required String refreshToken}) {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
  }

  void clearTokens() {
    _accessToken = null;
    _refreshToken = null;
  }

  Future<bool> _refreshAccessToken() async {
    try {
      final response = await _dio.post('/auth/refresh', data: {
        'refresh_token': _refreshToken,
      });
      if (response.statusCode == 200) {
        final data = response.data['data'];
        _accessToken = data['accessToken'];
        _refreshToken = data['refreshToken'];
        return true;
      }
    } catch (_) {}
    return false;
  }

  // ── Auth ──
  Future<Map<String, dynamic>> register({
    required String email,
    required String fullName,
    String? phoneNumber,
    required String password,
    required String confirmPassword,
    String? institution,
    String? studentId,
  }) async {
    final response = await _dio.post('/auth/register', data: {
      'email': email,
      'full_name': fullName,
      'phone_number': phoneNumber,
      'password': password,
      'confirm_password': confirmPassword,
      if (institution != null) 'institution': institution,
      if (studentId != null) 'student_id': studentId,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return response.data;
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } catch (_) {}
    clearTokens();
  }

  // ── Profile ──
  Future<Map<String, dynamic>> getProfile() async {
    final response = await _dio.get('/users/me');
    return response.data;
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    final response = await _dio.put('/users/me', data: data);
    return response.data;
  }

  // ── Transactions ──
  Future<Map<String, dynamic>> getTransactions({Map<String, dynamic>? params}) async {
    final response = await _dio.get('/transactions', queryParameters: params);
    return response.data;
  }

  Future<Map<String, dynamic>> createTransaction(Map<String, dynamic> data) async {
    final response = await _dio.post('/transactions', data: data);
    return response.data;
  }

  Future<Map<String, dynamic>> updateTransaction(String id, Map<String, dynamic> data) async {
    final response = await _dio.put('/transactions/$id', data: data);
    return response.data;
  }

  Future<void> deleteTransaction(String id) async {
    await _dio.delete('/transactions/$id');
  }

  Future<Map<String, dynamic>> getTransactionSummary({String? startDate, String? endDate}) async {
    final response = await _dio.get('/transactions/summary', queryParameters: {
      if (startDate != null) 'start_date': startDate,
      if (endDate != null) 'end_date': endDate,
    });
    return response.data;
  }

  // ── Categories ──
  Future<Map<String, dynamic>> getCategories() async {
    final response = await _dio.get('/categories');
    return response.data;
  }

  // ── Budgets ──
  Future<Map<String, dynamic>> getBudgets() async {
    final response = await _dio.get('/budgets');
    return response.data;
  }

  Future<Map<String, dynamic>> createBudget(Map<String, dynamic> data) async {
    final response = await _dio.post('/budgets', data: data);
    return response.data;
  }

  /// Confirm & activate a budget (schedules funding).
  Future<Map<String, dynamic>> activateBudget(String id) async {
    final response = await _dio.post('/budgets/$id/activate');
    return response.data;
  }

  /// Retry a failed funding attempt (card charge).
  Future<Map<String, dynamic>> retryBudgetFunding(String id) async {
    final response = await _dio.post('/budgets/$id/retry-funding');
    return response.data;
  }

  /// Funding overview for the dashboard (due/failed/upcoming + held funds).
  Future<Map<String, dynamic>> getFundingStatus() async {
    final response = await _dio.get('/budgets/funding-status');
    return response.data;
  }

  Future<Map<String, dynamic>> updateBudget(String id, Map<String, dynamic> data) async {
    final response = await _dio.put('/budgets/$id', data: data);
    return response.data;
  }

  Future<void> deleteBudget(String id) async {
    await _dio.delete('/budgets/$id');
  }

  // ── Savings ──
  Future<Map<String, dynamic>> getSavingsGoals() async {
    final response = await _dio.get('/savings');
    return response.data;
  }

  Future<Map<String, dynamic>> createSavingsGoal(Map<String, dynamic> data) async {
    final response = await _dio.post('/savings', data: data);
    return response.data;
  }

  Future<Map<String, dynamic>> addSavingsEntry(String goalId, Map<String, dynamic> data) async {
    final response = await _dio.post('/savings/$goalId/entries', data: data);
    return response.data;
  }

  Future<Map<String, dynamic>> getSavingsPrediction(String goalId) async {
    final response = await _dio.get('/savings/$goalId/predictions');
    return response.data;
  }

  // ── Analytics ──
  Future<Map<String, dynamic>> getDashboard() async {
    final response = await _dio.get('/analytics/dashboard');
    return response.data;
  }

  Future<Map<String, dynamic>> getMonthlyComparison({int months = 6}) async {
    final response = await _dio.get('/analytics/monthly-comparison', queryParameters: {'months': months});
    return response.data;
  }

  Future<Map<String, dynamic>> getCategoryBreakdown({String? startDate, String? endDate}) async {
    final response = await _dio.get('/analytics/category-breakdown', queryParameters: {
      if (startDate != null) 'start_date': startDate,
      if (endDate != null) 'end_date': endDate,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> getSpendingTrends({int months = 12}) async {
    final response = await _dio.get('/analytics/trends', queryParameters: {'months': months});
    return response.data;
  }

  // ── Insights ──
  Future<Map<String, dynamic>> getInsights() async {
    final response = await _dio.get('/insights/tips');
    return response.data;
  }

  // ── Notifications ──
  Future<Map<String, dynamic>> getNotifications({int page = 1}) async {
    final response = await _dio.get('/notifications', queryParameters: {'page': page});
    return response.data;
  }

  Future<void> markNotificationRead(String id) async {
    await _dio.put('/notifications/$id/read');
  }

  Future<void> markAllNotificationsRead() async {
    await _dio.put('/notifications/read-all');
  }

  Future<void> createCategory(Map<String, dynamic> data) async {
    await _dio.post('/categories', data: data);
  }

  // ── Budget alerts & ML overspending prediction ──
  Future<Map<String, dynamic>> getBudgetAlerts() async {
    final response = await _dio.get('/budgets/alerts');
    return response.data;
  }

  Future<Map<String, dynamic>> getBudgetPrediction() async {
    final response = await _dio.get('/budgets/prediction');
    return response.data;
  }

  // ── Wallet / Payments ──
  Future<Map<String, dynamic>> getWallet() async {
    final response = await _dio.get('/wallet');
    return response.data;
  }

  Future<Map<String, dynamic>> payFromWallet(Map<String, dynamic> data) async {
    final response = await _dio.post('/wallet/pay', data: data);
    return response.data;
  }

  Future<Map<String, dynamic>> getWalletTransactions({int page = 1}) async {
    final response = await _dio.get('/wallet/transactions', queryParameters: {'page': page});
    return response.data;
  }

  Future<Map<String, dynamic>> updateWalletLimits(Map<String, dynamic> data) async {
    final response = await _dio.put('/wallet/limits', data: data);
    return response.data;
  }

  // ── Payment Methods (cards, vaulted via PayPal) ──

  /// Onboarding gate: whether a card is linked + current payment mode.
  Future<Map<String, dynamic>> getOnboardingStatus() async {
    final response = await _dio.get('/payment-methods/onboarding-status');
    return response.data;
  }

  Future<Map<String, dynamic>> getPaymentMethods() async {
    final response = await _dio.get('/payment-methods');
    return response.data;
  }

  /// Link a card (vaulted with PayPal — no PayPal account needed).
  /// Link a card. Throws [ApiException] with the backend's real message
  /// (e.g. validation details, provider errors) instead of a raw DioException.
  Future<Map<String, dynamic>> linkCard({
    required String cardNumber,
    required int expMonth,
    required int expYear,
    required String cvv,
    required String cardholderName,
  }) async {
    try {
      final response = await _dio.post('/payment-methods/link-card', data: {
        'card_number': cardNumber,
        'exp_month': expMonth,
        'exp_year': expYear,
        'cvv': cvv,
        'cardholder_name': cardholderName,
      });
      return response.data;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<void> setDefaultPaymentMethod(String id) async {
    await _dio.put('/payment-methods/$id/default');
  }

  Future<void> disconnectPaymentMethod(String id) async {
    await _dio.delete('/payment-methods/$id');
  }

}

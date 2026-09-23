import 'package:flutter/material.dart';
import '../services/auth_service.dart';

/// Convenience wrapper that exposes [AuthService] state through a
/// [ChangeNotifierProvider]-compatible interface. Currently a thin
/// delegate — extend as needed.
class AuthProvider extends ChangeNotifier {
  final AuthService _authService;

  AuthProvider({AuthService? authService})
      : _authService = authService ?? AuthService();

  AuthService get authService => _authService;
  bool get isAuthenticated => _authService.isAuthenticated;
  Map<String, dynamic>? get user => _authService.user;
  bool get isLoading => _authService.isLoading;
}

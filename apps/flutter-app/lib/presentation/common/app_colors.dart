import 'package:flutter/material.dart';

/// App-wide color palette
class AppColors {
  // Primary palette
  static const Color primary = Color(0xFF1B5E20);
  static const Color primaryLight = Color(0xFF4CAF50);
  static const Color primaryDark = Color(0xFF0D3311);
  static const Color primarySurface = Color(0xFFE8F5E9);

  // Accent colors
  static const Color accent = Color(0xFF00C853);
  static const Color accentBlue = Color(0xFF2196F3);
  static const Color accentOrange = Color(0xFFFF9800);

  // Semantic colors
  static const Color income = Color(0xFF2E7D32);
  static const Color expense = Color(0xFFC62828);
  static const Color transfer = Color(0xFF1565C0);
  static const Color savings = Color(0xFF0277BD);
  static const Color warning = Color(0xFFFF6F00);
  static const Color success = Color(0xFF2E7D32);

  // Background
  static const Color background = Color(0xFFF5F7FA);
  static const Color surface = Colors.white;
  static const Color cardBorder = Color(0xFFE0E0E0);

  // Solid color replacements for former gradients
  static const Color primarySolid = Color(0xFF1B5E20);
  static const Color heroSolid = Color(0xFF0D3311);
  static const Color incomeSolid = Color(0xFF1B5E20);
  static const Color expenseSolid = Color(0xFFB71C1C);
  static const Color blueSolid = Color(0xFF0D47A1);
  static const Color orangeSolid = Color(0xFFE65100);
  static const Color purpleSolid = Color(0xFF4A148C);
  static const Color darkSolid = Color(0xFF212121);
  static const Color cardSolid = Colors.white;
  static const Color savingsSolid = Color(0xFF01579B);
  static const Color analyticsSolid = Color(0xFF4A148C);

  // Chart colors
  static const List<Color> chartColors = [
    Color(0xFFFF6F00),
    Color(0xFF00897B),
    Color(0xFF1565C0),
    Color(0xFF6A1B9A),
    Color(0xFFF9A825),
    Color(0xFFC62828),
    Color(0xFF283593),
    Color(0xFF2E7D32),
  ];
}

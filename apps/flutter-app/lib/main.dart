import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'app/app.dart' show StudentKwachaApp, authService;
import 'core/services/api_service.dart';
import 'core/services/auth_service.dart';
import 'core/services/storage_service.dart';
import 'core/providers/transaction_provider.dart';
import 'core/providers/budget_provider.dart';
import 'core/providers/savings_provider.dart';
import 'core/providers/dashboard_provider.dart';
import 'core/providers/wallet_provider.dart';
import 'core/providers/notification_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Hive for offline storage
  await Hive.initFlutter();
  await Hive.openBox('settings');
  await Hive.openBox('transactions');
  await Hive.openBox('budgets');
  await Hive.openBox('savings');
  await Hive.openBox('categories');
  await Hive.openBox('pending_sync');

  runApp(
    MultiProvider(
      providers: [
        // Core services
        Provider(create: (_) => StorageService()),
        Provider(create: (_) => ApiService()),
        // Shared app-lifetime instance — also drives the router's onboarding gate
        ChangeNotifierProvider<AuthService>.value(value: authService),

        // Feature providers
        ChangeNotifierProxyProvider<AuthService, TransactionProvider>(
          create: (_) => TransactionProvider(),
          update: (_, auth, tx) => tx!..update(auth),
        ),
        ChangeNotifierProxyProvider<AuthService, BudgetProvider>(
          create: (_) => BudgetProvider(),
          update: (_, auth, bp) => bp!..update(auth),
        ),
        ChangeNotifierProxyProvider<AuthService, SavingsProvider>(
          create: (_) => SavingsProvider(),
          update: (_, auth, sp) => sp!..update(auth),
        ),
        ChangeNotifierProxyProvider<AuthService, DashboardProvider>(
          create: (_) => DashboardProvider(),
          update: (_, auth, dp) => dp!..update(auth),
        ),
        ChangeNotifierProxyProvider<AuthService, WalletProvider>(
          create: (_) => WalletProvider(),
          update: (_, auth, wp) => wp!..update(auth),
        ),
        ChangeNotifierProxyProvider<AuthService, NotificationProvider>(
          create: (_) => NotificationProvider(),
          update: (_, auth, np) => np!..update(auth),
        ),
      ],
      child: const StudentKwachaApp(),
    ),
  );
}

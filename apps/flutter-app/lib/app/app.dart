import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/services/auth_service.dart';
import '../presentation/auth/login_screen.dart';
import '../presentation/auth/register_screen.dart';
import '../presentation/dashboard/dashboard_screen.dart';
import '../presentation/transactions/transactions_screen.dart';
import '../presentation/budgets/budgets_screen.dart';
import '../presentation/savings/savings_screen.dart';
import '../presentation/analytics/analytics_screen.dart';
import '../presentation/settings/settings_screen.dart';
import '../presentation/wallet/wallet_screen.dart';
import '../presentation/notifications/notifications_screen.dart';
import '../presentation/payments/link_card_screen.dart';
import '../presentation/budgets/create_budget_flow_screen.dart';
import '../presentation/common/main_scaffold.dart';

/// Single app-lifetime auth instance, shared by the router gate and the
/// widget tree (registered via ChangeNotifierProvider.value in main.dart).
final AuthService authService = AuthService();

class StudentKwachaApp extends StatelessWidget {
  const StudentKwachaApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Set status bar style globally
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ));

    return MaterialApp.router(
      title: 'Student Kwacha',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1B5E20),
          brightness: Brightness.light,
          primary: const Color(0xFF1B5E20),
          onPrimary: Colors.white,
          primaryContainer: const Color(0xFFE8F5E9),
          onPrimaryContainer: const Color(0xFF1B5E20),
          secondary: const Color(0xFF00C853),
          surface: Colors.white,
          surfaceContainerLowest: const Color(0xFFF5F7FA),
        ),
        scaffoldBackgroundColor: const Color(0xFFF5F7FA),
        textTheme: GoogleFonts.interTextTheme().copyWith(
          headlineLarge: GoogleFonts.inter(
            fontSize: 28,
            fontWeight: FontWeight.w800,
            color: Colors.black87,
          ),
          headlineMedium: GoogleFonts.inter(
            fontSize: 24,
            fontWeight: FontWeight.w700,
            color: Colors.black87,
          ),
          headlineSmall: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: Colors.black87,
          ),
          titleLarge: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Colors.black87,
          ),
          titleMedium: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
          bodyLarge: GoogleFonts.inter(
            fontSize: 16,
            color: Colors.black54,
          ),
          bodyMedium: GoogleFonts.inter(
            fontSize: 14,
            color: Colors.black54,
          ),
        ),
        appBarTheme: AppBarTheme(
          centerTitle: true,
          elevation: 0,
          scrolledUnderElevation: 1,
          backgroundColor: const Color(0xFFF5F7FA),
          foregroundColor: Colors.black87,
          titleTextStyle: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Colors.black87,
          ),
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.grey.withOpacity(0.08)),
          ),
          color: Colors.white,
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey[300]!),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey[300]!),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF1B5E20), width: 2),
          ),
          filled: true,
          fillColor: Colors.grey[50],
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF1B5E20),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 0,
            textStyle: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            side: const BorderSide(color: Color(0xFF1B5E20)),
            textStyle: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            textStyle: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        snackBarTheme: SnackBarThemeData(
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Colors.white,
          elevation: 8,
        ),
        navigationBarTheme: NavigationBarThemeData(
          elevation: 4,
          backgroundColor: Colors.white,
          indicatorColor: const Color(0xFFE8F5E9),
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1B5E20),
              );
            }
            return GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Colors.grey[600],
            );
          }),
        ),
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          backgroundColor: Color(0xFF1B5E20),
          foregroundColor: Colors.white,
          elevation: 4,
          shape: CircleBorder(),
        ),
      ),
      routerConfig: _router,
    );
  }
}

final GoRouter _router = GoRouter(
  initialLocation: '/login',
  redirect: (context, state) {
    final auth = context.read<AuthService>();
    final loggedIn = auth.isAuthenticated;
    final path = state.uri.path;

    final onAuthScreen = path == '/login' || path == '/register';
    final onCardScreen = path == '/link-card';

    // Not logged in → auth screens only
    if (!loggedIn) return onAuthScreen ? null : '/login';

    // Logged in but no card linked → mandatory onboarding gate.
    // New users land here straight after signup; existing users are sent
    // here on app open until they link a card.
    if (!auth.isPaymentMethodConnected && !onCardScreen) {
      return '/link-card';
    }

    // Linked but still on an auth/card screen → into the app
    if (onAuthScreen || (onCardScreen && auth.isPaymentMethodConnected)) {
      return '/';
    }

    return null;
  },
  // Re-evaluate redirects whenever auth / card-link state changes
  refreshListenable: authService,
  routes: [
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
    GoRoute(path: '/wallet', builder: (context, state) => const WalletScreen()),
    GoRoute(path: '/notifications', builder: (context, state) => const NotificationsScreen()),
    GoRoute(path: '/link-card', builder: (context, state) => const LinkCardScreen()),
    GoRoute(path: '/budgets/create', builder: (context, state) => const CreateBudgetFlowScreen()),
    ShellRoute(
      builder: (context, state, child) => MainScaffold(child: child),
      routes: [
        GoRoute(path: '/', builder: (context, state) => const DashboardScreen()),
        GoRoute(path: '/transactions', builder: (context, state) => const TransactionsScreen()),
        GoRoute(path: '/budgets', builder: (context, state) => const BudgetsScreen()),
        GoRoute(path: '/savings', builder: (context, state) => const SavingsScreen()),
        GoRoute(path: '/analytics', builder: (context, state) => const AnalyticsScreen()),
        GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
      ],
    ),
  ],
);



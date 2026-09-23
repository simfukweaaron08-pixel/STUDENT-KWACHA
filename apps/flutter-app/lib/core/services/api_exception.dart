import 'package:dio/dio.dart';

/// A single field-level validation error returned by the backend, e.g.
/// `{ "field": "body.password", "message": "Password must be at least 8 characters" }`.
class ApiFieldError {
  const ApiFieldError({required this.field, required this.message});

  final String field;
  final String message;
}

/// A structured, user-presentable error from the backend API.
///
/// The backend responds to failures with:
/// ```json
/// {
///   "success": false,
///   "error": { "code": "VALIDATION_ERROR", "message": "Invalid input", "details": [...] }
/// }
/// ```
/// This class extracts that payload so UI layers can show the real reason a
/// request failed instead of a generic "something went wrong" message.
class ApiException implements Exception {
  ApiException({
    this.code,
    required this.message,
    this.details = const [],
    this.statusCode,
  });

  final String? code;
  final String message;
  final List<ApiFieldError> details;
  final int? statusCode;

  /// Builds an [ApiException] from any error thrown by the API layer.
  factory ApiException.from(Object error) {
    if (error is ApiException) return error;
    if (error is DioException) return ApiException.fromDio(error);
    return ApiException(message: error.toString());
  }

  factory ApiException.fromDio(DioException e) {
    final statusCode = e.response?.statusCode;
    final data = e.response?.data;

    // The backend's standard error envelope.
    if (data is Map && data['error'] is Map) {
      final error = data['error'] as Map;
      final details = <ApiFieldError>[];
      final rawDetails = error['details'];
      if (rawDetails is List) {
        for (final d in rawDetails) {
          if (d is Map && d['message'] != null) {
            details.add(ApiFieldError(
              field: d['field']?.toString() ?? '',
              message: d['message'].toString(),
            ));
          }
        }
      }
      return ApiException(
        code: error['code']?.toString(),
        message: error['message']?.toString() ?? 'Request failed',
        details: details,
        statusCode: statusCode,
      );
    }

    // No JSON body — classify connection-level failures.
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException(
          code: 'NETWORK_TIMEOUT',
          message: 'The server took too long to respond. Please try again.',
          statusCode: statusCode,
        );
      case DioExceptionType.connectionError:
        return ApiException(
          code: 'NETWORK_ERROR',
          message:
              'Cannot reach the server. Check your internet connection or the API address.',
          statusCode: statusCode,
        );
      default:
        return ApiException(
          message: e.message ?? 'Unexpected error. Please try again.',
          statusCode: statusCode,
        );
    }
  }

  bool get isNetworkError =>
      code == 'NETWORK_ERROR' || code == 'NETWORK_TIMEOUT';

  /// The best message to show a user: prefers a concrete field detail when
  /// the top-level message is generic (e.g. "Invalid input").
  String get displayMessage {
    const genericMessages = {
      'Invalid input',
      'Validation failed',
      'Resource already exists',
      'Request failed',
    };
    if (details.isNotEmpty && genericMessages.contains(message)) {
      final first = details.first;
      final field = first.field.split('.').last;
      final fieldLabel = _humanize(field);
      final msg = first.message;
      final needsPrefix =
          fieldLabel.isNotEmpty && !msg.toLowerCase().startsWith(field.toLowerCase());
      final text = needsPrefix ? '$fieldLabel: $msg' : msg;
      return details.length > 1 ? '$text (+${details.length - 1} more)' : text;
    }
    return message;
  }

  static String _humanize(String field) {
    if (field.isEmpty) return field;
    final spaced = field.replaceAll('_', ' ');
    return spaced[0].toUpperCase() + spaced.substring(1);
  }

  @override
  String toString() => 'ApiException($code): $message';
}

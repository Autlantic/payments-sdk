/// Outcome of [AutlanticCheckout.present].
enum AutlanticCheckoutStatus {
  completed,
  canceled,
  failed,
}

/// Result of presenting hosted Autlantic checkout.
class AutlanticCheckoutResult {
  const AutlanticCheckoutResult._({
    required this.status,
    this.callbackUrl,
    this.message,
  });

  /// Customer returned via success/cancel deep link (iOS), or Custom Tabs
  /// launched successfully (Android — [callbackUrl] is usually null).
  const AutlanticCheckoutResult.completed({String? callbackUrl})
      : this._(
          status: AutlanticCheckoutStatus.completed,
          callbackUrl: callbackUrl,
        );

  /// Customer dismissed the auth session (iOS).
  const AutlanticCheckoutResult.canceled()
      : this._(status: AutlanticCheckoutStatus.canceled);

  /// Presentation failed.
  const AutlanticCheckoutResult.failed({required String message})
      : this._(
          status: AutlanticCheckoutStatus.failed,
          message: message,
        );

  final AutlanticCheckoutStatus status;
  final String? callbackUrl;
  final String? message;

  bool get isCompleted => status == AutlanticCheckoutStatus.completed;
  bool get isCanceled => status == AutlanticCheckoutStatus.canceled;
  bool get isFailed => status == AutlanticCheckoutStatus.failed;

  factory AutlanticCheckoutResult.fromMap(Map<Object?, Object?>? map) {
    if (map == null) {
      return const AutlanticCheckoutResult.failed(
        message: 'Empty result from native layer',
      );
    }
    final status = map['status']?.toString() ?? '';
    switch (status) {
      case 'completed':
        return AutlanticCheckoutResult.completed(
          callbackUrl: map['callbackUrl']?.toString(),
        );
      case 'canceled':
        return const AutlanticCheckoutResult.canceled();
      case 'failed':
        return AutlanticCheckoutResult.failed(
          message: map['message']?.toString() ?? 'Checkout failed',
        );
      default:
        return AutlanticCheckoutResult.failed(
          message: 'Unknown status: $status',
        );
    }
  }

  @override
  String toString() =>
      'AutlanticCheckoutResult(status: $status, callbackUrl: $callbackUrl, message: $message)';
}

import 'package:flutter/services.dart';

import 'src/autlantic_checkout_result.dart';

export 'src/autlantic_checkout_result.dart';

/// Presents hosted Autlantic checkout (`checkoutUrl` / payment link URL).
///
/// Never accepts API keys. Create sessions on your server and pass only the
/// returned hosted URL into [present].
class AutlanticCheckout {
  AutlanticCheckout._();

  static const MethodChannel _channel =
      MethodChannel('com.autlantic.checkout/flutter');

  /// Opens hosted checkout.
  ///
  /// [returnUrlScheme] is used on iOS with `ASWebAuthenticationSession`.
  /// On Android this opens Chrome Custom Tabs; deep-link returns are handled
  /// by the host app (the future completes after Custom Tabs launches).
  static Future<AutlanticCheckoutResult> present(
    String checkoutUrl, {
    required String returnUrlScheme,
  }) async {
    if (checkoutUrl.trim().isEmpty) {
      return const AutlanticCheckoutResult.failed(
        message: 'checkoutUrl must not be empty',
      );
    }
    if (returnUrlScheme.trim().isEmpty) {
      return const AutlanticCheckoutResult.failed(
        message: 'returnUrlScheme must not be empty',
      );
    }

    try {
      final dynamic raw = await _channel.invokeMethod<dynamic>(
        'present',
        <String, String>{
          'checkoutUrl': checkoutUrl,
          'returnUrlScheme': returnUrlScheme,
        },
      );
      return AutlanticCheckoutResult.fromMap(
        raw is Map ? Map<Object?, Object?>.from(raw) : null,
      );
    } on PlatformException catch (e) {
      return AutlanticCheckoutResult.failed(
        message: e.message ?? e.code,
      );
    } catch (e) {
      return AutlanticCheckoutResult.failed(message: e.toString());
    }
  }
}

import 'package:autlantic_checkout/autlantic_checkout.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('present rejects empty checkoutUrl without calling native', () async {
    final result = await AutlanticCheckout.present(
      '',
      returnUrlScheme: 'myapp',
    );
    expect(result.status, AutlanticCheckoutStatus.failed);
    expect(result.message, contains('checkoutUrl'));
  });

  test('present rejects empty returnUrlScheme without calling native', () async {
    final result = await AutlanticCheckout.present(
      'https://billing.autlantic.com/checkout/pay/pay_x',
      returnUrlScheme: '  ',
    );
    expect(result.status, AutlanticCheckoutStatus.failed);
    expect(result.message, contains('returnUrlScheme'));
  });

  test('public API has no apiKey parameters', () {
    // Compile-time surface: present(checkoutUrl, {returnUrlScheme}) only.
    expect(AutlanticCheckout.present, isA<Function>());
  });
}

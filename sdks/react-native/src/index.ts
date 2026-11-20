import { NativeModules, Platform } from 'react-native';

export type AutlanticCheckoutStatus = 'completed' | 'canceled' | 'failed';

export type AutlanticCheckoutResult = {
  status: AutlanticCheckoutStatus;
  callbackUrl?: string;
  error?: string;
};

export type PresentOptions = {
  /** Used on iOS with ASWebAuthenticationSession. Required for API parity on Android. */
  returnUrlScheme: string;
};

type NativeAutlanticCheckout = {
  present(
    checkoutUrl: string,
    returnUrlScheme: string,
  ): Promise<AutlanticCheckoutResult>;
};

const LINKING_ERROR =
  `The package '@autlantic/checkout' doesn't seem to be linked. Make sure:\n\n` +
  Platform.select({
    ios: "- You have run 'pod install'\n",
    default: '',
  }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go (custom native code required)\n';

const NativeModule = (NativeModules.AutlanticCheckout ??
  new Proxy(
    {},
    {
      get() {
        throw new Error(LINKING_ERROR);
      },
    },
  )) as NativeAutlanticCheckout;

/**
 * Presents hosted Autlantic checkout (`checkoutUrl` / payment link URL).
 * Never accepts API keys. Create sessions on your server.
 */
const ALLOWED_SCHEMES = new Set(['https', 'http', 'sandbox']);

/** Validates hosted checkout URL shape (http(s) or sandbox). Unit-testable. */
export function validateCheckoutUrl(checkoutUrl: string): string | null {
  const trimmed = checkoutUrl?.trim() ?? '';
  if (!trimmed) {
    return 'checkoutUrl must not be empty';
  }
  const schemeEnd = trimmed.indexOf('://');
  if (schemeEnd <= 0) {
    return 'checkoutUrl must be an http(s) or sandbox URL';
  }
  const scheme = trimmed.slice(0, schemeEnd).toLowerCase();
  if (!ALLOWED_SCHEMES.has(scheme)) {
    return 'checkoutUrl must be an http(s) or sandbox URL';
  }
  return null;
}

const AutlanticCheckout = {
  /**
   * Opens hosted checkout.
   *
   * iOS uses ASWebAuthenticationSession and resolves when the customer returns
   * via `returnUrlScheme` or cancels. Android opens Chrome Custom Tabs and
   * resolves after launch; deep links are handled by the host app.
   */
  async present(
    checkoutUrl: string,
    options: PresentOptions,
  ): Promise<AutlanticCheckoutResult> {
    const returnUrlScheme = options?.returnUrlScheme?.trim() ?? '';
    const urlError = validateCheckoutUrl(checkoutUrl);
    if (urlError) {
      return { status: 'failed', error: urlError };
    }
    if (!returnUrlScheme) {
      return { status: 'failed', error: 'returnUrlScheme must not be empty' };
    }
    return NativeModule.present(checkoutUrl.trim(), returnUrlScheme);
  },
};

export default AutlanticCheckout;

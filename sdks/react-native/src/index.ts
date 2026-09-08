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
    if (!checkoutUrl?.trim()) {
      return { status: 'failed', error: 'checkoutUrl must not be empty' };
    }
    if (!returnUrlScheme) {
      return { status: 'failed', error: 'returnUrlScheme must not be empty' };
    }
    return NativeModule.present(checkoutUrl, returnUrlScheme);
  },
};

export default AutlanticCheckout;

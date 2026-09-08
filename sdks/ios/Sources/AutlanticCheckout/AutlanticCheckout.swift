import AuthenticationServices
import Foundation
import UIKit

/// Result of presenting hosted Autlantic checkout.
public enum AutlanticCheckoutResult: Sendable {
  case completed(callbackURL: URL?)
  case canceled
  case failed(Error)
}

/// Presents hosted Autlantic checkout (`checkoutUrl` / payment link URL).
/// Never accepts API keys. Create sessions on your server.
@MainActor
public enum AutlanticCheckout {
  /// Opens hosted checkout and returns when the customer hits `successUrl` / `cancelUrl`
  /// matching `returnURLScheme`, or cancels.
  public static func present(
    url: URL,
    returnURLScheme: String,
    from presenter: UIViewController,
    completion: @escaping (AutlanticCheckoutResult) -> Void
  ) {
    let session = ASWebAuthenticationSession(
      url: url,
      callbackURLScheme: returnURLScheme
    ) { callbackURL, error in
      if let error = error as? ASWebAuthenticationSessionError,
         error.code == .canceledLogin
      {
        completion(.canceled)
        return
      }
      if let error {
        completion(.failed(error))
        return
      }
      completion(.completed(callbackURL: callbackURL))
    }
    session.presentationContextProvider = PresentationAnchor(presenter: presenter)
    session.prefersEphemeralWebBrowserSession = false
    if !session.start() {
      completion(.failed(AutlanticCheckoutError.couldNotStart))
    }
  }
}

public enum AutlanticCheckoutError: Error, Sendable {
  case couldNotStart
}

private final class PresentationAnchor: NSObject, ASWebAuthenticationPresentationContextProviding {
  weak var presenter: UIViewController?

  init(presenter: UIViewController) {
    self.presenter = presenter
  }

  func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
    presenter?.view.window ?? ASPresentationAnchor()
  }
}

import AuthenticationServices
import React
import UIKit

@objc(AutlanticCheckout)
class AutlanticCheckout: NSObject {
  private var activeSession: ASWebAuthenticationSession?
  private var presentationAnchor: PresentationAnchor?

  @objc
  func present(
    _ checkoutUrl: String,
    returnUrlScheme: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard let url = URL(string: checkoutUrl) else {
        resolve([
          "status": "failed",
          "error": "Invalid checkoutUrl",
        ])
        return
      }

      guard let presenter = Self.rootViewController() else {
        resolve([
          "status": "failed",
          "error": "Could not find a root UIViewController to present from",
        ])
        return
      }

      let anchor = PresentationAnchor(presenter: presenter)
      self.presentationAnchor = anchor

      let session = ASWebAuthenticationSession(
        url: url,
        callbackURLScheme: returnUrlScheme
      ) { [weak self] callbackURL, error in
        defer {
          self?.activeSession = nil
          self?.presentationAnchor = nil
        }

        if let error = error as? ASWebAuthenticationSessionError,
           error.code == .canceledLogin
        {
          resolve(["status": "canceled"])
          return
        }
        if let error {
          resolve([
            "status": "failed",
            "error": error.localizedDescription,
          ])
          return
        }

        var payload: [String: Any] = ["status": "completed"]
        if let callbackURL {
          payload["callbackUrl"] = callbackURL.absoluteString
        }
        resolve(payload)
      }

      session.presentationContextProvider = anchor
      session.prefersEphemeralWebBrowserSession = false
      self.activeSession = session

      if !session.start() {
        self.activeSession = nil
        self.presentationAnchor = nil
        resolve([
          "status": "failed",
          "error": "Could not start ASWebAuthenticationSession",
        ])
      }
    }
  }

  private static func rootViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let window = scenes
      .flatMap { $0.windows }
      .first(where: \.isKeyWindow)
      ?? scenes.first?.windows.first
      ?? UIApplication.shared.windows.first(where: \.isKeyWindow)
      ?? UIApplication.shared.keyWindow

    guard var top = window?.rootViewController else { return nil }
    while let presented = top.presentedViewController {
      top = presented
    }
    return top
  }
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

import AuthenticationServices
import Flutter
import UIKit

/// Flutter plugin: presents hosted Autlantic checkout via ASWebAuthenticationSession.
public class AutlanticCheckoutPlugin: NSObject, FlutterPlugin {
  private var activeSession: ASWebAuthenticationSession?
  private var presentationAnchor: PresentationAnchor?

  public static func register(with registrar: FlutterPluginRegistrar) {
    let channel = FlutterMethodChannel(
      name: "com.autlantic.checkout/flutter",
      binaryMessenger: registrar.messenger()
    )
    let instance = AutlanticCheckoutPlugin()
    registrar.addMethodCallDelegate(instance, channel: channel)
  }

  public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "present":
      guard
        let args = call.arguments as? [String: Any],
        let checkoutUrl = args["checkoutUrl"] as? String,
        let returnUrlScheme = args["returnUrlScheme"] as? String,
        let url = URL(string: checkoutUrl)
      else {
        result([
          "status": "failed",
          "message": "checkoutUrl and returnUrlScheme are required",
        ])
        return
      }
      present(url: url, returnUrlScheme: returnUrlScheme, result: result)
    default:
      result(FlutterMethodNotImplemented)
    }
  }

  private func present(
    url: URL,
    returnUrlScheme: String,
    result: @escaping FlutterResult
  ) {
    DispatchQueue.main.async {
      guard let presenter = Self.rootViewController() else {
        result([
          "status": "failed",
          "message": "Could not find a root UIViewController to present from",
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
          result(["status": "canceled"])
          return
        }
        if let error {
          result([
            "status": "failed",
            "message": error.localizedDescription,
          ])
          return
        }
        var payload: [String: Any] = ["status": "completed"]
        if let callbackURL {
          payload["callbackUrl"] = callbackURL.absoluteString
        }
        result(payload)
      }

      session.presentationContextProvider = anchor
      session.prefersEphemeralWebBrowserSession = false
      self.activeSession = session

      if !session.start() {
        self.activeSession = nil
        self.presentationAnchor = nil
        result([
          "status": "failed",
          "message": "Could not start ASWebAuthenticationSession",
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

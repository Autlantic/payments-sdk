import UIKit
import AutlanticCheckout

/// Drop this into an iOS app target that depends on the AutlanticCheckout package.
final class CheckoutDemoViewController: UIViewController {
  /// Simulator: localhost. Device: your Mac LAN IP running `pnpm example:mobile`.
  var backendURL = URL(string: "http://127.0.0.1:3055")!
  var returnURLScheme = "myapp"
  private var merchantRef: String?

  private let statusLabel = UILabel()
  private let payButton = UIButton(type: .system)

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    title = "Autlantic Checkout"

    statusLabel.numberOfLines = 0
    statusLabel.text = "Ready"
    statusLabel.translatesAutoresizingMaskIntoConstraints = false

    payButton.setTitle("Pay with Autlantic", for: .normal)
    payButton.addTarget(self, action: #selector(startCheckout), for: .touchUpInside)
    payButton.translatesAutoresizingMaskIntoConstraints = false

    view.addSubview(statusLabel)
    view.addSubview(payButton)
    NSLayoutConstraint.activate([
      statusLabel.leadingAnchor.constraint(equalTo: view.layoutMarginsGuide.leadingAnchor),
      statusLabel.trailingAnchor.constraint(equalTo: view.layoutMarginsGuide.trailingAnchor),
      statusLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 24),
      payButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      payButton.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 24),
    ])
  }

  @objc private func startCheckout() {
    statusLabel.text = "Creating session…"
    var req = URLRequest(url: backendURL.appendingPathComponent("api/checkout"))
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    req.httpBody = try? JSONSerialization.data(withJSONObject: [
      "kind": "payment_link",
      "amountUsdc": 20,
    ])

    URLSession.shared.dataTask(with: req) { [weak self] data, _, error in
      DispatchQueue.main.async {
        guard let self else { return }
        if let error {
          self.statusLabel.text = error.localizedDescription
          return
        }
        guard
          let data,
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let urlString = json["checkoutUrl"] as? String,
          let checkoutURL = URL(string: urlString),
          let merchantRef = json["merchantRef"] as? String
        else {
          self.statusLabel.text = "Bad checkout response"
          return
        }
        self.merchantRef = merchantRef
        self.statusLabel.text = "Opening checkout…"
        AutlanticCheckout.present(
          url: checkoutURL,
          returnURLScheme: self.returnURLScheme,
          from: self
        ) { result in
          switch result {
          case .completed:
            self.statusLabel.text = "Returned from checkout. Checking access…"
            self.pollAccess()
          case .canceled:
            self.statusLabel.text = "Canceled"
          case .failed(let err):
            self.statusLabel.text = err.localizedDescription
          }
        }
      }
    }.resume()
  }

  private func pollAccess() {
    guard let merchantRef else { return }
    let url = backendURL.appendingPathComponent("api/access/\(merchantRef)")
    URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
      DispatchQueue.main.async {
        guard
          let data,
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let active = json["active"] as? Bool
        else {
          self?.statusLabel.text = "Could not read access"
          return
        }
        self?.statusLabel.text = active ? "Access granted" : "Waiting for webhook…"
        if !active {
          DispatchQueue.main.asyncAfter(deadline: .now() + 2) { self?.pollAccess() }
        }
      }
    }.resume()
  }
}

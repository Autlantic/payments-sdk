// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "AutlanticCheckout",
  platforms: [
    .iOS(.v15),
  ],
  products: [
    .library(name: "AutlanticCheckout", targets: ["AutlanticCheckout"]),
  ],
  targets: [
    .target(
      name: "AutlanticCheckout",
      path: "Sources/AutlanticCheckout"
    ),
  ]
)

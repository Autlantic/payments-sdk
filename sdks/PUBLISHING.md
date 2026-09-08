# Publishing non-TypeScript SDKs

TypeScript packages still use root [`PUBLISHING.md`](../../PUBLISHING.md) / `pnpm publish:sdk`.

| SDK | Registry | First publish checklist |
|-----|----------|-------------------------|
| Python `sdks/python` | PyPI (`autlantic-billing`) | `pytest` green; version in `pyproject.toml`; twine upload |
| Go `sdks/go` | Go module proxy | tag `sdks/go/v0.1.0` (or repo root module path); `go test ./...` |
| iOS `sdks/ios` | Swift Package Manager | tag; GitHub release; validate Package.swift |
| Android `sdks/android` | Maven Central / GitHub Packages | Gradle publish; coordinates `com.autlantic:checkout` |

Do not pin Autlantic platform to unpublished packages. Hosted API (`Autlantic-Version: 2026-01-01`) must already be deployed before advertising clients that send the header.

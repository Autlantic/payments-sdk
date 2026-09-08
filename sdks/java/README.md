# Autlantic Billing (Java)

Official **server** client for the hosted Autlantic Billing API.

**Coordinates:** `com.autlantic:billing:0.1.0` (Maven Central when published).

Until Central is linked, use a Gradle composite build against this repo:

```kotlin
// settings.gradle.kts
includeBuild("../path/to/payments-sdk/sdks/java") {
    dependencySubstitution {
        substitute(module("com.autlantic:billing")).using(project(":"))
    }
}
```

```kotlin
// build.gradle.kts
dependencies {
    implementation("com.autlantic:billing:0.1.0")
}
```

```java
import com.autlantic.billing.AutlanticBilling;
import com.autlantic.billing.Webhook;
import java.util.Map;

AutlanticBilling billing = AutlanticBilling.fromEnv(); // AUTLANTIC_BILLING_API_KEY

Map<String, Object> link = billing.createPaymentLink(Map.of(
    "amountUsdc", 42,
    "merchantRefPrefix", "invoice",
    "successUrl", "myapp://billing/success",
    "cancelUrl", "myapp://billing/cancel"
));
Object url = link.get("url");
```

Webhook handler:

```java
boolean ok = Webhook.verify(secret, rawBody, signatureHeader);
Map<String, Object> event = Webhook.parseEvent(rawBody);
```

## Notes

- Hosted API only. Pins `Autlantic-Version: 2026-01-01`.
- Secrets stay on the server. Mobile apps use Checkout SDKs, not this package.
- Java 17+, uses `java.net.http.HttpClient` and `org.json`.

```bash
./gradlew test
```

Docs: [Languages](https://docs.autlantic.com/guide/languages)

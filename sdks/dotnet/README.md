# Autlantic Billing (.NET)

Official **server** client for the hosted Autlantic Billing API.

**Package:** `Autlantic.Billing` **0.1.0** (NuGet when published).

Until NuGet is published, reference the project from this repo:

```xml
<ItemGroup>
  <ProjectReference Include="..\..\sdks\dotnet\src\Autlantic.Billing\Autlantic.Billing.csproj" />
</ItemGroup>
```

```csharp
using Autlantic.Billing;
using System.Text.Json.Nodes;

var billing = AutlanticBilling.FromEnv(); // AUTLANTIC_BILLING_API_KEY

JsonObject link = billing.CreatePaymentLink(new Dictionary<string, object?>
{
    ["amountUsdc"] = 42,
    ["merchantRefPrefix"] = "invoice",
    ["successUrl"] = "myapp://billing/success",
    ["cancelUrl"] = "myapp://billing/cancel",
});
var url = link["url"]?.ToString();
```

Webhook handler:

```csharp
bool ok = Webhook.Verify(secret, rawBody, signatureHeader);
JsonObject? evt = Webhook.ParseEvent(rawBody);
```

## Notes

- Hosted API only. Pins `Autlantic-Version: 2026-01-01`.
- Secrets stay on the server. Mobile apps use Checkout SDKs, not this package.
- .NET 8+, uses `HttpClient` and `System.Text.Json`.

```bash
dotnet test
```

Docs: [.NET SDK](https://docs.autlantic.com/api/dotnet) · [Languages](https://docs.autlantic.com/guide/languages)

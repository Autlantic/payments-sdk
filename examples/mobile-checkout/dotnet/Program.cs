using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Autlantic.Billing;

const int Port = 3060;

var scheme = Env("MOBILE_RETURN_SCHEME", "myapp").TrimEnd(':', '/');
var successUrl = Env("MOBILE_SUCCESS_URL", $"{scheme}://billing/success");
var cancelUrl = Env("MOBILE_CANCEL_URL", $"{scheme}://billing/cancel");
var payout = Env(
    "AUTLANTIC_PAYOUT_ADDRESS_EVM",
    "0x1111111111111111111111111111111111111111").Trim();
var webhookSecret = Env("AUTLANTIC_BILLING_WEBHOOK_SECRET", "whsec_mobile_example").Trim();
var storePath = Env(
    "AUTLANTIC_DOTNET_SAMPLE_STORE",
    Path.Combine(Path.GetTempPath(), "autlantic-dotnet-mobile-access.json"));

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls($"http://0.0.0.0:{Port}");
var app = builder.Build();

app.MapGet("/health", () => Results.Json(new
{
    ok = true,
    mode = "hosted",
    sdk = "dotnet",
    successUrl,
    cancelUrl,
}));

app.MapPost("/api/checkout", async (HttpRequest request) =>
{
    if (string.IsNullOrWhiteSpace(
            Environment.GetEnvironmentVariable("AUTLANTIC_BILLING_API_KEY")))
    {
        return Results.Json(new { error = "Set AUTLANTIC_BILLING_API_KEY" }, statusCode: 500);
    }

    using var reader = new StreamReader(request.Body, Encoding.UTF8);
    var raw = await reader.ReadToEndAsync();
    var body = string.IsNullOrEmpty(raw)
        ? new JsonObject()
        : JsonNode.Parse(raw) as JsonObject ?? new JsonObject();
    var amountNode = body["amountUsdc"];
    double amount = 20;
    if (amountNode is JsonValue amountValue)
    {
        if (amountValue.TryGetValue(out double d))
        {
            amount = d;
        }
        else if (amountValue.TryGetValue(out int i))
        {
            amount = i;
        }
        else if (double.TryParse(amountValue.ToString(), out var parsed))
        {
            amount = parsed;
        }
    }
    var merchantRef = body["merchantRef"]?.ToString()?.Trim() ?? "";
    if (string.IsNullOrEmpty(merchantRef))
    {
        merchantRef = $"mobile_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
    }

    var access = LoadAccess(storePath);
    access[merchantRef] = new JsonObject
    {
        ["active"] = false,
        ["updatedAt"] = DateTimeOffset.UtcNow.ToString("O"),
        ["kind"] = "payment_link",
    };
    SaveAccess(storePath, access);

    try
    {
        using var billing = AutlanticBilling.FromEnv();
        var created = await billing.CreatePaymentLinkAsync(new JsonObject
        {
            ["merchantRefPrefix"] = merchantRef,
            ["payoutAddressEvm"] = payout,
            ["amountUsdc"] = amount,
            ["description"] = "Mobile checkout demo (.NET)",
            ["maxUses"] = 1,
            ["successUrl"] = successUrl,
            ["cancelUrl"] = cancelUrl,
        });

        string? paymentLinkId = null;
        if (created["paymentLink"] is JsonObject pl)
        {
            paymentLinkId = pl["id"]?.ToString();
        }

        return Results.Json(new
        {
            kind = "payment_link",
            merchantRef,
            checkoutUrl = created["url"]?.ToString(),
            paymentLinkId,
            successUrl,
            cancelUrl,
        }, statusCode: 201);
    }
    catch (Exception e)
    {
        return Results.Json(new { error = e.Message }, statusCode: 502);
    }
});

app.MapGet("/api/access/{*merchantRef}", (string merchantRef) =>
{
    merchantRef = Uri.UnescapeDataString(merchantRef);
    var access = LoadAccess(storePath);
    if (!access.TryGetPropertyValue(merchantRef, out var row) || row is null)
    {
        return Results.Json(new { error = "Unknown merchantRef" }, statusCode: 404);
    }

    var outObj = new JsonObject { ["merchantRef"] = merchantRef };
    if (row is JsonObject rowObj)
    {
        foreach (var prop in rowObj)
        {
            outObj[prop.Key] = prop.Value?.DeepClone();
        }
    }

    return Results.Content(outObj.ToJsonString(), "application/json");
});

app.MapPost("/webhooks/autlantic", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body, Encoding.UTF8);
    var raw = await reader.ReadToEndAsync();
    var sig = request.Headers["X-Autlantic-Signature"].FirstOrDefault()
              ?? request.Headers["x-autlantic-signature"].FirstOrDefault();
    if (!Webhook.Verify(webhookSecret, raw, sig))
    {
        return Results.Json(new { error = "bad signature" }, statusCode: 400);
    }

    var evt = Webhook.ParseEvent(raw);
    if (evt is null)
    {
        return Results.Json(new { error = "bad body" }, statusCode: 400);
    }

    var data = evt["data"] as JsonObject ?? new JsonObject();
    var merchantRef = data["merchantRef"]?.ToString()
                      ?? data["merchant_ref"]?.ToString()
                      ?? "";
    var type = evt["type"]?.ToString() ?? "";
    var grantTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "invoice.paid", "payment.paid", "subscription.activated",
    };
    if (!string.IsNullOrEmpty(merchantRef) && grantTypes.Contains(type))
    {
        var access = LoadAccess(storePath);
        access[merchantRef] = new JsonObject
        {
            ["active"] = true,
            ["updatedAt"] = DateTimeOffset.UtcNow.ToString("O"),
            ["kind"] = type,
        };
        SaveAccess(storePath, access);
    }

    return Results.Json(new { received = true, type });
});

Console.WriteLine($"Autlantic .NET sample listening on http://0.0.0.0:{Port}");
app.Run();

static string Env(string key, string fallback)
{
    var v = Environment.GetEnvironmentVariable(key);
    return string.IsNullOrEmpty(v) ? fallback : v;
}

static JsonObject LoadAccess(string path)
{
    try
    {
        if (!File.Exists(path))
        {
            return new JsonObject();
        }

        var raw = File.ReadAllText(path);
        return JsonNode.Parse(raw) as JsonObject ?? new JsonObject();
    }
    catch
    {
        return new JsonObject();
    }
}

static void SaveAccess(string path, JsonObject rows)
{
    File.WriteAllText(
        path,
        rows.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
}

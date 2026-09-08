using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Autlantic.Billing;

/// <summary>Merchant server client for https://billing.autlantic.com (hosted only).</summary>
public sealed class AutlanticBilling : IDisposable
{
    private static readonly HashSet<int> RetryableStatus = new()
    {
        408, 429, 500, 502, 503, 504,
    };

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = null,
    };

    private readonly HttpClient _httpClient;
    private readonly bool _ownsHttpClient;

    public string ApiKey { get; }
    public string ApiBaseUrl { get; }
    public string? MerchantId { get; }
    public double TimeoutSec { get; }
    public int MaxRetries { get; }
    public string Mode { get; }

    public AutlanticBilling(string apiKey)
        : this(apiKey, "https://billing.autlantic.com", null, 30.0, 2)
    {
    }

    public AutlanticBilling(string apiKey, string? apiBaseUrl, string? merchantId)
        : this(apiKey, apiBaseUrl, merchantId, 30.0, 2)
    {
    }

    public AutlanticBilling(
        string apiKey,
        string? apiBaseUrl,
        string? merchantId,
        double timeoutSec,
        int maxRetries,
        HttpClient? httpClient = null)
    {
        var key = (apiKey ?? "").Trim();
        if (string.IsNullOrEmpty(key))
        {
            throw new AutlanticBillingException("api_key is required", "configuration");
        }

        ApiKey = key;
        var baseUrl = string.IsNullOrWhiteSpace(apiBaseUrl)
            ? "https://billing.autlantic.com"
            : apiBaseUrl.Trim();
        while (baseUrl.EndsWith('/'))
        {
            baseUrl = baseUrl[..^1];
        }

        ApiBaseUrl = baseUrl;
        MerchantId = string.IsNullOrWhiteSpace(merchantId) ? null : merchantId.Trim();
        TimeoutSec = timeoutSec;
        MaxRetries = Math.Max(0, maxRetries);
        Mode = BillingModeFromApiKey(ApiKey);

        if (httpClient is not null)
        {
            _httpClient = httpClient;
            _ownsHttpClient = false;
        }
        else
        {
            _httpClient = new HttpClient
            {
                Timeout = TimeSpan.FromMilliseconds(Math.Max(1, (long)(timeoutSec * 1000))),
            };
            _ownsHttpClient = true;
        }
    }

    /// <summary>Build a client from environment variables.</summary>
    public static AutlanticBilling FromEnv()
        => FromEnv(Environment.GetEnvironmentVariables()
            .Cast<System.Collections.DictionaryEntry>()
            .ToDictionary(
                e => e.Key?.ToString() ?? "",
                e => e.Value?.ToString()));

    public static AutlanticBilling FromEnv(IReadOnlyDictionary<string, string?> env)
    {
        var apiKey = TrimOrEmpty(GetEnv(env, "AUTLANTIC_BILLING_API_KEY"));
        if (string.IsNullOrEmpty(apiKey))
        {
            throw new AutlanticBillingException(
                "AUTLANTIC_BILLING_API_KEY is required",
                "configuration");
        }

        var baseUrl = TrimOrEmpty(GetEnv(env, "AUTLANTIC_BILLING_API_URL"));
        if (string.IsNullOrEmpty(baseUrl))
        {
            baseUrl = "https://billing.autlantic.com";
        }

        var merchant = TrimOrEmpty(GetEnv(env, "AUTLANTIC_BILLING_MERCHANT_ID"));
        return new AutlanticBilling(apiKey, baseUrl, string.IsNullOrEmpty(merchant) ? null : merchant);
    }

    public static string BillingModeFromApiKey(string? apiKey)
    {
        var key = (apiKey ?? "").Trim();
        return key.Contains("_live_", StringComparison.Ordinal) ? "live" : "test";
    }

    public Task<JsonObject> ListProductsAsync(CancellationToken cancellationToken = default)
        => RequestAsync("GET", "/v1/products", null, cancellationToken);

    public JsonObject ListProducts()
        => ListProductsAsync().GetAwaiter().GetResult();

    public Task<JsonObject> CreateSubscriptionAsync(
        JsonNode? body,
        CancellationToken cancellationToken = default)
        => RequestAsync("POST", "/v1/subscriptions", body, cancellationToken);

    public JsonObject CreateSubscription(JsonNode? body)
        => CreateSubscriptionAsync(body).GetAwaiter().GetResult();

    public JsonObject CreateSubscription(IDictionary<string, object?> body)
        => CreateSubscription(ToJsonObject(body));

    public Task<JsonObject> GetSubscriptionAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default)
        => RequestAsync("GET", $"/v1/subscriptions/{Enc(subscriptionId)}", null, cancellationToken);

    public JsonObject GetSubscription(string subscriptionId)
        => GetSubscriptionAsync(subscriptionId).GetAwaiter().GetResult();

    public Task<JsonObject> ActivateSubscriptionAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default)
        => RequestAsync(
            "POST",
            $"/v1/subscriptions/{Enc(subscriptionId)}/activate",
            new JsonObject(),
            cancellationToken);

    public JsonObject ActivateSubscription(string subscriptionId)
        => ActivateSubscriptionAsync(subscriptionId).GetAwaiter().GetResult();

    public Task<JsonObject> CancelSubscriptionAsync(
        string subscriptionId,
        JsonNode? body = null,
        CancellationToken cancellationToken = default)
        => RequestAsync(
            "POST",
            $"/v1/subscriptions/{Enc(subscriptionId)}/cancel",
            body ?? new JsonObject(),
            cancellationToken);

    public JsonObject CancelSubscription(string subscriptionId, JsonNode? body = null)
        => CancelSubscriptionAsync(subscriptionId, body).GetAwaiter().GetResult();

    public JsonObject CancelSubscription(string subscriptionId, IDictionary<string, object?>? body)
        => CancelSubscription(subscriptionId, body is null ? null : ToJsonObject(body));

    public Task<JsonObject> CreatePaymentAsync(
        JsonNode? body,
        CancellationToken cancellationToken = default)
        => RequestAsync("POST", "/v1/payments", body, cancellationToken);

    public JsonObject CreatePayment(JsonNode? body)
        => CreatePaymentAsync(body).GetAwaiter().GetResult();

    public JsonObject CreatePayment(IDictionary<string, object?> body)
        => CreatePayment(ToJsonObject(body));

    public Task<JsonObject> GetPaymentAsync(
        string paymentId,
        CancellationToken cancellationToken = default)
        => RequestAsync("GET", $"/v1/payments/{Enc(paymentId)}", null, cancellationToken);

    public JsonObject GetPayment(string paymentId)
        => GetPaymentAsync(paymentId).GetAwaiter().GetResult();

    public Task<JsonObject> CreatePaymentLinkAsync(
        JsonNode? body,
        CancellationToken cancellationToken = default)
        => RequestAsync("POST", "/v1/payment-links", body, cancellationToken);

    public JsonObject CreatePaymentLink(JsonNode? body)
        => CreatePaymentLinkAsync(body).GetAwaiter().GetResult();

    public JsonObject CreatePaymentLink(IDictionary<string, object?> body)
        => CreatePaymentLink(ToJsonObject(body));

    public Task<JsonObject> ListPaymentLinksAsync(CancellationToken cancellationToken = default)
        => RequestAsync("GET", "/v1/payment-links", null, cancellationToken);

    public JsonObject ListPaymentLinks()
        => ListPaymentLinksAsync().GetAwaiter().GetResult();

    public Task<JsonObject> GetPaymentLinkAsync(
        string linkId,
        CancellationToken cancellationToken = default)
        => RequestAsync("GET", $"/v1/payment-links/{Enc(linkId)}", null, cancellationToken);

    public JsonObject GetPaymentLink(string linkId)
        => GetPaymentLinkAsync(linkId).GetAwaiter().GetResult();

    public Task<JsonObject> DisablePaymentLinkAsync(
        string linkId,
        CancellationToken cancellationToken = default)
        => RequestAsync(
            "POST",
            $"/v1/payment-links/{Enc(linkId)}/disable",
            new JsonObject(),
            cancellationToken);

    public JsonObject DisablePaymentLink(string linkId)
        => DisablePaymentLinkAsync(linkId).GetAwaiter().GetResult();

    public Task<JsonObject> ListInvoicesAsync(
        string? subscriptionId = null,
        CancellationToken cancellationToken = default)
    {
        var path = "/v1/invoices";
        if (!string.IsNullOrEmpty(subscriptionId))
        {
            path += $"?subscriptionId={Enc(subscriptionId)}";
        }

        return RequestAsync("GET", path, null, cancellationToken);
    }

    public JsonObject ListInvoices(string? subscriptionId = null)
        => ListInvoicesAsync(subscriptionId).GetAwaiter().GetResult();

    private async Task<JsonObject> RequestAsync(
        string method,
        string path,
        JsonNode? body,
        CancellationToken cancellationToken)
    {
        var requestId =
            $"req_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds():x}_{RandomHex(4)}";
        var url = ApiBaseUrl + path;
        string? payload = null;
        if (body is not null)
        {
            payload = body.ToJsonString(JsonOptions);
        }

        string? idemKey = null;
        if (string.Equals(method, "POST", StringComparison.Ordinal))
        {
            idemKey =
                $"sdk_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{RandomHex(4)}";
        }

        var attempts = MaxRetries + 1;
        AutlanticBillingException? lastError = null;

        for (var attempt = 0; attempt < attempts; attempt++)
        {
            try
            {
                using var request = new HttpRequestMessage(new HttpMethod(method), url);
                request.Headers.TryAddWithoutValidation("Accept", "application/json");
                request.Headers.TryAddWithoutValidation("User-Agent", Version.UserAgent);
                request.Headers.TryAddWithoutValidation("X-Autlantic-Api-Key", ApiKey);
                request.Headers.TryAddWithoutValidation(
                    "X-Autlantic-Sdk-Version",
                    Version.SdkVersion);
                request.Headers.TryAddWithoutValidation(
                    "X-Autlantic-Client-Request-Id",
                    requestId);
                request.Headers.TryAddWithoutValidation(
                    "Autlantic-Version",
                    Version.AutlanticApiVersion);

                if (idemKey is not null)
                {
                    request.Headers.TryAddWithoutValidation("Idempotency-Key", idemKey);
                }

                if (string.Equals(method, "POST", StringComparison.Ordinal)
                    || string.Equals(method, "PUT", StringComparison.Ordinal)
                    || string.Equals(method, "PATCH", StringComparison.Ordinal))
                {
                    var content = payload ?? "{}";
                    request.Content = new StringContent(content, Encoding.UTF8, "application/json");
                }
                else if (payload is not null)
                {
                    request.Content = new StringContent(payload, Encoding.UTF8, "application/json");
                }

                using var response = await _httpClient
                    .SendAsync(request, cancellationToken)
                    .ConfigureAwait(false);
                var status = (int)response.StatusCode;
                var responseBody = await response.Content
                    .ReadAsStringAsync(cancellationToken)
                    .ConfigureAwait(false);

                JsonNode? decoded;
                if (string.IsNullOrEmpty(responseBody))
                {
                    decoded = new JsonObject();
                }
                else
                {
                    try
                    {
                        decoded = JsonNode.Parse(responseBody);
                    }
                    catch (JsonException)
                    {
                        decoded = JsonValue.Create(responseBody);
                    }
                }

                if (status is >= 200 and < 300)
                {
                    if (decoded is not JsonObject obj)
                    {
                        throw new AutlanticBillingException(
                            "Unexpected response shape",
                            null,
                            status,
                            requestId,
                            decoded);
                    }

                    return obj;
                }

                var message = $"HTTP {status}";
                string? code = null;
                if (decoded is JsonObject map)
                {
                    if (map["error"] is not null)
                    {
                        message = map["error"]!.ToString();
                    }

                    if (map["code"] is JsonValue codeVal
                        && codeVal.TryGetValue<string>(out var codeStr))
                    {
                        code = codeStr;
                    }
                }

                lastError = new AutlanticBillingException(
                    message,
                    code,
                    status,
                    requestId,
                    decoded);

                if (RetryableStatus.Contains(status) && attempt + 1 < attempts)
                {
                    await SleepBackoffAsync(attempt, cancellationToken).ConfigureAwait(false);
                    continue;
                }

                throw lastError;
            }
            catch (AutlanticBillingException)
            {
                throw;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception e)
            {
                lastError = new AutlanticBillingException(
                    "Network error: " + e.Message,
                    "network_error",
                    null,
                    requestId);
                if (attempt + 1 < attempts)
                {
                    await SleepBackoffAsync(attempt, cancellationToken).ConfigureAwait(false);
                    continue;
                }

                throw lastError;
            }
        }

        throw lastError
              ?? new AutlanticBillingException(
                  "Request failed",
                  "network_error",
                  null,
                  requestId);
    }

    public void Dispose()
    {
        if (_ownsHttpClient)
        {
            _httpClient.Dispose();
        }
    }

    private static async Task SleepBackoffAsync(int attempt, CancellationToken cancellationToken)
    {
        var ms = (int)(250 * Math.Pow(2, attempt));
        await Task.Delay(ms, cancellationToken).ConfigureAwait(false);
    }

    private static string Enc(string value)
        => Uri.EscapeDataString(value);

    private static string TrimOrEmpty(string? value)
        => value?.Trim() ?? "";

    private static string? GetEnv(IReadOnlyDictionary<string, string?> env, string key)
        => env.TryGetValue(key, out var value) ? value : null;

    private static string RandomHex(int numBytes)
    {
        var bytes = RandomNumberGenerator.GetBytes(numBytes);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static JsonObject ToJsonObject(IDictionary<string, object?> body)
    {
        var obj = new JsonObject();
        foreach (var (key, value) in body)
        {
            obj[key] = value is null ? null : JsonSerializer.SerializeToNode(value);
        }

        return obj;
    }
}

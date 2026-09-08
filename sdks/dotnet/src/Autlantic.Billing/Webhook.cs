using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Autlantic.Billing;

/// <summary>
/// Webhook signature helpers matching Java / PHP / Python / Go Autlantic Billing SDKs.
/// </summary>
public static class Webhook
{
    public const string SignatureHeader = "x-autlantic-signature";
    public const int ToleranceSec = 300;

    /// <summary>Result of <see cref="VerifyDetailed"/>.</summary>
    public readonly record struct VerifyResult(bool Ok, string? Reason);

    public static string SignBody(string secret, string rawBody, long? timestampSec = null)
    {
        var t = timestampSec ?? DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var v1 = HmacHex(secret, $"{t}.{rawBody}");
        return $"t={t},v1={v1}";
    }

    public static VerifyResult VerifyDetailed(
        string secret,
        string rawBody,
        string? signatureHeader,
        int toleranceSec = ToleranceSec,
        long? nowSec = null)
    {
        if (string.IsNullOrWhiteSpace(secret))
        {
            return new VerifyResult(false, "empty_secret");
        }

        if (string.IsNullOrWhiteSpace(signatureHeader))
        {
            return new VerifyResult(false, "missing_header");
        }

        var header = signatureHeader.Trim();
        var now = nowSec ?? DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        if (header.Contains("t=", StringComparison.Ordinal)
            && header.Contains("v1=", StringComparison.Ordinal))
        {
            var parts = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (var piece in header.Split(','))
            {
                var eq = piece.IndexOf('=');
                if (eq < 0)
                {
                    continue;
                }

                parts[piece[..eq]] = piece[(eq + 1)..];
            }

            if (!parts.TryGetValue("t", out var tRaw)
                || string.IsNullOrEmpty(tRaw)
                || !tRaw.All(char.IsDigit))
            {
                return new VerifyResult(false, "timestamp_invalid");
            }

            if (!long.TryParse(tRaw, out var t))
            {
                return new VerifyResult(false, "timestamp_invalid");
            }

            var v1 = parts.GetValueOrDefault("v1", "").Trim();
            if (string.IsNullOrEmpty(v1))
            {
                return new VerifyResult(false, "timestamp_invalid");
            }

            if (Math.Abs(now - t) > toleranceSec)
            {
                return new VerifyResult(false, "timestamp_expired");
            }

            var expected = HmacHex(secret, $"{t}.{rawBody}");
            if (!SafeEqualHex(expected, v1))
            {
                return new VerifyResult(false, "invalid_signature");
            }

            return new VerifyResult(true, null);
        }

        var expectedLegacy = HmacHex(secret, rawBody);
        if (expectedLegacy.Length != header.Length)
        {
            return new VerifyResult(false, "length_mismatch");
        }

        if (!SafeEqualHex(expectedLegacy, header))
        {
            return new VerifyResult(false, "invalid_signature");
        }

        return new VerifyResult(true, null);
    }

    public static bool Verify(
        string secret,
        string rawBody,
        string? signatureHeader,
        int toleranceSec = ToleranceSec,
        long? nowSec = null)
        => VerifyDetailed(secret, rawBody, signatureHeader, toleranceSec, nowSec).Ok;

    /// <summary>
    /// Parse a webhook JSON body into a <see cref="JsonObject"/>, or null if invalid.
    /// </summary>
    public static JsonObject? ParseEvent(string rawBody)
    {
        try
        {
            var node = JsonNode.Parse(rawBody) as JsonObject;
            if (node is null)
            {
                return null;
            }

            if (node["type"] is null || node["data"] is null)
            {
                return null;
            }

            return node;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string HmacHex(string secret, string payload)
    {
        var key = Encoding.UTF8.GetBytes(secret);
        var data = Encoding.UTF8.GetBytes(payload);
        var hash = HMACSHA256.HashData(key, data);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static bool SafeEqualHex(string a, string b)
    {
        var aa = Encoding.UTF8.GetBytes(a);
        var bb = Encoding.UTF8.GetBytes(b);
        return CryptographicOperations.FixedTimeEquals(aa, bb);
    }
}

using Autlantic.Billing;

namespace Autlantic.Billing.Tests;

public class WebhookTests
{
    [Fact]
    public void SignAndVerifyTimestamped()
    {
        const string body = """{"type":"invoice.paid","data":{}}""";
        var sig = Webhook.SignBody("whsec_test", body, 1_700_000_000L);
        Assert.True(
            Webhook.Verify("whsec_test", body, sig, Webhook.ToleranceSec, 1_700_000_000L));
    }

    [Fact]
    public void RejectsExpired()
    {
        const string body = """{"type":"invoice.paid","data":{}}""";
        var sig = Webhook.SignBody("whsec_test", body, 1_700_000_000L);
        var result = Webhook.VerifyDetailed(
            "whsec_test",
            body,
            sig,
            Webhook.ToleranceSec,
            1_700_000_000L + 301);
        Assert.False(result.Ok);
        Assert.Equal("timestamp_expired", result.Reason);
    }

    [Fact]
    public void ParseEvent()
    {
        const string raw =
            """{"type":"invoice.paid","id":"evt_1","data":{"id":"in_1"}}""";
        var eventObj = Webhook.ParseEvent(raw);
        Assert.NotNull(eventObj);
        Assert.Equal("invoice.paid", eventObj!["type"]!.ToString());
    }
}

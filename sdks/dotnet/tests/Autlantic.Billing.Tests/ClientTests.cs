using Autlantic.Billing;

namespace Autlantic.Billing.Tests;

public class ClientTests
{
    [Fact]
    public void FromEnvRequiresKey()
    {
        var ex = Assert.Throws<AutlanticBillingException>(
            () => AutlanticBilling.FromEnv(new Dictionary<string, string?>()));
        Assert.Equal("configuration", ex.Code);
    }

    [Fact]
    public void ModeFromKey()
    {
        Assert.Equal("test", AutlanticBilling.BillingModeFromApiKey("abk_test_x"));
        Assert.Equal("live", AutlanticBilling.BillingModeFromApiKey("abk_live_x"));
    }

    [Fact]
    public void ConstructPinsVersionConstants()
    {
        using var client = new AutlanticBilling("abk_test_demo");
        Assert.Equal("test", client.Mode);
        Assert.Equal("0.1.1", Version.SdkVersion);
        Assert.Equal("2026-01-01", Version.AutlanticApiVersion);
        Assert.Contains("autlantic-dotnet/", Version.UserAgent);
    }

    [Fact]
    public void ParitySurfaceMethodsExist()
    {
        using var client = new AutlanticBilling("abk_test_demo");
        var type = client.GetType();
        var names = type.GetMethods().Select(m => m.Name).ToHashSet();
        foreach (var name in new[]
                 {
                     "GetInvoice",
                     "RefundInvoice",
                     "RefundPayment",
                     "VoidInvoice",
                     "ProvisionConnectedMerchant",
                     "ListConnectedMerchants",
                     "GetConnectedMerchant",
                     "UpdateConnectedMerchant",
                     "DisableConnectedMerchant",
                     "CreateConnectedApiKey",
                     "ListConnectedWebhookEndpoints",
                     "CreateConnectedWebhookEndpoint",
                 })
        {
            Assert.Contains(name, names);
        }
    }
}

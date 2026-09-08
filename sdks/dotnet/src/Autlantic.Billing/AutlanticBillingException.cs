namespace Autlantic.Billing;

/// <summary>Error from Autlantic Billing client configuration or API responses.</summary>
public sealed class AutlanticBillingException : Exception
{
    public string? Code { get; }
    public int? StatusCode { get; }
    public string? RequestId { get; }
    public object? Body { get; }

    public AutlanticBillingException(string message)
        : this(message, null, null, null, null)
    {
    }

    public AutlanticBillingException(string message, string? code)
        : this(message, code, null, null, null)
    {
    }

    public AutlanticBillingException(string message, string? code, int? statusCode)
        : this(message, code, statusCode, null, null)
    {
    }

    public AutlanticBillingException(
        string message,
        string? code,
        int? statusCode,
        string? requestId)
        : this(message, code, statusCode, requestId, null)
    {
    }

    public AutlanticBillingException(
        string message,
        string? code,
        int? statusCode,
        string? requestId,
        object? body)
        : base(message)
    {
        Code = code;
        StatusCode = statusCode;
        RequestId = requestId;
        Body = body;
    }
}

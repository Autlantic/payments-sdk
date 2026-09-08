<?php

declare(strict_types=1);

namespace Autlantic\Billing;

/**
 * Merchant server client for https://billing.autlantic.com (hosted only).
 */
final class AutlanticBilling
{
    private const RETRYABLE_STATUS = [408, 429, 500, 502, 503, 504];

    public readonly string $apiKey;
    public readonly string $apiBaseUrl;
    public readonly ?string $merchantId;
    public readonly float $timeoutSec;
    public readonly int $maxRetries;
    public readonly string $mode;

    public function __construct(
        string $apiKey,
        string $apiBaseUrl = 'https://billing.autlantic.com',
        ?string $merchantId = null,
        float $timeoutSec = 30.0,
        int $maxRetries = 2,
    ) {
        $apiKey = trim($apiKey);
        if ($apiKey === '') {
            throw new AutlanticBillingException('api_key is required', 'configuration');
        }
        $this->apiKey = $apiKey;
        $this->apiBaseUrl = rtrim($apiBaseUrl, '/');
        $this->merchantId = $merchantId;
        $this->timeoutSec = $timeoutSec;
        $this->maxRetries = max(0, $maxRetries);
        $this->mode = self::billingModeFromApiKey($apiKey);
    }

    /**
     * @param array<string, string>|null $env
     */
    public static function fromEnv(?array $env = null): self
    {
        $e = $env ?? $_ENV + $_SERVER;
        $apiKey = trim((string) ($e['AUTLANTIC_BILLING_API_KEY'] ?? getenv('AUTLANTIC_BILLING_API_KEY') ?: ''));
        if ($apiKey === '') {
            throw new AutlanticBillingException(
                'AUTLANTIC_BILLING_API_KEY is required',
                'configuration',
            );
        }
        $base = trim((string) ($e['AUTLANTIC_BILLING_API_URL'] ?? getenv('AUTLANTIC_BILLING_API_URL') ?: 'https://billing.autlantic.com'));
        $merchant = trim((string) ($e['AUTLANTIC_BILLING_MERCHANT_ID'] ?? getenv('AUTLANTIC_BILLING_MERCHANT_ID') ?: ''));

        return new self(
            apiKey: $apiKey,
            apiBaseUrl: $base !== '' ? $base : 'https://billing.autlantic.com',
            merchantId: $merchant !== '' ? $merchant : null,
        );
    }

    public static function billingModeFromApiKey(?string $apiKey): string
    {
        $key = trim((string) $apiKey);

        return str_contains($key, '_live_') ? 'live' : 'test';
    }

    /** @return array<string, mixed> */
    public function listProducts(): array
    {
        return $this->request('GET', '/v1/products');
    }

    /** @param array<string, mixed> $body @return array<string, mixed> */
    public function createSubscription(array $body): array
    {
        return $this->request('POST', '/v1/subscriptions', $body);
    }

    /** @return array<string, mixed> */
    public function getSubscription(string $subscriptionId): array
    {
        return $this->request('GET', '/v1/subscriptions/' . rawurlencode($subscriptionId));
    }

    /** @return array<string, mixed> */
    public function activateSubscription(string $subscriptionId): array
    {
        return $this->request('POST', '/v1/subscriptions/' . rawurlencode($subscriptionId) . '/activate', []);
    }

    /**
     * @param array<string, mixed>|null $body
     * @return array<string, mixed>
     */
    public function cancelSubscription(string $subscriptionId, ?array $body = null): array
    {
        return $this->request(
            'POST',
            '/v1/subscriptions/' . rawurlencode($subscriptionId) . '/cancel',
            $body ?? [],
        );
    }

    /** @param array<string, mixed> $body @return array<string, mixed> */
    public function createPayment(array $body): array
    {
        return $this->request('POST', '/v1/payments', $body);
    }

    /** @return array<string, mixed> */
    public function getPayment(string $paymentId): array
    {
        return $this->request('GET', '/v1/payments/' . rawurlencode($paymentId));
    }

    /** @param array<string, mixed> $body @return array<string, mixed> */
    public function createPaymentLink(array $body): array
    {
        return $this->request('POST', '/v1/payment-links', $body);
    }

    /** @return array<string, mixed> */
    public function listPaymentLinks(): array
    {
        return $this->request('GET', '/v1/payment-links');
    }

    /** @return array<string, mixed> */
    public function getPaymentLink(string $linkId): array
    {
        return $this->request('GET', '/v1/payment-links/' . rawurlencode($linkId));
    }

    /** @return array<string, mixed> */
    public function disablePaymentLink(string $linkId): array
    {
        return $this->request('POST', '/v1/payment-links/' . rawurlencode($linkId) . '/disable', []);
    }

    /** @return array<string, mixed> */
    public function listInvoices(?string $subscriptionId = null): array
    {
        $path = '/v1/invoices';
        if ($subscriptionId !== null && $subscriptionId !== '') {
            $path .= '?subscriptionId=' . rawurlencode($subscriptionId);
        }

        return $this->request('GET', $path);
    }

    /**
     * @param array<string, mixed>|null $body
     * @return array<string, mixed>
     */
    private function request(string $method, string $path, ?array $body = null, bool $idempotent = true): array
    {
        $requestId = sprintf('req_%x_%s', (int) (microtime(true) * 1000), bin2hex(random_bytes(4)));
        $url = $this->apiBaseUrl . $path;
        $payload = $body === null ? null : json_encode($body, JSON_THROW_ON_ERROR);
        $idemKey = null;
        if ($method === 'POST' && $idempotent) {
            $idemKey = sprintf('sdk_%d_%s', (int) (microtime(true) * 1000), bin2hex(random_bytes(4)));
        }

        $attempts = $this->maxRetries + 1;
        $lastError = null;

        for ($attempt = 0; $attempt < $attempts; $attempt++) {
            $headers = [
                'Accept: application/json',
                'User-Agent: ' . Version::USER_AGENT,
                'X-Autlantic-Api-Key: ' . $this->apiKey,
                'X-Autlantic-Sdk-Version: ' . Version::SDK_VERSION,
                'X-Autlantic-Client-Request-Id: ' . $requestId,
                'Autlantic-Version: ' . Version::AUTLANTIC_API_VERSION,
            ];
            if ($payload !== null) {
                $headers[] = 'Content-Type: application/json';
            }
            if ($idemKey !== null) {
                $headers[] = 'Idempotency-Key: ' . $idemKey;
            }

            $ch = curl_init($url);
            if ($ch === false) {
                throw new AutlanticBillingException('Could not init curl', 'network_error', null, $requestId);
            }

            curl_setopt_array($ch, [
                CURLOPT_CUSTOMREQUEST => $method,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => (int) ceil($this->timeoutSec),
                CURLOPT_HEADER => true,
            ]);
            if ($payload !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            }

            $raw = curl_exec($ch);
            $errno = curl_errno($ch);
            $error = curl_error($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            $headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
            curl_close($ch);

            if ($raw === false || $errno !== 0) {
                $lastError = new AutlanticBillingException(
                    'Network error: ' . ($error !== '' ? $error : 'curl failed'),
                    'network_error',
                    null,
                    $requestId,
                );
                if ($attempt + 1 < $attempts) {
                    usleep((int) (250_000 * (2 ** $attempt)));
                    continue;
                }
                throw $lastError;
            }

            $responseBody = substr((string) $raw, $headerSize);
            $decoded = $responseBody === '' ? [] : json_decode($responseBody, true);
            if ($status >= 200 && $status < 300) {
                if (!is_array($decoded)) {
                    throw new AutlanticBillingException(
                        'Unexpected response shape',
                        null,
                        $status,
                        $requestId,
                        $decoded,
                    );
                }

                /** @var array<string, mixed> $decoded */
                return $decoded;
            }

            $message = is_array($decoded) && isset($decoded['error'])
                ? (string) $decoded['error']
                : ('HTTP ' . $status);
            $code = is_array($decoded) && isset($decoded['code']) && is_string($decoded['code'])
                ? $decoded['code']
                : null;
            $lastError = new AutlanticBillingException(
                $message,
                $code,
                $status,
                $requestId,
                $decoded,
            );
            if (in_array($status, self::RETRYABLE_STATUS, true) && $attempt + 1 < $attempts) {
                usleep((int) (250_000 * (2 ** $attempt)));
                continue;
            }
            throw $lastError;
        }

        assert($lastError instanceof AutlanticBillingException);
        throw $lastError;
    }
}

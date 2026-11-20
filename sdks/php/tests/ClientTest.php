<?php

declare(strict_types=1);

namespace Autlantic\Billing\Tests;

use Autlantic\Billing\AutlanticBilling;
use Autlantic\Billing\AutlanticBillingException;
use Autlantic\Billing\Version;
use PHPUnit\Framework\TestCase;

final class ClientTest extends TestCase
{
    public function testFromEnvRequiresKey(): void
    {
        $this->expectException(AutlanticBillingException::class);
        AutlanticBilling::fromEnv([]);
    }

    public function testModeFromKey(): void
    {
        self::assertSame('test', AutlanticBilling::billingModeFromApiKey('abk_test_x'));
        self::assertSame('live', AutlanticBilling::billingModeFromApiKey('abk_live_x'));
    }

    public function testConstructPinsVersionConstants(): void
    {
        $client = new AutlanticBilling('abk_test_demo');
        self::assertSame('test', $client->mode);
        self::assertSame('0.1.1', Version::SDK_VERSION);
        self::assertSame('2026-01-01', Version::AUTLANTIC_API_VERSION);
        self::assertStringContainsString('autlantic-php/', Version::USER_AGENT);
    }

    public function testRefundPaymentPostsExpectedPath(): void
    {
        $calls = [];
        $transport = new class ($calls) implements \Autlantic\Billing\Transport {
            /** @param list<array{method:string,url:string,body:?string}> $calls */
            public function __construct(private array &$calls)
            {
            }

            public function request(string $method, string $url, array $headers, ?string $body, float $timeoutSec): array
            {
                $this->calls[] = ['method' => $method, 'url' => $url, 'body' => $body];

                return [
                    'status' => 200,
                    'body' => json_encode(['payment' => ['id' => 'pay_1', 'status' => 'refunded']], JSON_THROW_ON_ERROR),
                    'error' => null,
                ];
            }
        };

        $client = new AutlanticBilling('abk_test_demo', transport: $transport);
        $out = $client->refundPayment('pay_1', ['amountUsdc' => 1.5]);
        self::assertSame('refunded', $out['payment']['status'] ?? null);
        self::assertCount(1, $calls);
        self::assertSame('POST', $calls[0]['method']);
        self::assertStringEndsWith('/v1/payments/pay_1/refund', $calls[0]['url']);
        self::assertStringContainsString('"amountUsdc":1.5', (string) $calls[0]['body']);
    }
}

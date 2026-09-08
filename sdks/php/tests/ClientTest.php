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
        self::assertSame('0.1.0', Version::SDK_VERSION);
        self::assertSame('2026-01-01', Version::AUTLANTIC_API_VERSION);
        self::assertStringContainsString('autlantic-php/', Version::USER_AGENT);
    }
}

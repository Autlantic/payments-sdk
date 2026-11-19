<?php

declare(strict_types=1);

namespace Autlantic\Billing\Tests;

use Autlantic\Billing\Webhook;
use PHPUnit\Framework\TestCase;

final class WebhookTest extends TestCase
{
    protected function tearDown(): void
    {
        putenv('AUTLANTIC_BILLING_ALLOW_LEGACY_WEBHOOK_SIG');
        unset($_ENV['AUTLANTIC_BILLING_ALLOW_LEGACY_WEBHOOK_SIG']);
        parent::tearDown();
    }

    public function testSignAndVerifyTimestamped(): void
    {
        $body = '{"type":"invoice.paid","data":{}}';
        $sig = Webhook::signBody('whsec_test', $body, 1_700_000_000);
        self::assertTrue(Webhook::verify('whsec_test', $body, $sig, Webhook::TOLERANCE_SEC, 1_700_000_000));
    }

    public function testRejectsExpired(): void
    {
        $body = '{"type":"invoice.paid","data":{}}';
        $sig = Webhook::signBody('whsec_test', $body, 1_700_000_000);
        $result = Webhook::verifyDetailed('whsec_test', $body, $sig, Webhook::TOLERANCE_SEC, 1_700_000_000 + 301);
        self::assertFalse($result['ok']);
        self::assertSame('timestamp_expired', $result['reason']);
    }

    public function testRejectsLegacyByDefault(): void
    {
        $body = '{"type":"invoice.paid","data":{}}';
        $legacy = hash_hmac('sha256', $body, 'whsec_test');
        $result = Webhook::verifyDetailed('whsec_test', $body, $legacy);
        self::assertFalse($result['ok']);
        self::assertSame('legacy_signature_rejected', $result['reason']);
    }

    public function testAcceptsLegacyWhenEnvAllows(): void
    {
        putenv('AUTLANTIC_BILLING_ALLOW_LEGACY_WEBHOOK_SIG=true');
        $_ENV['AUTLANTIC_BILLING_ALLOW_LEGACY_WEBHOOK_SIG'] = 'true';

        $body = '{"type":"invoice.paid","data":{}}';
        $legacy = hash_hmac('sha256', $body, 'whsec_test');
        $result = Webhook::verifyDetailed('whsec_test', $body, $legacy);
        self::assertTrue($result['ok']);
    }

    public function testParseEvent(): void
    {
        $raw = '{"type":"invoice.paid","id":"evt_1","data":{"id":"in_1"}}';
        $event = Webhook::parseEvent($raw);
        self::assertNotNull($event);
        self::assertSame('invoice.paid', $event['type']);
    }
}

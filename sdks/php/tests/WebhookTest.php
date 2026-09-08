<?php

declare(strict_types=1);

namespace Autlantic\Billing\Tests;

use Autlantic\Billing\Webhook;
use PHPUnit\Framework\TestCase;

final class WebhookTest extends TestCase
{
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

    public function testParseEvent(): void
    {
        $raw = '{"type":"invoice.paid","id":"evt_1","data":{"id":"in_1"}}';
        $event = Webhook::parseEvent($raw);
        self::assertNotNull($event);
        self::assertSame('invoice.paid', $event['type']);
    }
}

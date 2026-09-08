<?php

declare(strict_types=1);

namespace Autlantic\Billing;

/**
 * Webhook signature helpers matching @autlantic/payments-recurring / Python / Go.
 */
final class Webhook
{
    public const SIGNATURE_HEADER = 'x-autlantic-signature';
    public const TOLERANCE_SEC = 300;

    public static function signBody(string $secret, string $rawBody, ?int $timestampSec = null): string
    {
        $t = (string) ($timestampSec ?? time());
        $v1 = hash_hmac('sha256', $t . '.' . $rawBody, $secret);

        return 't=' . $t . ',v1=' . $v1;
    }

    /**
     * @return array{ok: bool, reason?: string}
     */
    public static function verifyDetailed(
        string $secret,
        string $rawBody,
        ?string $signatureHeader,
        int $toleranceSec = self::TOLERANCE_SEC,
        ?int $nowSec = null,
    ): array {
        if (trim($secret) === '') {
            return ['ok' => false, 'reason' => 'empty_secret'];
        }
        if ($signatureHeader === null || trim($signatureHeader) === '') {
            return ['ok' => false, 'reason' => 'missing_header'];
        }

        $header = trim($signatureHeader);
        $now = $nowSec ?? time();

        if (str_contains($header, 't=') && str_contains($header, 'v1=')) {
            $parts = [];
            foreach (explode(',', $header) as $piece) {
                if (!str_contains($piece, '=')) {
                    continue;
                }
                [$k, $v] = explode('=', $piece, 2);
                $parts[$k] = $v;
            }
            if (!isset($parts['t']) || !ctype_digit($parts['t'])) {
                return ['ok' => false, 'reason' => 'timestamp_invalid'];
            }
            $t = (int) $parts['t'];
            $v1 = trim($parts['v1'] ?? '');
            if ($v1 === '') {
                return ['ok' => false, 'reason' => 'timestamp_invalid'];
            }
            if (abs($now - $t) > $toleranceSec) {
                return ['ok' => false, 'reason' => 'timestamp_expired'];
            }
            $expected = hash_hmac('sha256', $t . '.' . $rawBody, $secret);
            if (!hash_equals($expected, $v1)) {
                return ['ok' => false, 'reason' => 'invalid_signature'];
            }

            return ['ok' => true];
        }

        $expected = hash_hmac('sha256', $rawBody, $secret);
        if (strlen($expected) !== strlen($header)) {
            return ['ok' => false, 'reason' => 'length_mismatch'];
        }
        if (!hash_equals($expected, $header)) {
            return ['ok' => false, 'reason' => 'invalid_signature'];
        }

        return ['ok' => true];
    }

    public static function verify(
        string $secret,
        string $rawBody,
        ?string $signatureHeader,
        int $toleranceSec = self::TOLERANCE_SEC,
        ?int $nowSec = null,
    ): bool {
        return self::verifyDetailed($secret, $rawBody, $signatureHeader, $toleranceSec, $nowSec)['ok'] === true;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function parseEvent(string $rawBody): ?array
    {
        try {
            $event = json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }
        if (!is_array($event) || !isset($event['type'], $event['data'])) {
            return null;
        }

        return $event;
    }
}

<?php

declare(strict_types=1);

namespace Autlantic\Magento\Helper;

/**
 * Pure helpers for matching Autlantic webhook payloads to Magento orders.
 * Callable from bin/unit.php without Magento runtime.
 */
final class OrderMatch
{
    public const AMOUNT_TOLERANCE = 0.000001;

    /**
     * @param array<string, mixed> $metadata
     */
    public static function storeMatches(array $metadata, string $expectedBaseUrl): bool
    {
        $site = trim((string) ($metadata['m2_store'] ?? ''));
        if ($site === '') {
            return false;
        }

        return self::normalizeUrl($site) === self::normalizeUrl($expectedBaseUrl);
    }

    /**
     * @param array<string, mixed> $metadata
     */
    public static function incrementMatches(array $metadata, string $incrementId): bool
    {
        $got = trim((string) ($metadata['m2_increment_id'] ?? ''));
        if ($got === '' || $incrementId === '') {
            return false;
        }

        return hash_equals($incrementId, $got);
    }

    public static function paymentLinkMatches(?string $eventLinkId, ?string $storedLinkId): bool
    {
        $event = trim((string) $eventLinkId);
        $stored = trim((string) $storedLinkId);

        if ($event === '' && $stored === '') {
            return true;
        }
        if ($event === '' || $stored === '') {
            return false;
        }

        return hash_equals($stored, $event);
    }

    public static function amountMatches(float $paidUsdc, float $orderTotal): bool
    {
        if ($paidUsdc < 0 || $orderTotal < 0) {
            return false;
        }

        return abs($paidUsdc - $orderTotal) <= self::AMOUNT_TOLERANCE;
    }

    /**
     * @param array<string, mixed> $metadata
     * @return array{ok: bool, reason?: string}
     */
    public static function identityOk(
        array $metadata,
        string $expectedBaseUrl,
        string $incrementId,
        ?string $eventLinkId,
        ?string $storedLinkId,
    ): array {
        if (!self::storeMatches($metadata, $expectedBaseUrl)) {
            return ['ok' => false, 'reason' => 'm2_store_mismatch'];
        }
        if (!self::incrementMatches($metadata, $incrementId)) {
            return ['ok' => false, 'reason' => 'm2_increment_mismatch'];
        }
        if (!self::paymentLinkMatches($eventLinkId, $storedLinkId)) {
            return ['ok' => false, 'reason' => 'payment_link_mismatch'];
        }

        return ['ok' => true];
    }

    /**
     * @return array{ok: bool, reason?: string}
     */
    public static function paymentPaidOk(
        float $paidUsdc,
        float $orderTotal,
        ?string $eventLinkId,
        ?string $storedLinkId,
    ): array {
        if (!self::amountMatches($paidUsdc, $orderTotal)) {
            return ['ok' => false, 'reason' => 'amount_mismatch'];
        }
        if (!self::paymentLinkMatches($eventLinkId, $storedLinkId)) {
            return ['ok' => false, 'reason' => 'payment_link_mismatch'];
        }

        return ['ok' => true];
    }

    public static function normalizeUrl(string $url): string
    {
        $url = trim($url);
        if ($url === '') {
            return '';
        }
        $parts = parse_url($url);
        if (!is_array($parts) || !isset($parts['host'])) {
            return rtrim(strtolower($url), '/');
        }
        $scheme = strtolower((string) ($parts['scheme'] ?? 'https'));
        $host = strtolower((string) $parts['host']);
        $port = isset($parts['port']) ? ':' . $parts['port'] : '';
        $path = (string) ($parts['path'] ?? '/');
        if ($path === '') {
            $path = '/';
        }
        $path = rtrim($path, '/') . '/';

        return $scheme . '://' . $host . $port . $path;
    }
}

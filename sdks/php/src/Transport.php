<?php

declare(strict_types=1);

namespace Autlantic\Billing;

/**
 * Minimal HTTP transport used by AutlanticBilling.
 *
 * @phpstan-type HeaderMap array<string, string>
 */
interface Transport
{
    /**
     * @param HeaderMap $headers
     * @return array{status: int, body: string, error: ?string}
     */
    public function request(string $method, string $url, array $headers, ?string $body, float $timeoutSec): array;
}

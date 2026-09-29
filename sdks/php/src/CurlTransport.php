<?php

declare(strict_types=1);

namespace Autlantic\Billing;

/**
 * cURL transport for non-WordPress runtimes.
 */
final class CurlTransport implements Transport
{
    /**
     * @param array<string, string> $headers
     * @return array{status: int, body: string, error: ?string}
     */
    public function request(string $method, string $url, array $headers, ?string $body, float $timeoutSec): array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            return ['status' => 0, 'body' => '', 'error' => 'Could not init curl'];
        }

        $headerLines = [];
        foreach ($headers as $name => $value) {
            $headerLines[] = $name . ': ' . $value;
        }

        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headerLines,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => (int) ceil($timeoutSec),
            CURLOPT_HEADER => true,
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }

        $raw = curl_exec($ch);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);

        if ($raw === false || $errno !== 0) {
            return [
                'status' => 0,
                'body' => '',
                'error' => $error !== '' ? $error : 'curl failed',
            ];
        }

        return [
            'status' => $status,
            'body' => substr((string) $raw, $headerSize),
            'error' => null,
        ];
    }
}

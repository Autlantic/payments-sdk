<?php

declare(strict_types=1);

namespace Autlantic\Billing;

/**
 * WordPress HTTP API transport (wp_remote_request).
 */
final class WordPressTransport implements Transport
{
    /**
     * @param array<string, string> $headers
     * @return array{status: int, body: string, error: ?string}
     */
    public function request(string $method, string $url, array $headers, ?string $body, float $timeoutSec): array
    {
        if (!function_exists('wp_remote_request')) {
            return ['status' => 0, 'body' => '', 'error' => 'wp_remote_request unavailable'];
        }

        $args = [
            'method' => $method,
            'timeout' => (int) ceil($timeoutSec),
            'redirection' => 0,
            'httpversion' => '1.1',
            'sslverify' => true,
            'headers' => $headers,
        ];
        if ($body !== null) {
            $args['body'] = $body;
        }
        if (isset($headers['User-Agent'])) {
            $args['user-agent'] = $headers['User-Agent'];
        }

        $response = wp_remote_request($url, $args);
        if (is_wp_error($response)) {
            return [
                'status' => 0,
                'body' => '',
                'error' => $response->get_error_message(),
            ];
        }

        return [
            'status' => (int) wp_remote_retrieve_response_code($response),
            'body' => (string) wp_remote_retrieve_body($response),
            'error' => null,
        ];
    }
}

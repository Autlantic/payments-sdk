<?php

declare(strict_types=1);

namespace Autlantic\Magento\Helper;

use Autlantic\Billing\AutlanticBillingException;
use Magento\Framework\FlagManager;

/**
 * Persist last checkout / readiness failure for store admins (Woo A1 parity).
 */
final class CheckoutErrors
{
    private const FLAG = 'autlantic_billing_last_checkout_error';

    public function __construct(
        private readonly FlagManager $flagManager,
    ) {
    }

    /**
     * @param array{message: string, code?: string|null, request_id?: string|null, at?: int} $entry
     */
    public function record(array $entry): void
    {
        $this->flagManager->saveFlag(self::FLAG, [
            'message' => substr((string) ($entry['message'] ?? ''), 0, 500),
            'code' => substr((string) ($entry['code'] ?? ''), 0, 64),
            'request_id' => substr((string) ($entry['request_id'] ?? ''), 0, 64),
            'at' => (int) ($entry['at'] ?? time()),
        ]);
    }

    public function recordException(\Throwable $e): void
    {
        $code = null;
        $requestId = null;
        if ($e instanceof AutlanticBillingException) {
            $code = $e->codeName;
            $requestId = $e->requestId;
        }
        $this->record([
            'message' => $e->getMessage(),
            'code' => $code,
            'request_id' => $requestId,
            'at' => time(),
        ]);
    }

    public function clear(): void
    {
        $this->flagManager->deleteFlag(self::FLAG);
    }

    /**
     * @return array{message: string, code: string, request_id: string, at: int}|null
     */
    public function last(): ?array
    {
        $row = $this->flagManager->getFlagData(self::FLAG);
        if (!is_array($row) || trim((string) ($row['message'] ?? '')) === '') {
            return null;
        }

        return [
            'message' => (string) ($row['message'] ?? ''),
            'code' => (string) ($row['code'] ?? ''),
            'request_id' => (string) ($row['request_id'] ?? ''),
            'at' => (int) ($row['at'] ?? 0),
        ];
    }
}

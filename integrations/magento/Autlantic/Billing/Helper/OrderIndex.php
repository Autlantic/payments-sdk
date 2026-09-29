<?php

declare(strict_types=1);

namespace Autlantic\Magento\Helper;

use Magento\Framework\FlagManager;

/**
 * O(1) Autlantic id → Magento order id map (flag table; no custom schema).
 */
final class OrderIndex
{
    private const FLAG = 'autlantic_billing_order_index';
    private const MAX = 2000;

    public function __construct(
        private readonly FlagManager $flagManager,
    ) {
    }

    public function remember(string $kind, string $remoteId, int $orderId): void
    {
        $remoteId = trim($remoteId);
        if ($remoteId === '' || $orderId <= 0) {
            return;
        }
        $map = $this->all();
        $map[$this->key($kind, $remoteId)] = $orderId;
        if (count($map) > self::MAX) {
            $map = array_slice($map, -self::MAX, null, true);
        }
        $this->flagManager->saveFlag(self::FLAG, $map);
    }

    public function findOrderId(string $kind, string $remoteId): ?int
    {
        $remoteId = trim($remoteId);
        if ($remoteId === '') {
            return null;
        }
        $map = $this->all();
        $id = $map[$this->key($kind, $remoteId)] ?? null;

        return is_int($id) || (is_string($id) && ctype_digit($id)) ? (int) $id : null;
    }

    /**
     * @return array<string, int>
     */
    private function all(): array
    {
        $decoded = $this->flagManager->getFlagData(self::FLAG);

        return is_array($decoded) ? $decoded : [];
    }

    private function key(string $kind, string $remoteId): string
    {
        return $kind . ':' . $remoteId;
    }
}

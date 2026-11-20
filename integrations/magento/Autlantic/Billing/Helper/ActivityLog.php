<?php

declare(strict_types=1);

namespace Autlantic\Magento\Helper;

use Magento\Framework\FlagManager;

/**
 * Ring buffers for webhook activity and idempotency (flag table; no custom schema).
 */
final class ActivityLog
{
    private const ACTIVITY_FLAG = 'autlantic_billing_activity';
    private const PROCESSED_FLAG = 'autlantic_billing_processed_events';
    private const REJECT_FLAG = 'autlantic_billing_reject_fingerprint';
    private const MAX_ACTIVITY = 30;
    private const MAX_PROCESSED = 500;
    private const REJECT_TTL_SEC = 120;

    public function __construct(
        private readonly FlagManager $flagManager,
    ) {
    }

    public function add(bool $ok, string $type, string $message): void
    {
        $rows = $this->all();
        $rows[] = [
            'at' => time(),
            'ok' => $ok,
            'type' => substr($type, 0, 64),
            'message' => substr($message, 0, 180),
        ];
        if (count($rows) > self::MAX_ACTIVITY) {
            $rows = array_slice($rows, -self::MAX_ACTIVITY);
        }
        $this->flagManager->saveFlag(self::ACTIVITY_FLAG, $rows);
    }

    /**
     * Log a rejected webhook once per fingerprint within REJECT_TTL_SEC (Woo C2 parity).
     *
     * @return bool true when a new activity row was written
     */
    public function addRejectOnce(string $fingerprint, string $message): bool
    {
        $fp = substr(hash('sha256', $fingerprint), 0, 32);
        $now = time();
        $prev = $this->flagManager->getFlagData(self::REJECT_FLAG);
        if (is_array($prev)
            && (string) ($prev['fp'] ?? '') === $fp
            && ($now - (int) ($prev['at'] ?? 0)) < self::REJECT_TTL_SEC
        ) {
            return false;
        }
        $this->flagManager->saveFlag(self::REJECT_FLAG, ['fp' => $fp, 'at' => $now]);
        $this->add(false, '', $message);

        return true;
    }

    /**
     * @return list<array{at: int, ok: bool, type: string, message: string}>
     */
    public function all(): array
    {
        $decoded = $this->flagManager->getFlagData(self::ACTIVITY_FLAG);

        return is_array($decoded) ? $decoded : [];
    }

    public function alreadyProcessed(string $eventId): bool
    {
        $seen = $this->processed();

        return isset($seen[$eventId]);
    }

    public function markProcessed(string $eventId): void
    {
        $seen = $this->processed();
        $seen[$eventId] = time();
        if (count($seen) > self::MAX_PROCESSED) {
            asort($seen);
            $seen = array_slice($seen, -self::MAX_PROCESSED, null, true);
        }
        $this->flagManager->saveFlag(self::PROCESSED_FLAG, $seen);
    }

    /**
     * @return array<string, int>
     */
    private function processed(): array
    {
        $decoded = $this->flagManager->getFlagData(self::PROCESSED_FLAG);

        return is_array($decoded) ? $decoded : [];
    }
}

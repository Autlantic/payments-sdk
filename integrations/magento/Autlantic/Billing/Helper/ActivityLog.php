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
    private const MAX_ACTIVITY = 30;
    private const MAX_PROCESSED = 500;

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

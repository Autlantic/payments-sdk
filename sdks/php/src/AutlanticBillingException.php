<?php

declare(strict_types=1);

namespace Autlantic\Billing;

final class AutlanticBillingException extends \RuntimeException
{
    public function __construct(
        string $message,
        public readonly ?string $codeName = null,
        public readonly ?int $statusCode = null,
        public readonly ?string $requestId = null,
        public readonly mixed $body = null,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }
}

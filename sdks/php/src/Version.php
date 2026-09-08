<?php

declare(strict_types=1);

namespace Autlantic\Billing;

final class Version
{
    public const SDK_VERSION = '0.1.0';
    public const AUTLANTIC_API_VERSION = '2026-01-01';
    public const USER_AGENT = 'autlantic-php/' . self::SDK_VERSION;
}

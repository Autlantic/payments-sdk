<?php

declare(strict_types=1);

use Magento\Framework\Component\ComponentRegistrar;

ComponentRegistrar::register(
    ComponentRegistrar::MODULE,
    'Autlantic_Magento',
    __DIR__ . '/Autlantic/Billing',
);

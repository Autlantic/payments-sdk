<?php

declare(strict_types=1);

namespace Autlantic\Magento\Model\Ui;

use Autlantic\Magento\Helper\Config;
use Magento\Checkout\Model\ConfigProviderInterface;

final class ConfigProvider implements ConfigProviderInterface
{
    public function __construct(private readonly Config $config)
    {
    }

    public function getConfig(): array
    {
        return [
            'payment' => [
                'autlantic' => [
                    'title' => $this->config->getTitle(),
                    'description' => __('Pay with USDC on Base. You will connect a wallet on Autlantic checkout.')->render(),
                    'isActive' => $this->config->isActive(),
                ],
            ],
        ];
    }
}

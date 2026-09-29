<?php

declare(strict_types=1);

namespace Autlantic\Magento\Model\Ui;

use Autlantic\Magento\Helper\Config;
use Magento\Checkout\Model\ConfigProviderInterface;
use Magento\Store\Model\StoreManagerInterface;

final class ConfigProvider implements ConfigProviderInterface
{
    public function __construct(
        private readonly Config $config,
        private readonly StoreManagerInterface $storeManager,
    ) {
    }

    public function getConfig(): array
    {
        $storeId = (int) $this->storeManager->getStore()->getId();

        return [
            'payment' => [
                'autlantic' => [
                    'title' => $this->config->getTitle($storeId),
                    'description' => __('Pay with USDC on Base. You will connect a wallet on Autlantic checkout.')->render(),
                    'isActive' => $this->config->isActive($storeId),
                ],
            ],
        ];
    }
}

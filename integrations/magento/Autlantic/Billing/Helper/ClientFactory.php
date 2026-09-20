<?php

declare(strict_types=1);

namespace Autlantic\Magento\Helper;

use Autlantic\Billing\AutlanticBilling;
use Autlantic\Billing\AutlanticBillingException;
use Magento\Framework\App\Helper\AbstractHelper;
use Magento\Framework\App\Helper\Context;
use Psr\Log\LoggerInterface;

final class ClientFactory extends AbstractHelper
{
    public function __construct(
        Context $context,
        private readonly Config $config,
        private readonly LoggerInterface $logger,
    ) {
        parent::__construct($context);
    }

    public function create(?int $storeId = null): AutlanticBilling
    {
        $apiKey = $this->config->getApiKey($storeId);
        if ($apiKey === '') {
            throw new AutlanticBillingException('Autlantic API key is not configured', 'configuration');
        }

        $merchantId = $this->config->getMerchantId($storeId);

        return new AutlanticBilling(
            apiKey: $apiKey,
            apiBaseUrl: $this->config->getApiUrl($storeId),
            merchantId: $merchantId !== '' ? $merchantId : null,
        );
    }

    public function log(string $message, ?int $storeId = null): void
    {
        if ($this->config->isLogging($storeId)) {
            $this->logger->info('[Autlantic] ' . $message);
        }
    }
}

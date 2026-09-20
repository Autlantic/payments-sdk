<?php

declare(strict_types=1);

namespace Autlantic\Magento\Helper;

use Magento\Framework\App\Helper\AbstractHelper;
use Magento\Framework\App\Helper\Context;
use Magento\Framework\Encryption\EncryptorInterface;
use Magento\Store\Model\ScopeInterface;

final class Config extends AbstractHelper
{
    public const XML_PATH = 'payment/autlantic/';

    public function __construct(
        Context $context,
        private readonly EncryptorInterface $encryptor,
    ) {
        parent::__construct($context);
    }

    public function isActive(?int $storeId = null): bool
    {
        return $this->scopeConfig->isSetFlag(self::XML_PATH . 'active', ScopeInterface::SCOPE_STORE, $storeId);
    }

    public function getTitle(?int $storeId = null): string
    {
        return (string) $this->scopeConfig->getValue(self::XML_PATH . 'title', ScopeInterface::SCOPE_STORE, $storeId);
    }

    public function getApiKey(?int $storeId = null): string
    {
        $raw = (string) $this->scopeConfig->getValue(self::XML_PATH . 'api_key', ScopeInterface::SCOPE_STORE, $storeId);

        return $raw !== '' ? $this->encryptor->decrypt($raw) : '';
    }

    public function getWebhookSecret(?int $storeId = null): string
    {
        $raw = (string) $this->scopeConfig->getValue(self::XML_PATH . 'webhook_secret', ScopeInterface::SCOPE_STORE, $storeId);

        return $raw !== '' ? $this->encryptor->decrypt($raw) : '';
    }

    public function getMerchantId(?int $storeId = null): string
    {
        return trim((string) $this->scopeConfig->getValue(self::XML_PATH . 'merchant_id', ScopeInterface::SCOPE_STORE, $storeId));
    }

    public function getPayoutAddress(?int $storeId = null): string
    {
        return trim((string) $this->scopeConfig->getValue(self::XML_PATH . 'payout_address', ScopeInterface::SCOPE_STORE, $storeId));
    }

    public function getApiUrl(?int $storeId = null): string
    {
        $url = trim((string) $this->scopeConfig->getValue(self::XML_PATH . 'api_url', ScopeInterface::SCOPE_STORE, $storeId));

        return $url !== '' ? rtrim($url, '/') : 'https://billing.autlantic.com';
    }

    public function getPaidStatus(?int $storeId = null): string
    {
        $status = (string) $this->scopeConfig->getValue(self::XML_PATH . 'order_status_on_paid', ScopeInterface::SCOPE_STORE, $storeId);

        return in_array($status, ['processing', 'complete'], true) ? $status : 'processing';
    }

    public function isLogging(?int $storeId = null): bool
    {
        return $this->scopeConfig->isSetFlag(self::XML_PATH . 'logging', ScopeInterface::SCOPE_STORE, $storeId);
    }
}

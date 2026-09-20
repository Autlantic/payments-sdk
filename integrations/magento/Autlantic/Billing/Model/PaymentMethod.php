<?php

declare(strict_types=1);

namespace Autlantic\Magento\Model;

use Autlantic\Magento\Helper\Config;
use Magento\Directory\Helper\Data as DirectoryHelper;
use Magento\Framework\Api\AttributeValueFactory;
use Magento\Framework\Api\ExtensionAttributesFactory;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\Data\Collection\AbstractDb;
use Magento\Framework\Model\Context;
use Magento\Framework\Model\ResourceModel\AbstractResource;
use Magento\Framework\Registry;
use Magento\Payment\Helper\Data as PaymentHelper;
use Magento\Payment\Model\Method\AbstractMethod;
use Magento\Payment\Model\Method\Logger;
use Magento\Quote\Api\Data\CartInterface;

class PaymentMethod extends AbstractMethod
{
    public const CODE = 'autlantic';

    protected $_code = self::CODE;
    protected $_isOffline = false;
    protected $_canAuthorize = false;
    protected $_canCapture = false;
    protected $_canRefund = false;
    protected $_canUseCheckout = true;
    protected $_canUseInternal = false;
    protected $_isInitializeNeeded = true;

    public function __construct(
        Context $context,
        Registry $registry,
        ExtensionAttributesFactory $extensionFactory,
        AttributeValueFactory $customAttributeFactory,
        PaymentHelper $paymentData,
        ScopeConfigInterface $scopeConfig,
        Logger $logger,
        private readonly Config $autlanticConfig,
        ?AbstractResource $resource = null,
        ?AbstractDb $resourceCollection = null,
        array $data = [],
        ?DirectoryHelper $directory = null,
    ) {
        parent::__construct(
            $context,
            $registry,
            $extensionFactory,
            $customAttributeFactory,
            $paymentData,
            $scopeConfig,
            $logger,
            $resource,
            $resourceCollection,
            $data,
            $directory,
        );
    }

    public function isAvailable(?CartInterface $quote = null)
    {
        if (!parent::isAvailable($quote)) {
            return false;
        }

        if (!$this->autlanticConfig->isActive() || $this->autlanticConfig->getApiKey() === '') {
            return false;
        }

        if ($quote !== null) {
            $currency = strtoupper((string) $quote->getQuoteCurrencyCode());
            if (!in_array($currency, ['USD', 'USDC'], true)) {
                return false;
            }
        }

        return true;
    }

    public function getConfigPaymentAction()
    {
        return null;
    }
}

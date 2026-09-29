<?php

declare(strict_types=1);

namespace Autlantic\Magento\Model;

use Autlantic\Billing\AutlanticBillingException;
use Autlantic\Magento\Helper\ClientFactory;
use Autlantic\Magento\Helper\Config;
use Autlantic\Magento\Helper\OrderIndex;
use Autlantic\Magento\Helper\OrderMeta;
use Magento\Directory\Helper\Data as DirectoryHelper;
use Magento\Framework\Api\AttributeValueFactory;
use Magento\Framework\Api\ExtensionAttributesFactory;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\Data\Collection\AbstractDb;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Model\Context;
use Magento\Framework\Model\ResourceModel\AbstractResource;
use Magento\Framework\Registry;
use Magento\Payment\Helper\Data as PaymentHelper;
use Magento\Payment\Model\InfoInterface;
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
    protected $_canRefund = true;
    protected $_canRefundInvoicePartial = true;
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
        private readonly ClientFactory $clientFactory,
        private readonly OrderIndex $orderIndex,
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

        $storeId = $quote !== null ? (int) $quote->getStoreId() : null;
        if (!$this->autlanticConfig->isActive($storeId) || $this->autlanticConfig->getApiKey($storeId) === '') {
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

    public function canRefund()
    {
        return true;
    }

    public function refund(InfoInterface $payment, $amount)
    {
        $order = $payment->getOrder();
        $storeId = (int) $order->getStoreId();
        $invoiceId = OrderMeta::get($order, OrderMeta::INVOICE_ID);
        if ($invoiceId === '') {
            throw new LocalizedException(__(
                'No Autlantic invoice on this order. One-time payment-link refunds must be completed from the Autlantic portal if supported.',
            ));
        }

        try {
            $billing = $this->clientFactory->create($storeId);
            $body = [];
            if ((float) $amount > 0) {
                $body['amountUsdc'] = (float) $amount;
            }
            $billing->refundInvoice($invoiceId, $body !== [] ? $body : null);
            $this->orderIndex->remember('invoice', $invoiceId, (int) $order->getEntityId());
            $order->addCommentToStatusHistory(__(
                'Autlantic refund requested for invoice %1 (%2 USDC).',
                $invoiceId,
                (string) $amount,
            ));
        } catch (AutlanticBillingException $e) {
            $this->clientFactory->log('Refund failed: ' . $e->getMessage(), $storeId);
            throw new LocalizedException(__('Autlantic refund failed. Please try again or refund from the portal.'));
        }

        return $this;
    }
}

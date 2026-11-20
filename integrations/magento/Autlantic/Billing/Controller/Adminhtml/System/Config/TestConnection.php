<?php

declare(strict_types=1);

namespace Autlantic\Magento\Controller\Adminhtml\System\Config;

use Autlantic\Billing\AutlanticBillingException;
use Autlantic\Magento\Helper\CheckoutErrors;
use Autlantic\Magento\Helper\ClientFactory;
use Autlantic\Magento\Helper\Config;
use Magento\Backend\App\Action;
use Magento\Backend\App\Action\Context;
use Magento\Framework\Controller\Result\JsonFactory;
use Magento\Store\Model\StoreManagerInterface;

class TestConnection extends Action
{
    public const ADMIN_RESOURCE = 'Magento_Payment::payment';

    public function __construct(
        Context $context,
        private readonly JsonFactory $jsonFactory,
        private readonly ClientFactory $clientFactory,
        private readonly Config $config,
        private readonly CheckoutErrors $checkoutErrors,
        private readonly StoreManagerInterface $storeManager,
    ) {
        parent::__construct($context);
    }

    public function execute()
    {
        $result = $this->jsonFactory->create();
        $storeId = (int) $this->getRequest()->getParam('store', 0);
        if ($storeId <= 0) {
            try {
                $storeId = (int) $this->storeManager->getStore()->getId();
            } catch (\Throwable) {
                $storeId = 0;
            }
        }
        $sid = $storeId > 0 ? $storeId : null;

        try {
            if ($this->config->getApiKey($sid) === '') {
                throw new AutlanticBillingException('API key is not configured.', 'configuration');
            }
            if ($this->config->getWebhookSecret($sid) === '') {
                throw new AutlanticBillingException(
                    'Webhook signing secret is not configured. Save the portal endpoint secret first.',
                    'configuration',
                );
            }

            $billing = $this->clientFactory->create($sid);
            $listed = $billing->listProducts();
            $products = is_array($listed['products'] ?? null) ? $listed['products'] : [];

            // Prove payout wallet path like Woo readiness: create + disable a $1 link.
            $body = [
                'amountUsdc' => 1,
                'merchantRefPrefix' => 'm2_readiness_' . time(),
                'description' => 'Autlantic Magento readiness check',
                'maxUses' => 1,
                'metadata' => ['m2_readiness' => '1'],
            ];
            $payout = $this->config->getPayoutAddress($sid);
            if ($payout !== '') {
                $body['payoutAddressEvm'] = $payout;
            }
            $created = $billing->createPaymentLink($body);
            $linkId = (string) (($created['paymentLink']['id'] ?? '') ?: '');
            if ($linkId !== '') {
                try {
                    $billing->disablePaymentLink($linkId);
                } catch (AutlanticBillingException) {
                    // Link was created; disable failure should not fail readiness.
                }
            }

            $this->checkoutErrors->clear();
            $mode = $billing->mode === 'live' ? 'live' : 'test';

            return $result->setData([
                'success' => true,
                'message' => (string) __(
                    'Ready (%1). Key, webhook secret, and payout path OK. %2 catalog products.',
                    $mode,
                    count($products),
                ),
            ]);
        } catch (AutlanticBillingException $e) {
            $this->checkoutErrors->recordException($e);

            return $result->setHttpResponseCode(400)->setData([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        } catch (\Throwable $e) {
            $this->checkoutErrors->recordException($e);

            return $result->setHttpResponseCode(500)->setData([
                'success' => false,
                'message' => (string) __('Readiness check failed.'),
            ]);
        }
    }
}

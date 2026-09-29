<?php

declare(strict_types=1);

namespace Autlantic\Magento\Controller\Adminhtml\System\Config;

use Autlantic\Billing\AutlanticBillingException;
use Autlantic\Magento\Helper\ClientFactory;
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

        try {
            $billing = $this->clientFactory->create($storeId > 0 ? $storeId : null);
            $listed = $billing->listProducts();
            $products = is_array($listed['products'] ?? null) ? $listed['products'] : [];

            return $result->setData([
                'success' => true,
                'message' => (string) __(
                    'Connected (%1). %2 catalog products.',
                    $billing->mode,
                    count($products),
                ),
            ]);
        } catch (AutlanticBillingException $e) {
            return $result->setHttpResponseCode(400)->setData([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        } catch (\Throwable $e) {
            return $result->setHttpResponseCode(500)->setData([
                'success' => false,
                'message' => (string) __('Connection test failed.'),
            ]);
        }
    }
}

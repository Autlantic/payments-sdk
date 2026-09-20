<?php

declare(strict_types=1);

namespace Autlantic\Magento\Controller\Payment;

use Autlantic\Billing\AutlanticBillingException;
use Autlantic\Magento\Helper\ClientFactory;
use Autlantic\Magento\Helper\Config;
use Autlantic\Magento\Helper\OrderMeta;
use Magento\Checkout\Model\Session as CheckoutSession;
use Magento\Framework\App\Action\HttpGetActionInterface;
use Magento\Framework\Controller\Result\RedirectFactory;
use Magento\Framework\Message\ManagerInterface;
use Magento\Sales\Api\OrderRepositoryInterface;

class Redirect implements HttpGetActionInterface
{
    public function __construct(
        private readonly CheckoutSession $checkoutSession,
        private readonly OrderRepositoryInterface $orderRepository,
        private readonly ClientFactory $clientFactory,
        private readonly Config $config,
        private readonly RedirectFactory $redirectFactory,
        private readonly ManagerInterface $messageManager,
    ) {
    }

    public function execute()
    {
        $redirect = $this->redirectFactory->create();
        $orderId = (int) $this->checkoutSession->getLastOrderId();
        if ($orderId <= 0) {
            $this->messageManager->addErrorMessage(__('Order not found.'));

            return $redirect->setPath('checkout/cart');
        }

        $order = $this->orderRepository->get($orderId);
        $storeId = (int) $order->getStoreId();

        if (!OrderMeta::currencySupported($order)) {
            $this->messageManager->addErrorMessage(__('Autlantic Billing only supports USD or USDC.'));

            return $redirect->setPath('checkout/cart');
        }

        $amount = OrderMeta::amountUsdc($order);
        if ($amount <= 0) {
            $this->messageManager->addErrorMessage(__('Order total must be greater than zero.'));

            return $redirect->setPath('checkout/cart');
        }

        try {
            $billing = $this->clientFactory->create($storeId);
            $merchantRefPrefix = 'm2_' . $order->getIncrementId();
            $successUrl = $order->getStore()->getUrl('checkout/onepage/success');
            $cancelUrl = $order->getStore()->getUrl('checkout/cart');

            $body = [
                'amountUsdc' => $amount,
                'merchantRefPrefix' => $merchantRefPrefix,
                'description' => sprintf('Magento order #%s', $order->getIncrementId()),
                'maxUses' => 1,
                'successUrl' => $successUrl,
                'cancelUrl' => $cancelUrl,
                'collectEmail' => true,
                'metadata' => [
                    'm2_order_id' => (string) $order->getEntityId(),
                    'm2_increment_id' => (string) $order->getIncrementId(),
                    'm2_store' => $order->getStore()->getBaseUrl(),
                ],
            ];

            $payout = $this->config->getPayoutAddress($storeId);
            if ($payout !== '') {
                $body['payoutAddressEvm'] = $payout;
            }

            $created = $billing->createPaymentLink($body);
            $paymentLink = is_array($created['paymentLink'] ?? null) ? $created['paymentLink'] : [];
            $url = (string) ($created['url'] ?? '');
            $linkId = (string) ($paymentLink['id'] ?? '');
            if ($url === '' || $linkId === '') {
                throw new AutlanticBillingException('Payment link response missing url or id', 'api_error');
            }

            OrderMeta::set($order, OrderMeta::PAYMENT_LINK_ID, $linkId);
            OrderMeta::set($order, OrderMeta::PAYMENT_LINK_URL, $url);
            OrderMeta::set($order, OrderMeta::CHECKOUT_URL, $url);
            OrderMeta::set($order, OrderMeta::MERCHANT_REF, $merchantRefPrefix);
            OrderMeta::set($order, OrderMeta::MODE, $billing->mode);
            $order->setState(\Magento\Sales\Model\Order::STATE_PENDING_PAYMENT);
            $order->setStatus('pending');
            $order->addCommentToStatusHistory(__('Awaiting USDC payment via Autlantic checkout.'));
            $this->orderRepository->save($order);

            $this->clientFactory->log(sprintf('Created payment link %s for order %s', $linkId, $order->getIncrementId()), $storeId);

            return $redirect->setUrl($url);
        } catch (\Throwable $e) {
            $this->clientFactory->log('Redirect failed: ' . $e->getMessage(), $storeId);
            $this->messageManager->addErrorMessage(__('Autlantic payment failed: %1', $e->getMessage()));

            return $redirect->setPath('checkout/cart');
        }
    }
}

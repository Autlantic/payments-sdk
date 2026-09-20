<?php

declare(strict_types=1);

namespace Autlantic\Magento\Controller\Webhook;

use Autlantic\Billing\Webhook;
use Autlantic\Magento\Helper\ActivityLog;
use Autlantic\Magento\Helper\ClientFactory;
use Autlantic\Magento\Helper\Config;
use Autlantic\Magento\Model\EventHandler;
use Magento\Framework\App\Action\HttpPostActionInterface;
use Magento\Framework\App\CsrfAwareActionInterface;
use Magento\Framework\App\Request\InvalidRequestException;
use Magento\Framework\App\RequestInterface;
use Magento\Framework\Controller\Result\JsonFactory;

class Index implements HttpPostActionInterface, CsrfAwareActionInterface
{
    public function __construct(
        private readonly RequestInterface $request,
        private readonly JsonFactory $jsonFactory,
        private readonly Config $config,
        private readonly ClientFactory $clientFactory,
        private readonly EventHandler $eventHandler,
        private readonly ActivityLog $activityLog,
    ) {
    }

    public function createCsrfValidationException(RequestInterface $request): ?InvalidRequestException
    {
        return null;
    }

    public function validateForCsrf(RequestInterface $request): ?bool
    {
        return true;
    }

    public function execute()
    {
        $result = $this->jsonFactory->create();
        $raw = (string) $this->request->getContent();
        $signature = (string) ($this->request->getHeader('x-autlantic-signature')
            ?: $this->request->getHeader('X-Autlantic-Signature')
            ?: '');
        $secret = $this->config->getWebhookSecret();
        $verified = Webhook::verifyDetailed($secret, $raw, $signature !== '' ? $signature : null);

        if (($verified['ok'] ?? false) !== true) {
            $reason = (string) ($verified['reason'] ?? 'unknown');
            $this->clientFactory->log('Webhook rejected: ' . $reason);
            $this->activityLog->add(false, '', 'signature ' . $reason);

            return $result->setHttpResponseCode(401)->setData(['error' => 'Invalid webhook signature']);
        }

        $event = Webhook::parseEvent($raw);
        if ($event === null) {
            return $result->setHttpResponseCode(400)->setData(['error' => 'Invalid webhook body']);
        }

        $eventId = (string) ($event['id'] ?? '');
        $type = (string) ($event['type'] ?? '');

        if ($eventId !== '' && $this->activityLog->alreadyProcessed($eventId)) {
            $this->activityLog->add(true, $type, 'duplicate ' . $eventId);

            return $result->setData(['received' => true, 'duplicate' => true]);
        }

        try {
            $this->eventHandler->handle($type, is_array($event['data'] ?? null) ? $event['data'] : []);
            if ($eventId !== '') {
                $this->activityLog->markProcessed($eventId);
            }
            $this->activityLog->add(true, $type, $eventId !== '' ? $eventId : 'accepted');
        } catch (\Throwable $e) {
            $this->clientFactory->log('Webhook handler error: ' . $e->getMessage());
            $this->activityLog->add(false, $type, $e->getMessage());

            return $result->setHttpResponseCode(500)->setData(['error' => $e->getMessage()]);
        }

        return $result->setData(['received' => true]);
    }
}

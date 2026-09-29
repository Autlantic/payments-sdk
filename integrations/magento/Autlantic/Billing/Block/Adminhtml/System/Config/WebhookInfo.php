<?php

declare(strict_types=1);

namespace Autlantic\Magento\Block\Adminhtml\System\Config;

use Autlantic\Magento\Helper\ActivityLog;
use Autlantic\Magento\Helper\Config;
use Magento\Backend\Block\Template\Context;
use Magento\Config\Block\System\Config\Form\Field;
use Magento\Framework\Data\Form\Element\AbstractElement;

class WebhookInfo extends Field
{
    public function __construct(
        Context $context,
        private readonly Config $config,
        private readonly ActivityLog $activityLog,
        array $data = [],
    ) {
        parent::__construct($context, $data);
    }

    protected function _getElementHtml(AbstractElement $element)
    {
        $url = $this->escapeHtml($this->config->getWebhookUrl());
        $html = '<p><strong>' . __('Webhook URL') . '</strong><br/><code style="user-select:all">'
            . $url . '</code></p>';

        $rows = array_reverse($this->activityLog->all());
        $html .= '<p><strong>' . __('Recent webhooks') . '</strong></p>';
        if ($rows === []) {
            $html .= '<p>' . __('No webhook deliveries recorded yet.') . '</p>';

            return $html;
        }

        $html .= '<table class="data-table admin__table-secondary"><thead><tr>'
            . '<th>' . __('When') . '</th>'
            . '<th>' . __('Result') . '</th>'
            . '<th>' . __('Event') . '</th>'
            . '<th>' . __('Detail') . '</th>'
            . '</tr></thead><tbody>';
        foreach (array_slice($rows, 0, 15) as $row) {
            if (!is_array($row)) {
                continue;
            }
            $when = !empty($row['at']) ? date('Y-m-d H:i:s', (int) $row['at']) : '';
            $ok = !empty($row['ok']);
            $html .= '<tr>'
                . '<td>' . $this->escapeHtml($when) . '</td>'
                . '<td>' . ($ok ? __('Accepted') : __('Rejected')) . '</td>'
                . '<td><code>' . $this->escapeHtml((string) ($row['type'] ?? '-')) . '</code></td>'
                . '<td>' . $this->escapeHtml((string) ($row['message'] ?? '')) . '</td>'
                . '</tr>';
        }
        $html .= '</tbody></table>';

        return $html;
    }
}

<?php

declare(strict_types=1);

namespace Autlantic\Magento\Block\Adminhtml\System\Config;

use Magento\Backend\Block\Template\Context;
use Magento\Config\Block\System\Config\Form\Field;
use Magento\Framework\Data\Form\Element\AbstractElement;

class TestConnection extends Field
{
    public function __construct(
        Context $context,
        array $data = [],
    ) {
        parent::__construct($context, $data);
    }

    protected function _getElementHtml(AbstractElement $element)
    {
        $url = $this->getUrl('autlantic/system_config/testConnection');
        $mageInit = $this->escapeHtmlAttr(json_encode([
            'Autlantic_Magento/js/test-connection' => ['ajaxUrl' => $url],
        ], JSON_UNESCAPED_SLASHES));

        return '<button type="button" class="action-default scalable" id="autlantic-test-connection"'
            . ' data-mage-init="' . $mageInit . '">'
            . $this->escapeHtml(__('Test connection')) . '</button> '
            . '<span id="autlantic-test-result"></span>';
    }
}

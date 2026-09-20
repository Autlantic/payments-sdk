<?php

declare(strict_types=1);

namespace Autlantic\Magento\Model\Config\Source;

use Magento\Framework\Data\OptionSourceInterface;

final class PaidStatus implements OptionSourceInterface
{
    public function toOptionArray(): array
    {
        return [
            ['value' => 'processing', 'label' => __('Processing')],
            ['value' => 'complete', 'label' => __('Complete')],
        ];
    }
}

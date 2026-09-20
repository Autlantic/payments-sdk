define([
    'uiComponent',
    'Magento_Checkout/js/model/payment/renderer-list'
], function (Component, rendererList) {
    'use strict';
    rendererList.push({
        type: 'autlantic',
        component: 'Autlantic_Magento/js/view/payment/method-renderer/autlantic'
    });
    return Component.extend({});
});

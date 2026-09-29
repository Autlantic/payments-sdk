define([
    'Magento_Checkout/js/view/payment/default',
    'mage/url'
], function (Component, urlBuilder) {
    'use strict';

    return Component.extend({
        defaults: {
            template: 'Autlantic_Magento/payment/autlantic',
            // Prevent Magento success redirect from racing Autlantic hosted checkout.
            redirectAfterPlaceOrder: false
        },

        getCode: function () {
            return 'autlantic';
        },

        getTitle: function () {
            return window.checkoutConfig.payment.autlantic
                ? window.checkoutConfig.payment.autlantic.title
                : this._super();
        },

        getDescription: function () {
            return window.checkoutConfig.payment.autlantic
                ? window.checkoutConfig.payment.autlantic.description
                : '';
        },

        afterPlaceOrder: function () {
            window.location.replace(urlBuilder.build('autlantic/payment/redirect'));
        }
    });
});

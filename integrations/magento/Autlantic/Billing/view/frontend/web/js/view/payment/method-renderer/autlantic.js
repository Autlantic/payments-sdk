define([
    'Magento_Checkout/js/view/payment/default',
    'Magento_Checkout/js/action/place-order',
    'Magento_Checkout/js/action/redirect-on-success',
    'mage/url'
], function (Component, placeOrderAction, redirectOnSuccessAction, urlBuilder) {
    'use strict';

    return Component.extend({
        defaults: {
            template: 'Autlantic_Magento/payment/autlantic'
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

define([
    'jquery',
    'mage/translate'
], function ($, $t) {
    'use strict';

    return function (config, element) {
        $(element).on('click', function () {
            var $out = $('#autlantic-test-result');
            $out.text($t('Checking…'));
            $.ajax({
                url: config.ajaxUrl,
                type: 'GET',
                dataType: 'json',
                showLoader: true
            }).done(function (res) {
                $out.text((res && res.message) ? res.message : (res && res.success ? 'OK' : 'Failed'));
            }).fail(function (xhr) {
                var msg = $t('Request failed');
                try {
                    var body = JSON.parse(xhr.responseText || '{}');
                    if (body && body.message) {
                        msg = body.message;
                    }
                } catch (e) {}
                $out.text(msg);
            });
        });
    };
});

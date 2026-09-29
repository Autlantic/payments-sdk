<?php

declare(strict_types=1);

/**
 * WordPress.org compliance gate for the packaged plugin dir or zip.
 */

$path = $argv[1] ?? '';
if ($path === '') {
    fwrite(STDERR, "Usage: php bin/wporg-check.php <plugin-dir-or-zip>\n");
    exit(1);
}

$tmp = null;
$root = $path;
if (is_file($path) && str_ends_with(strtolower($path), '.zip')) {
    $tmp = sys_get_temp_dir() . '/autlantic-wporg-check-' . bin2hex(random_bytes(4));
    mkdir($tmp);
    $zip = new ZipArchive();
    if ($zip->open($path) !== true) {
        fwrite(STDERR, "Could not open zip: {$path}\n");
        exit(1);
    }
    $zip->extractTo($tmp);
    $zip->close();
    $root = $tmp . '/autlantic-billing-for-woocommerce';
    if (!is_dir($root)) {
        fwrite(STDERR, "Zip missing autlantic-billing-for-woocommerce/\n");
        exit(1);
    }
}

if (!is_dir($root)) {
    fwrite(STDERR, "Not a directory: {$root}\n");
    exit(1);
}

$errors = [];
$warnings = [];

$main = $root . '/autlantic-billing.php';
if (!is_readable($main)) {
    $errors[] = 'Missing autlantic-billing.php';
} else {
    $header = (string) file_get_contents($main);
    foreach ([
        'Plugin Name:' => 'Plugin Name header',
        'Version:' => 'Version header',
        'Requires Plugins:  woocommerce' => 'Requires Plugins: woocommerce',
        "Text Domain:       autlantic-billing-for-woocommerce" => 'Text Domain matches slug',
        "define('AUTLANTIC_WC_VERSION'" => 'Version constant',
    ] as $needle => $label) {
        if (!str_contains($header, $needle)) {
            $errors[] = "Main file missing {$label}";
        }
    }
    if (preg_match('/wp_die\s*\(/', $header)) {
        $errors[] = 'Main file must not call wp_die (activation must stay clean)';
    }
    if (!preg_match('/Version:\s*(\S+)/', $header, $vm)
        || !preg_match("/define\\('AUTLANTIC_WC_VERSION',\\s*'([^']+)'/", $header, $vc)
        || $vm[1] !== $vc[1]) {
        $errors[] = 'Plugin header Version must match AUTLANTIC_WC_VERSION';
    }
}

$readme = $root . '/readme.txt';
if (!is_readable($readme)) {
    $errors[] = 'Missing readme.txt';
} else {
    $txt = (string) file_get_contents($readme);
    if (!str_contains($txt, 'Stable tag:')) {
        $errors[] = 'readme.txt missing Stable tag';
    }
    if (str_contains($txt, 'copy `autlantic-billing`')) {
        $errors[] = 'readme.txt still references wrong folder name autlantic-billing';
    }
    if (is_readable($main)) {
        preg_match('/Version:\s*(\S+)/', (string) file_get_contents($main), $vm);
        preg_match('/Stable tag:\s*(\S+)/', $txt, $sm);
        if (($vm[1] ?? '') !== ($sm[1] ?? '')) {
            $errors[] = 'readme Stable tag must match plugin Version';
        }
    }
}

$forbiddenFilePatterns = [
    'CurlTransport.php',
    'phpunit.xml',
    '.phpunit.cache',
    '.gitignore',
    '.DS_Store',
    'platform_check.php',
];

$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
);
$phpFiles = [];
foreach ($iterator as $file) {
    /** @var SplFileInfo $file */
    $rel = substr($file->getPathname(), strlen($root) + 1);
    foreach ($forbiddenFilePatterns as $bad) {
        if (str_contains($rel, $bad)) {
            $errors[] = "Forbidden path in package: {$rel}";
        }
    }
    if (str_ends_with($rel, '.php')) {
        $phpFiles[] = $file->getPathname();
    }
}

$curlRe = '/\bcurl_(init|exec|setopt|setopt_array|errno|error|getinfo|close)\s*\(/i';
$scriptRe = '/<script[\s>]/i';
$styleTagRe = '/<style[\s>]/i';
$evalRe = '/\beval\s*\(/';
$base64Re = '/\bbase64_decode\s*\(/';

foreach ($phpFiles as $phpFile) {
    $src = (string) file_get_contents($phpFile);
    $rel = substr($phpFile, strlen($root) + 1);

    if (preg_match($curlRe, $src)) {
        $errors[] = "curl_* found in {$rel}";
    }
    if (preg_match($scriptRe, $src)) {
        $errors[] = "Inline <script> tag found in {$rel}";
    }
    if (preg_match($styleTagRe, $src)) {
        $errors[] = "Inline <style> tag found in {$rel}";
    }
    if (preg_match($evalRe, $src)) {
        $errors[] = "eval() found in {$rel}";
    }
    if (preg_match($base64Re, $src)) {
        $warnings[] = "base64_decode() found in {$rel}";
    }

    // Includes should hard-stop when loaded directly.
    if (str_starts_with($rel, 'includes/') && !str_contains($src, "defined('ABSPATH')") && !str_contains($src, 'defined("ABSPATH")')) {
        $errors[] = "Missing ABSPATH guard in {$rel}";
    }
}

$adminTools = $root . '/includes/Admin_Tools.php';
if (is_readable($adminTools)) {
    $src = (string) file_get_contents($adminTools);
    if (!str_contains($src, 'wp_enqueue_script')) {
        $errors[] = 'Admin_Tools must enqueue scripts via wp_enqueue_script';
    }
    if (!str_contains($src, 'admin_enqueue_scripts')) {
        $errors[] = 'Admin_Tools must hook admin_enqueue_scripts';
    }
}

$webhook = $root . '/includes/Webhook_Controller.php';
if (is_readable($webhook)) {
    $src = (string) file_get_contents($webhook);
    if (!str_contains($src, 'permission_callback')) {
        $errors[] = 'Webhook_Controller missing permission_callback';
    }
    if (str_contains($src, "'__return_true'") || str_contains($src, '"__return_true"')) {
        $errors[] = 'Webhook_Controller must not use __return_true; use HMAC permission_callback';
    }
    if (!str_contains($src, 'permission_check')) {
        $errors[] = 'Webhook_Controller missing permission_check';
    }
}

$js = $root . '/assets/js/admin-tools.js';
if (!is_readable($js)) {
    $errors[] = 'Missing assets/js/admin-tools.js';
}

$activationProbe = <<<'PHP'
<?php
declare(strict_types=1);
define('ABSPATH', '/tmp/');
define('WPINC', 'wp-includes');
function plugin_dir_path($f) { return dirname($f) . '/'; }
function plugin_dir_url($f) { return 'http://example.test/wp-content/plugins/autlantic-billing-for-woocommerce/'; }
function plugin_basename($f) { return 'autlantic-billing-for-woocommerce/autlantic-billing.php'; }
function add_action($hook, $cb, $pri = 10, $args = 1) {
  $GLOBALS['autlantic_actions'][$hook][] = $cb;
}
function register_activation_hook($file, $cb) {
  $GLOBALS['autlantic_activation'] = $cb;
}
function register_deactivation_hook($file, $cb) {
  $GLOBALS['autlantic_deactivation'] = $cb;
}
function current_user_can($cap) { return true; }
function esc_html__($t, $d = null) { return $t; }
function __($t, $d = null) { return $t; }
function flush_rewrite_rules($hard = true) { $GLOBALS['autlantic_flushed'] = true; }
PHP;

$probeFile = sys_get_temp_dir() . '/autlantic-activation-probe-' . bin2hex(random_bytes(3)) . '.php';
file_put_contents(
    $probeFile,
    $activationProbe . "\nob_start();\nrequire " . var_export($main, true) . ";\n"
    . "\$out = ob_get_clean();\n"
    . "if (\$out !== '') { fwrite(STDERR, 'LOAD_OUTPUT:' . \$out); exit(2); }\n"
    . "if (!isset(\$GLOBALS['autlantic_activation']) || !is_callable(\$GLOBALS['autlantic_activation'])) { fwrite(STDERR, 'NO_ACTIVATION_HOOK'); exit(3); }\n"
    . "ob_start();\n(\$GLOBALS['autlantic_activation'])();\n\$actOut = ob_get_clean();\n"
    . "if (\$actOut !== '') { fwrite(STDERR, 'ACT_OUTPUT:' . \$actOut); exit(4); }\n"
    . "echo \"activation-probe ok\\n\";\n"
);
$probeCmd = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($probeFile) . ' 2>&1';
$probeOut = [];
$probeCode = 0;
exec($probeCmd, $probeOut, $probeCode);
@unlink($probeFile);
if ($probeCode !== 0) {
    $errors[] = 'Activation probe failed: ' . implode("\n", $probeOut);
}

if ($tmp !== null) {
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($tmp, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST,
    );
    foreach ($files as $file) {
        $file->isDir() ? @rmdir($file->getPathname()) : @unlink($file->getPathname());
    }
    @rmdir($tmp);
}

foreach ($warnings as $warning) {
    fwrite(STDERR, "WARN: {$warning}\n");
}
if ($errors !== []) {
    foreach ($errors as $error) {
        fwrite(STDERR, "FAIL: {$error}\n");
    }
    exit(1);
}

echo "wporg-check ok\n";

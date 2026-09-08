Pod::Spec.new do |s|
  s.name             = 'autlantic_checkout'
  s.version          = '0.1.0'
  s.summary          = 'Autlantic Billing Checkout presenter for Flutter.'
  s.description      = <<-DESC
Opens hosted Autlantic checkoutUrl via ASWebAuthenticationSession. No API keys.
                       DESC
  s.homepage         = 'https://docs.autlantic.com/api/flutter'
  s.license          = { :type => 'MIT' }
  s.author           = { 'Autlantic Limited' => 'support@autlantic.com' }
  s.source           = { :path => '.' }
  s.source_files     = 'Classes/**/*'
  s.dependency 'Flutter'
  s.platform = :ios, '13.0'
  s.swift_version = '5.0'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'i386'
  }
end

require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'AutlanticCheckout'
  s.version      = package['version']
  s.summary      = package['description']
  s.homepage     = package['homepage']
  s.license      = package['license']
  s.authors      = package['author']
  s.platforms    = { :ios => '13.0' }
  s.source       = { :git => 'https://github.com/Autlantic/payments-sdk.git', :tag => "sdks/react-native/v#{s.version}" }
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.dependency 'React-Core'
  s.swift_version = '5.0'
end

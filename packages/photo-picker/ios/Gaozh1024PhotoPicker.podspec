require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'Gaozh1024PhotoPicker'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = 'gaozh1024'
  s.homepage       = 'https://github.com/gaozh1024/rn-monorepo'
  s.platform       = :ios, '15.1'
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/gaozh1024/rn-monorepo.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end

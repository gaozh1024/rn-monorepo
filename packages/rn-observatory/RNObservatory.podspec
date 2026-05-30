require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'RNObservatory'
  s.version      = package['version']
  s.summary      = package['description']
  s.license      = package['license']
  s.homepage     = 'https://github.com/gaozh1024/rn-observatory'
  s.author       = { 'gaozh1024' => 'opensource@example.com' }
  s.platforms    = { :ios => '12.0' }
  s.source       = { :git => 'https://github.com/gaozh1024/rn-observatory.git', :tag => s.version.to_s }
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.dependency 'React-Core'
end

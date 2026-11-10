Pod::Spec.new do |s|
  s.name = 'CapacitorPencilInteraction'
  s.version = '1.0.0'
  s.summary = 'Apple Pencil double-tap and squeeze for Pencil Markup'
  s.license = 'MIT'
  s.homepage = 'https://github.com/dbulldesign/Markup'
  s.author = 'Pencil Markup'
  s.source = { :git => 'https://github.com/dbulldesign/Markup.git', :tag => s.version.to_s }
  s.source_files = 'ios/Plugin/**/*.{swift,h,m}'
  s.ios.deployment_target = '13.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
end

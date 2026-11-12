Gem::Specification.new do |s|
  s.name = "rubocop-razodin137"
  s.summary = "razodin137 house style for Ruby programming"
  s.author = "razodin137"
  s.email = "razodin137@users.noreply.github.com"
  s.homepage = "https://github.com/razodin137/house-style"

  s.license = "MIT"

  s.version = "1.3.0"
  s.platform = Gem::Platform::RUBY

  s.add_dependency "rubocop", ">= 1.92"
  s.add_dependency "rubocop-rails", ">= 2.38"
  s.add_dependency "rubocop-performance", ">= 1.27"
  s.add_dependency "rubocop-minitest", ">= 0.41"

  s.files = %w[ rubocop.yml rubocop-ruby.yml lib/rubocop-razodin137.rb ]
end

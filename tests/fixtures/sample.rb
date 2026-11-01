#!/usr/bin/env ruby
# frozen_string_literal: true

=begin
A block comment.
=end
module Shop
  class Order
    attr_reader :items

    def initialize(items = [])
      @items = items
      @@count ||= 0
    end

    def total?
      items.sum { |i| i[:price] } > 0 && $DEBUG != true
    end

    def to_s = "Order(#{items.size})"
  end
end

text = <<~SQL
  SELECT * FROM orders
SQL
puts text if text =~ /orders/i

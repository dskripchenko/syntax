package com.example.orders;

import java.util.List;

/** Orders, with a text block and a record. */
@Service
public final class Orders {
    private static final String QUERY = """
        SELECT id, total
        FROM orders
        WHERE status = 'paid'
        """;

    public record Line(String sku, int qty) {}

    public long total(List<Line> lines) {
        char sep = ',';
        return lines.stream().mapToLong(l -> (long) l.qty() * 100L).sum();
    }
}

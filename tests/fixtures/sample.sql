-- Paid orders per customer.
WITH paid AS (
  SELECT customer_id, SUM(total)::numeric(12, 2) AS total
  FROM orders
  WHERE status = 'paid' AND created_at >= NOW() - INTERVAL '30 days'
  GROUP BY customer_id
)
SELECT c.name, p.total, 'it''s' AS quote
FROM customers c
JOIN paid p ON p.customer_id = c.id
WHERE c.email LIKE $1 /* a parameter */
ORDER BY p.total DESC NULLS LAST
LIMIT 10;

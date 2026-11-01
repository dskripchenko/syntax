<!doctype html>
<title><?= htmlspecialchars($title) ?></title>
<?php
declare(strict_types=1);

namespace App\Http;

use App\Models\Order;

#[Route('/orders/{id}')]
final class OrderController extends Controller
{
    public function show(int $id): string
    {
        $order = Order::findOrFail($id); // a comment
        $sql = <<<SQL
            SELECT * FROM orders WHERE id = {$id}
            SQL;
        return "Order #{$order->id}: " . $order?->total ?? 'none';
    }
}

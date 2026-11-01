#nullable enable
using System;

namespace Shop
{
    /// <summary>A price.</summary>
    public record Price(decimal Amount, string Currency)
    {
        public override string ToString() => $"{Amount:0.00} {Currency}";
        public static string Path => @"C:\shop\prices.csv";
    }

    public static class Program
    {
        public static async Task Main(string[] args)
        {
            var price = new Price(9.99m, "EUR");
            Console.WriteLine(price is { Amount: > 5 } ? "dear" : 'c'.ToString());
            await Task.Delay(10);
        }
    }
}

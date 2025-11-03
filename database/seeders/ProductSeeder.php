<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $supplier = Supplier::firstOrCreate(
            ['email' => 'supplier@example.com'],
            [
                'name' => 'Sample Supplier',
                'phone' => '123-456-7890',
                'address' => '123 Main St',
                'contact_person' => 'John Doe',
            ]
        );

        Product::create([
            'name' => 'Sample Product 1',
            'sku' => 'SKU-001',
            'description' => 'A sample product for testing',
            'price' => 29.99,
            'supplier_id' => $supplier->id,
        ]);

        Product::create([
            'name' => 'Sample Product 2',
            'sku' => 'SKU-002',
            'description' => 'Another sample product',
            'price' => 49.99,
            'supplier_id' => $supplier->id,
        ]);
    }
}


<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('position')->default(0);

            $table->enum('item_type', ['product', 'service'])->default('product');
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();

            $table->string('name');
            $table->string('sku')->nullable();
            $table->text('description')->nullable();

            $table->decimal('quantity', 12, 3)->default(1);
            $table->string('unit')->nullable();

            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('discount_rate', 5, 2)->default(0);

            $table->decimal('line_subtotal', 12, 2)->default(0);
            $table->decimal('line_tax', 12, 2)->default(0);
            $table->decimal('line_total', 12, 2)->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
    }
};

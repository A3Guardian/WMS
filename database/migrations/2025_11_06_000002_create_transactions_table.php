<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_number')->unique();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('type', ['payment', 'receipt', 'refund', 'adjustment'])->default('payment');
            $table->enum('category', ['supplier_payment', 'customer_payment', 'salary', 'expense', 'income', 'other'])->default('other');
            $table->decimal('amount', 10, 2);
            $table->enum('payment_method', ['cash', 'bank_transfer', 'check', 'credit_card', 'debit_card', 'other'])->default('bank_transfer');
            $table->date('transaction_date');
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->string('reference_number')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};


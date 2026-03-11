<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->string('company_name')->nullable()->after('name');

            $table->text('billing_address')->nullable()->after('address');
            $table->string('billing_city')->nullable()->after('billing_address');
            $table->string('billing_postcode')->nullable()->after('billing_city');
            $table->string('billing_country')->nullable()->after('billing_postcode');

            $table->text('shipping_address')->nullable()->after('billing_country');
            $table->string('shipping_city')->nullable()->after('shipping_address');
            $table->string('shipping_postcode')->nullable()->after('shipping_city');
            $table->string('shipping_country')->nullable()->after('shipping_postcode');

            $table->string('tax_number')->nullable()->after('shipping_country');
            $table->string('registration_number')->nullable()->after('tax_number');

            $table->string('bank_name')->nullable()->after('registration_number');
            $table->string('bank_iban')->nullable()->after('bank_name');
            $table->string('bank_swift')->nullable()->after('bank_iban');

            $table->unsignedInteger('payment_terms_days')->nullable()->after('bank_swift');
            $table->decimal('credit_limit', 10, 2)->nullable()->after('payment_terms_days');
        });
    }

    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn([
                'company_name',
                'billing_address',
                'billing_city',
                'billing_postcode',
                'billing_country',
                'shipping_address',
                'shipping_city',
                'shipping_postcode',
                'shipping_country',
                'tax_number',
                'registration_number',
                'bank_name',
                'bank_iban',
                'bank_swift',
                'payment_terms_days',
                'credit_limit',
            ]);
        });
    }
};

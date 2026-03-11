<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('billing_phone')->nullable()->after('billing_country');
            $table->string('shipping_phone')->nullable()->after('shipping_country');
            $table->dropColumn('address');
        });

        Schema::table('suppliers', function (Blueprint $table) {
            $table->string('billing_phone')->nullable()->after('billing_country');
            $table->string('shipping_phone')->nullable()->after('shipping_country');
            $table->dropColumn('address');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['billing_phone', 'shipping_phone']);
            $table->text('address')->nullable()->after('phone');
        });

        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn(['billing_phone', 'shipping_phone']);
            $table->text('address')->nullable()->after('phone');
        });
    }
};

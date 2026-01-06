<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('deposit_id')->nullable()->after('supplier_id')->constrained()->onDelete('set null');
            $table->foreignId('shelf_id')->nullable()->after('deposit_id')->constrained()->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['deposit_id']);
            $table->dropForeign(['shelf_id']);
            $table->dropColumn(['deposit_id', 'shelf_id']);
        });
    }
};






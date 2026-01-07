<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('inventories', function (Blueprint $table) {
            $table->foreignId('deposit_id')->nullable()->after('location')->constrained()->onDelete('set null');
            $table->foreignId('shelf_id')->nullable()->after('deposit_id')->constrained()->onDelete('set null');
            $table->dropColumn('location');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventories', function (Blueprint $table) {
            $table->dropForeign(['deposit_id']);
            $table->dropForeign(['shelf_id']);
            $table->dropColumn(['deposit_id', 'shelf_id']);
            $table->string('location')->nullable();
        });
    }
};

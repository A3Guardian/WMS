<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deposits', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique()->nullable();
            $table->string('location')->nullable();
            $table->decimal('width', 10, 2)->nullable()->comment('in meters');
            $table->decimal('height', 10, 2)->nullable()->comment('in meters');
            $table->decimal('depth', 10, 2)->nullable()->comment('in meters');
            $table->decimal('capacity', 10, 2)->nullable()->comment('in cubic meters');
            $table->enum('status', ['active', 'inactive', 'maintenance'])->default('active');
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deposits');
    }
};


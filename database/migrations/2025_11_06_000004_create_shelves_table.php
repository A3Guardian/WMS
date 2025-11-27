<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shelves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deposit_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('code')->nullable();
            $table->decimal('x_position', 10, 2)->default(0)->comment('Position from left in meters');
            $table->decimal('y_position', 10, 2)->default(0)->comment('Position from top in meters');
            $table->decimal('width', 10, 2)->comment('Width in meters');
            $table->decimal('height', 10, 2)->comment('Height in meters');
            $table->decimal('depth', 10, 2)->nullable()->comment('Depth in meters');
            $table->decimal('capacity', 10, 2)->nullable()->comment('Capacity in cubic meters');
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shelves');
    }
};


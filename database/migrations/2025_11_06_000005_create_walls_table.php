<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('walls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deposit_id')->constrained()->onDelete('cascade');
            $table->string('name')->nullable();
            $table->decimal('x_start', 10, 2)->comment('Start X position in meters');
            $table->decimal('y_start', 10, 2)->comment('Start Y position in meters');
            $table->decimal('x_end', 10, 2)->comment('End X position in meters');
            $table->decimal('y_end', 10, 2)->comment('End Y position in meters');
            $table->decimal('thickness', 10, 2)->default(0.2)->comment('Wall thickness in meters');
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('walls');
    }
};


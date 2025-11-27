<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deposit_id')->constrained()->onDelete('cascade');
            $table->foreignId('wall_id')->nullable()->constrained()->onDelete('set null');
            $table->string('name')->nullable();
            $table->decimal('x_position', 10, 2)->comment('X position in meters');
            $table->decimal('y_position', 10, 2)->comment('Y position in meters');
            $table->decimal('width', 10, 2)->default(0.9)->comment('Door width in meters');
            $table->enum('orientation', ['horizontal', 'vertical'])->default('horizontal');
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doors');
    }
};


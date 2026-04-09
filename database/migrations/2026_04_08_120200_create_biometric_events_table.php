<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('biometric_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('biometric_device_id')->constrained('biometric_devices')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deposit_id')->nullable()->constrained('deposits')->nullOnDelete();
            $table->string('event_type');
            $table->string('fingerprint_uid')->nullable();
            $table->string('fingerprint_image_path')->nullable();
            $table->boolean('access_granted')->default(false);
            $table->integer('match_score')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['event_type', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('biometric_events');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('biometric_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('biometric_device_id')->constrained('biometric_devices')->cascadeOnDelete();
            $table->string('fingerprint_uid');
            $table->unsignedTinyInteger('finger_index')->nullable();
            $table->string('label')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['biometric_device_id', 'fingerprint_uid'], 'biometric_template_device_uid_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('biometric_templates');
    }
};

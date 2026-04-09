<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('biometric_devices', function (Blueprint $table) {
            $table->enum('purpose', ['access', 'attendance'])
                ->default('access')
                ->after('code');
            $table->string('service_url')
                ->nullable()
                ->after('purpose');
        });
    }

    public function down(): void
    {
        Schema::table('biometric_devices', function (Blueprint $table) {
            $table->dropColumn(['purpose', 'service_url']);
        });
    }
};

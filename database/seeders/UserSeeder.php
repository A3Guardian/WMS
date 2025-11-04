<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@wms.com'],
            [
                'name' => 'Admin User',
                'email' => 'admin@wms.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $admin->assignRole('Admin');

        $employee = User::updateOrCreate(
            ['email' => 'employee@wms.com'],
            [
                'name' => 'Employee User',
                'email' => 'employee@wms.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $employee->assignRole('Employee');

        $financial = User::updateOrCreate(
            ['email' => 'financial@wms.com'],
            [
                'name' => 'Financial User',
                'email' => 'financial@wms.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $financial->assignRole('Financial');
    }
}


<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'view products',
            'create products',
            'edit products',
            'delete products',
            
            'view inventory',
            'manage inventory',
            'adjust inventory',
            
            'view orders',
            'create orders',
            'edit orders',
            'delete orders',
            
            'view suppliers',
            'create suppliers',
            'edit suppliers',
            'delete suppliers',
            
            'view users',
            'create users',
            'edit users',
            'delete users',
            
            'view roles',
            'create roles',
            'edit roles',
            'delete roles',
            'assign roles',
            'view permissions',
            'manage permissions',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $adminRole = Role::firstOrCreate(['name' => 'Admin']);
        $adminRole->syncPermissions(Permission::all());

        $employeeRole = Role::firstOrCreate(['name' => 'Employee']);
        $employeeRole->syncPermissions([
            'view products',
            'create products',
            'edit products',
            'view inventory',
            'manage inventory',
            'adjust inventory',
            'view orders',
            'create orders',
            'edit orders',
            'view suppliers',
        ]);

        $financialRole = Role::firstOrCreate(['name' => 'Financial']);
        $financialRole->syncPermissions([
            'view products',
            'view inventory',
            'view orders',
            'view suppliers',
            'edit orders',
        ]);
    }
}


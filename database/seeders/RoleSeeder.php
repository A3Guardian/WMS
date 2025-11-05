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
            
            'view tasks',
            'create tasks',
            'edit tasks',
            'delete tasks',
            
            'view employees',
            'create employees',
            'edit employees',
            'delete employees',
            
            'view salaries',
            'manage salaries',
            
            'view leave types',
            'manage leave types',
            
            'view leaves',
            'create leaves',
            'edit leaves',
            'delete leaves',
            
            'view attendance',
            'manage attendance',
            
            'view payroll',
            'manage payroll',
            
            'view financial',
            'view invoices',
            'create invoices',
            'edit invoices',
            'delete invoices',
            'view payments',
            'create payments',
            'edit payments',
            'delete payments',
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
            'view tasks',
            'edit tasks',
        ]);

        $financialRole = Role::firstOrCreate(['name' => 'Financial']);
        $financialRole->syncPermissions([
            'view products',
            'view inventory',
            'view orders',
            'view suppliers',
            'edit orders',
            'view employees',
            'edit employees',
            'view salaries',
            'manage salaries',
            'view leave types',
            'manage leave types',
            'view leaves',
            'create leaves',
            'edit leaves',
            'delete leaves',
            'view attendance',
            'manage attendance',
            'view payroll',
            'manage payroll',
            'view financial',
            'view invoices',
            'create invoices',
            'edit invoices',
            'delete invoices',
            'view payments',
            'create payments',
            'edit payments',
            'delete payments',
        ]);
    }
}


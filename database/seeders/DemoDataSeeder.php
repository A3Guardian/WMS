<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\Customer;
use App\Models\Department;
use App\Models\Deposit;
use App\Models\Door;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Inventory;
use App\Models\Leave;
use App\Models\LeaveType;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PayrollRecord;
use App\Models\Product;
use App\Models\Salary;
use App\Models\Setting;
use App\Models\Shelf;
use App\Models\Supplier;
use App\Models\Task;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wall;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Seeding demo data...');

        $roles = [
            'Admin' => Role::where('name', 'Admin')->first(),
            'Employee' => Role::where('name', 'Employee')->first(),
            'Financial' => Role::where('name', 'Financial')->first(),
        ];
        if (!$roles['Admin'] || !$roles['Employee'] || !$roles['Financial']) {
            $this->command->warn('Run RoleSeeder first.');
            return;
        }

        $demoUsersByRole = [
            'Admin' => [
                ['name' => 'Admin User 1', 'email' => 'admin1@wms.com'],
                ['name' => 'Admin User 2', 'email' => 'admin2@wms.com'],
                ['name' => 'Admin User 3', 'email' => 'admin3@wms.com'],
            ],
            'Employee' => [
                ['name' => 'Employee User 1', 'email' => 'employee1@wms.com'],
                ['name' => 'Employee User 2', 'email' => 'employee2@wms.com'],
                ['name' => 'Employee User 3', 'email' => 'employee3@wms.com'],
            ],
            'Financial' => [
                ['name' => 'Financial User 1', 'email' => 'financial1@wms.com'],
                ['name' => 'Financial User 2', 'email' => 'financial2@wms.com'],
                ['name' => 'Financial User 3', 'email' => 'financial3@wms.com'],
            ],
        ];

        $usersByRole = [];
        foreach ($demoUsersByRole as $roleName => $usersConfig) {
            foreach ($usersConfig as $userConfig) {
                $user = User::updateOrCreate(
                    ['email' => $userConfig['email']],
                    [
                        'name' => $userConfig['name'],
                        'password' => Hash::make('password'),
                        'email_verified_at' => now(),
                    ]
                );
                $user->syncRoles([$roleName]);
                $usersByRole[$roleName][] = $user;
            }
        }

        $admin = $usersByRole['Admin'][0];
        $employeeUser = $usersByRole['Employee'][0];
        $financialUser = $usersByRole['Financial'][0];

        // Departments
        $departments = [];
        foreach (['Warehouse', 'Logistics', 'Procurement', 'Finance'] as $name) {
            $departments[] = Department::firstOrCreate(
                ['name' => $name],
                ['description' => "Department: {$name}"]
            );
        }

        // Employees
        $employees = [];
        $codes = ['EMP001', 'EMP002', 'EMP003'];
        $positions = ['Warehouse Operator', 'Forklift Driver', 'Logistics Coordinator'];
        foreach ($usersByRole['Employee'] as $i => $u) {
            $employees[] = Employee::firstOrCreate(
                ['employee_code' => $codes[$i]],
                [
                    'user_id' => $u->id,
                    'department_id' => $departments[$i % count($departments)]->id,
                    'position' => $positions[$i],
                    'hire_date' => now()->subMonths(rand(6, 24)),
                    'employment_type' => 'full-time',
                    'salary' => rand(2500, 5500),
                    'phone' => '+40 7' . rand(10000000, 99999999),
                    'address' => 'Str. Demo nr. ' . ($i + 1) . ', București',
                    'status' => 'active',
                ]
            );
        }
        $emp1 = $employees[0];
        $emp2 = $employees[1];

        // Suppliers
        $suppliers = [];
        foreach (
            [
                ['name' => 'Supplier Alpha', 'email' => 'alpha@supplier.com', 'phone' => '+40 21 123 4567'],
                ['name' => 'Supplier Beta', 'email' => 'beta@supplier.com', 'phone' => '+40 21 234 5678'],
                ['name' => 'Supplier Gamma', 'email' => 'gamma@supplier.com', 'phone' => '+40 21 345 6789'],
            ]
            as $s
        ) {
            $suppliers[] = Supplier::firstOrCreate(
                ['email' => $s['email']],
                [
                    'name' => $s['name'],
                    'phone' => $s['phone'],
                    'billing_phone' => $s['phone'],
                    'shipping_phone' => $s['phone'],
                    'contact_person' => 'Contact ' . $s['name'],
                ]
            );
        }
        $supplier1 = $suppliers[0];
        $supplier2 = $suppliers[1];

        // Products
        $products = [];
        $skus = ['SKU-001', 'SKU-002', 'SKU-003', 'SKU-004', 'SKU-005', 'SKU-006', 'SKU-007', 'SKU-008'];
        $names = ['Palet Rafturi', 'Cutie Ambalaj A', 'Cutie Ambalaj B', 'Produs Electronic X', 'Piese Auto', 'Material Textil', 'Consumabile Birou', 'Accesorii Depozit'];
        foreach ($skus as $i => $sku) {
            $products[] = Product::firstOrCreate(
                ['sku' => $sku],
                [
                    'name' => $names[$i],
                    'description' => 'Descriere produs ' . $sku,
                    'price' => round(rand(100, 2000) / 10, 2),
                    'supplier_id' => $suppliers[$i % count($suppliers)]->id,
                ]
            );
        }
        $product1 = $products[0];
        $product2 = $products[1];
        $product3 = $products[2];
        $product4 = $products[3];
        $product5 = $products[4];

        // Deposits
        $deposits = [];
        foreach (['Deposit Nord', 'Deposit Sud'] as $name) {
            $deposits[] = Deposit::firstOrCreate(
                ['name' => $name],
                [
                    'code' => strtoupper(substr(preg_replace('/\s+/', '', $name), 0, 4)) . rand(1, 99),
                    'location' => $name . ', Zona Industrială',
                    'width' => 50,
                    'height' => 8,
                    'depth' => 30,
                    'capacity' => 12000,
                    'status' => 'active',
                    'description' => 'Depozit principal',
                ]
            );
        }
        $deposit1 = $deposits[0];
        $deposit2 = $deposits[1];

        // Shelves
        $shelves = [];
        foreach ($deposits as $d) {
            for ($i = 1; $i <= 4; $i++) {
                $shelves[] = Shelf::firstOrCreate(
                    ['deposit_id' => $d->id, 'name' => "Raft {$i}"],
                    [
                        'code' => "R-{$d->id}-{$i}",
                        'x_position' => $i * 3,
                        'y_position' => 0,
                        'width' => 2.5,
                        'height' => 2,
                        'depth' => 1,
                        'capacity' => 5,
                        'description' => "Raft {$i} - {$d->name}",
                    ]
                );
            }
        }
        $shelf1 = $shelves[0];
        $shelf2 = $shelves[1];
        $shelf3 = $shelves[2];
        $shelf4 = $shelves[4];

        // Walls
        foreach ($deposits as $d) {
            Wall::firstOrCreate(
                ['deposit_id' => $d->id, 'name' => 'Perete Nord'],
                [
                    'x_start' => 0,
                    'y_start' => 0,
                    'x_end' => 50,
                    'y_end' => 0,
                    'thickness' => 0.2,
                    'description' => 'Perete nord',
                ]
            );
            Wall::firstOrCreate(
                ['deposit_id' => $d->id, 'name' => 'Perete Sud'],
                [
                    'x_start' => 0,
                    'y_start' => 30,
                    'x_end' => 50,
                    'y_end' => 30,
                    'thickness' => 0.2,
                    'description' => 'Perete sud',
                ]
            );
        }
        // Doors
        foreach ($deposits as $d) {
            $northWall = Wall::where('deposit_id', $d->id)
                ->where('name', 'Perete Nord')
                ->first();
            if (!$northWall) {
                continue;
            }

            Door::firstOrCreate(
                ['deposit_id' => $d->id, 'wall_id' => $northWall->id],
                [
                    'name' => 'Intrare principală ' . $d->name,
                    'x_position' => 25,
                    'y_position' => 0,
                    'width' => 2,
                    'orientation' => 'horizontal',
                ]
            );
        }

        // Inventories
        $invData = [
            [$product1->id, $deposit1->id, $shelf1->id, 100, 20],
            [$product2->id, $deposit1->id, $shelf1->id, 250, 50],
            [$product3->id, $deposit1->id, $shelf2->id, 80, 15],
            [$product4->id, $deposit1->id, $shelf3->id, 30, 10],
            [$product5->id, $deposit2->id, $shelf4->id, 120, 25],
            [$product1->id, $deposit2->id, $shelf4->id, 60, 15],
        ];
        foreach ($invData as $row) {
            Inventory::firstOrCreate(
                [
                    'product_id' => $row[0],
                    'deposit_id' => $row[1],
                    'shelf_id' => $row[2],
                ],
                ['quantity' => $row[3], 'reorder_level' => $row[4]]
            );
        }

        // Customers
        foreach (
            [
                ['name' => 'Client SRL A', 'email' => 'contact@clienta.ro'],
                ['name' => 'Client SRL B', 'email' => 'office@clientb.ro'],
                ['name' => 'Client SRL C', 'email' => 'cust-demo@demo.ro'],
            ]
            as $c
        ) {
            Customer::firstOrCreate(
                ['email' => $c['email']],
                [
                    'name' => $c['name'],
                    'phone' => '+40 21 ' . rand(100, 999) . ' ' . rand(1000, 9999),
                    'billing_phone' => '+40 31 ' . rand(100, 999) . ' ' . rand(1000, 9999),
                    'shipping_phone' => '+40 41 ' . rand(100, 999) . ' ' . rand(1000, 9999),
                    'contact_person' => 'Manager',
                ]
            );
        }

        // Orders + Order items
        $order = Order::updateOrCreate(
            ['order_number' => 'ORD-00001'],
            [
                'customer_id' => Customer::first()?->id,
                'status' => 'completed',
                'notes' => 'Comandă demo',
                'total_amount' => 0,
            ]
        );
        $total = 0;
        foreach ([[$product1->id, 10, $product1->price], [$product2->id, 5, $product2->price]] as $item) {
            OrderItem::firstOrCreate(
                ['order_id' => $order->id, 'product_id' => $item[0]],
                ['quantity' => $item[1], 'price' => $item[2]]
            );
            $total += $item[1] * $item[2];
        }
        $order->update(['total_amount' => $total]);

        $order2 = Order::updateOrCreate(
            ['order_number' => 'ORD-00002'],
            [
                'customer_id' => Customer::skip(1)->first()?->id,
                'status' => 'pending',
                'notes' => null,
                'total_amount' => 0,
            ]
        );
        OrderItem::firstOrCreate(
            ['order_id' => $order2->id, 'product_id' => $product3->id],
            ['quantity' => 20, 'price' => $product3->price]
        );
        $order2->update(['total_amount' => 20 * $product3->price]);

        // Tasks
        Task::firstOrCreate(
            [
                'assigned_by' => $admin->id,
                'assigned_to' => $employeeUser->id,
                'order_id' => $order->id,
                'title' => 'Pregătire livrare ORD',
            ],
            [
                'description' => 'Verificare stoc și ambalare pentru comandă.',
                'status' => 'completed',
                'due_date' => now()->addDays(2),
                'completed_at' => now(),
            ]
        );
        Task::firstOrCreate(
            [
                'assigned_by' => $admin->id,
                'assigned_to' => $employeeUser->id,
                'order_id' => $order2->id,
                'title' => 'Procesare comandă nouă',
            ],
            [
                'description' => 'Recepție și înregistrare stoc.',
                'status' => 'in_progress',
                'due_date' => now()->addDays(5),
            ]
        );

        // Leave types
        $leaveTypes = [];
        foreach (['Concediu anual', 'Medical', 'Fără plată'] as $name) {
            $leaveTypes[] = LeaveType::firstOrCreate(
                ['name' => $name],
                [
                    'max_days_per_year' => $name === 'Concediu anual' ? 21 : 0,
                    'carry_forward' => $name === 'Concediu anual',
                    'is_active' => true,
                ]
            );
        }
        $ltAnnual = $leaveTypes[0];

        // Leaves
        Leave::firstOrCreate(
            [
                'employee_id' => $emp1->id,
                'leave_type_id' => $ltAnnual->id,
                'start_date' => now()->addDays(10),
                'end_date' => now()->addDays(17),
            ],
            [
                'days' => 5,
                'status' => 'approved',
                'approved_by' => $admin->id,
                'approved_at' => now(),
                'reason' => 'Concediu planificat',
            ]
        );
        Leave::firstOrCreate(
            [
                'employee_id' => $emp2->id,
                'leave_type_id' => $ltAnnual->id,
                'start_date' => now()->addDays(30),
                'end_date' => now()->addDays(32),
            ],
            [
                'days' => 2,
                'status' => 'pending',
                'reason' => 'Concediu scurt',
            ]
        );

        // Salaries
        foreach (array_slice($employees, 0, 3) as $emp) {
            Salary::firstOrCreate(
                [
                    'employee_id' => $emp->id,
                    'effective_date' => now()->startOfMonth()->subMonths(1),
                ],
                [
                    'amount' => $emp->salary ?? 3000,
                    'type' => 'base',
                    'notes' => 'Salariu de bază',
                ]
            );
        }

        // Attendance
        for ($d = 0; $d < 7; $d++) {
            $date = now()->subDays($d)->format('Y-m-d');
            foreach (array_slice($employees, 0, 3) as $emp) {
                Attendance::firstOrCreate(
                    ['employee_id' => $emp->id, 'date' => $date],
                    [
                        'clock_in' => $date . ' 08:00:00',
                        'clock_out' => $date . ' 16:00:00',
                        'total_hours' => 8,
                        'overtime_hours' => 0,
                        'status' => 'present',
                    ]
                );
            }
        }

        // Payroll records
        foreach (array_slice($employees, 0, 3) as $emp) {
            foreach ([0, 1] as $mOffset) {
                $dt = now()->subMonths($mOffset);
                $month = (int) $dt->format('n');
                $year = (int) $dt->format('Y');
                PayrollRecord::firstOrCreate(
                    ['employee_id' => $emp->id, 'month' => $month, 'year' => $year],
                    [
                        'base_salary' => $emp->salary ?? 3000,
                        'deductions' => 0,
                        'bonuses' => 0,
                        'overtime_pay' => 0,
                        'net_salary' => $emp->salary ?? 3000,
                        'status' => $mOffset === 0 ? 'processed' : 'paid',
                        'paid_at' => $mOffset === 1 ? now()->subMonths(1) : null,
                    ]
                );
            }
        }

        // Invoices
        $invoice = Invoice::updateOrCreate(
            ['invoice_number' => 'INV-EX-900001'],
            [
                'supplier_id' => $supplier1->id,
                'customer_id' => null,
                'type' => 'expense',
                'status' => 'paid',
                'issue_date' => now()->subDays(15),
                'due_date' => now()->subDays(5),
                'paid_date' => now()->subDays(3),
                'subtotal' => 1000,
                'tax_amount' => 190,
                'discount_amount' => 0,
                'total_amount' => 1190,
                'category' => 'procurement',
                'description' => 'Factură furnizor Alpha',
            ]
        );

        $invoice2 = Invoice::updateOrCreate(
            ['invoice_number' => 'INV-IN-900002'],
            [
                'supplier_id' => null,
                'customer_id' => Customer::first()?->id,
                'type' => 'income',
                'status' => 'sent',
                'issue_date' => now()->subDays(3),
                'due_date' => now()->addDays(10),
                'paid_date' => null,
                'subtotal' => 2500,
                'tax_amount' => 475,
                'discount_amount' => 0,
                'total_amount' => 2975,
                'category' => 'sales',
                'description' => 'Factură client A',
            ]
        );

        // Invoice items
        InvoiceItem::updateOrCreate(
            ['invoice_id' => $invoice->id, 'position' => 0],
            [
                'item_type' => 'product',
                'product_id' => $product1->id,
                'name' => $product1->name,
                'sku' => $product1->sku,
                'description' => $product1->description,
                'quantity' => 10,
                'unit' => 'buc',
                'unit_price' => 100,
                'tax_rate' => 19,
                'discount_rate' => 0,
                'line_subtotal' => 1000,
                'line_tax' => 190,
                'line_total' => 1190,
            ]
        );
        InvoiceItem::updateOrCreate(
            ['invoice_id' => $invoice2->id, 'position' => 0],
            [
                'item_type' => 'service',
                'product_id' => null,
                'name' => 'Servicii logistică',
                'sku' => null,
                'description' => 'Servicii manipulare și livrare',
                'quantity' => 5,
                'unit' => 'ore',
                'unit_price' => 500,
                'tax_rate' => 19,
                'discount_rate' => 0,
                'line_subtotal' => 2500,
                'line_tax' => 475,
                'line_total' => 2975,
            ]
        );

        // Transactions
        Transaction::updateOrCreate(
            ['transaction_number' => 'TXN-00000001'],
            [
                'supplier_id' => $supplier1->id,
                'customer_id' => null,
                'invoice_id' => $invoice->id,
                'type' => 'payment',
                'category' => 'supplier_payment',
                'amount' => 1190,
                'payment_method' => 'bank_transfer',
                'transaction_date' => now()->subDays(3),
                'description' => 'Plată factură ' . $invoice->invoice_number,
            ]
        );
        Transaction::updateOrCreate(
            ['transaction_number' => 'TXN-00000002'],
            [
                'supplier_id' => null,
                'customer_id' => Customer::first()?->id,
                'invoice_id' => $invoice2->id,
                'type' => 'receipt',
                'category' => 'customer_payment',
                'amount' => 1000,
                'payment_method' => 'bank_transfer',
                'transaction_date' => now()->subDay(),
                'description' => 'Încasare parțială factură ' . $invoice2->invoice_number,
            ]
        );

        // Settings
        foreach (['company_name' => 'WMS Demo', 'timezone' => 'Europe/Bucharest', 'currency' => 'RON'] as $key => $value) {
            Setting::firstOrCreate(
                ['key' => $key],
                ['value' => $value, 'created_by_id' => $admin->id, 'updated_by_id' => $admin->id]
            );
        }

        $this->command->info('Demo data seeded successfully.');
    }
}

<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Task;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Seeder;

class ElectroCatalogSeeder extends Seeder
{
    private const TAX_RATE = 19;

    public function run(): void
    {
        $this->command->info('Seeding electro catalog data...');

        $admin = User::where('email', 'admin@wms.com')->first();
        $employeeUser = User::where('email', 'employee@wms.com')->first();

        if (!$admin || !$employeeUser) {
            $this->command->warn('Run UserSeeder first (admin@wms.com, employee@wms.com).');

            return;
        }

        $department = Department::firstOrCreate(
            ['name' => 'Warehouse'],
            ['description' => 'Departament depozit']
        );

        $employee = Employee::updateOrCreate(
            ['user_id' => $employeeUser->id],
            [
                'employee_code' => 'EMP-ELC-001',
                'department_id' => $department->id,
                'position' => 'Operator depozit',
                'hire_date' => now()->subYear(),
                'employment_type' => 'full-time',
                'salary' => 4200,
                'phone' => '0722 000 111',
                'address' => 'Str. Industriilor nr. 10, București',
                'status' => 'active',
            ]
        );

        $suppliers = $this->seedSuppliers();
        $products = $this->seedProducts($suppliers);
        $customers = $this->seedCustomers();
        $this->seedInvoices($suppliers, $products, $customers);
        $orders = $this->seedOrders($products, $customers, $employee);
        $this->seedTask($admin, $employeeUser, $orders[0]);

        $this->command->info('Electro catalog data seeded successfully.');
    }

    private function seedSuppliers(): array
    {
        $data = [
            [
                'code' => 'SUP-001',
                'name' => 'Electro Distribution SRL',
                'contact_person' => 'Andrei Popescu',
                'phone' => '0722 123 456',
                'email' => 'vanzari@electrodistribution.ro',
                'city' => 'București',
            ],
            [
                'code' => 'SUP-002',
                'name' => 'Lumina Tech SRL',
                'contact_person' => 'Mihai Ionescu',
                'phone' => '0733 222 111',
                'email' => 'office@luminatech.ro',
                'city' => 'Cluj-Napoca',
            ],
            [
                'code' => 'SUP-003',
                'name' => 'NetConnect Distribution',
                'contact_person' => 'Cristian Dumitru',
                'phone' => '0744 555 777',
                'email' => 'sales@netconnect.ro',
                'city' => 'Brașov',
            ],
            [
                'code' => 'SUP-004',
                'name' => 'Network Solutions SRL',
                'contact_person' => 'Ioana Marin',
                'phone' => '0721 333 444',
                'email' => 'office@networksolutions.ro',
                'city' => 'Timișoara',
            ],
            [
                'code' => 'SUP-005',
                'name' => 'IT Hardware Import SRL',
                'contact_person' => 'Alexandru Stan',
                'phone' => '0755 888 999',
                'email' => 'contact@ithardware.ro',
                'city' => 'Iași',
            ],
            [
                'code' => 'SUP-006',
                'name' => 'Power Systems Distribution',
                'contact_person' => 'Radu Ene',
                'phone' => '0730 111 222',
                'email' => 'office@powersystems.ro',
                'city' => 'Constanța',
            ],
        ];

        $suppliers = [];
        foreach ($data as $row) {
            $suppliers[$row['code']] = Supplier::updateOrCreate(
                ['email' => $row['email']],
                [
                    'name' => $row['name'],
                    'company_name' => $row['name'],
                    'phone' => $row['phone'],
                    'billing_phone' => $row['phone'],
                    'shipping_phone' => $row['phone'],
                    'contact_person' => $row['contact_person'],
                    'billing_city' => $row['city'],
                    'shipping_city' => $row['city'],
                    'billing_country' => 'România',
                    'shipping_country' => 'România',
                    'registration_number' => $row['code'],
                    'payment_terms_days' => 30,
                ]
            );
        }

        return $suppliers;
    }

    private function seedProducts(array $suppliers): array
    {
        $data = [
            [
                'sku' => 'ELC-0001',
                'name' => 'Baterii AA Alcaline (4 buc)',
                'category' => 'Consumabile',
                'description' => 'Set de 4 baterii alcaline 1.5V pentru echipamente electronice.',
                'price' => 18.90,
                'origin' => 'purchased',
                'supplier' => 'SUP-001',
            ],
            [
                'sku' => 'ELC-0002',
                'name' => 'Bec LED E27 10W 4000K',
                'category' => 'Iluminat',
                'description' => 'Bec LED lumină neutră, consum redus, durată de viață 25.000 ore.',
                'price' => 14.50,
                'origin' => 'purchased',
                'supplier' => 'SUP-002',
            ],
            [
                'sku' => 'ELC-0003',
                'name' => 'Cablu UTP Cat6 305m',
                'category' => 'Rețelistică',
                'description' => 'Cablu UTP Cat6 din cupru pentru instalații de rețea.',
                'price' => 649.00,
                'origin' => 'purchased',
                'supplier' => 'SUP-003',
            ],
            [
                'sku' => 'ELC-0004',
                'name' => 'Conector RJ45 Cat6',
                'category' => 'Rețelistică',
                'description' => 'Conector modular RJ45 compatibil Cat6.',
                'price' => 2.20,
                'origin' => 'purchased',
                'supplier' => 'SUP-003',
            ],
            [
                'sku' => 'ELC-0005',
                'name' => 'Switch Gigabit 8 Porturi',
                'category' => 'Rețelistică',
                'description' => 'Switch unmanaged 8x Gigabit Ethernet.',
                'price' => 179.00,
                'origin' => 'purchased',
                'supplier' => 'SUP-004',
            ],
            [
                'sku' => 'PRD-0001',
                'name' => 'Panou de comandă PC-100',
                'category' => 'Automatizări',
                'description' => 'Panou electric asamblat pentru aplicații industriale.',
                'price' => 1850.00,
                'origin' => 'manufactured',
                'supplier' => null,
            ],
            [
                'sku' => 'PRD-0002',
                'name' => 'Tablou electric TE-24',
                'category' => 'Automatizări',
                'description' => 'Tablou electric metalic echipat cu 24 module.',
                'price' => 980.00,
                'origin' => 'manufactured',
                'supplier' => null,
            ],
            [
                'sku' => 'PRD-0003',
                'name' => 'Modul distribuție MD-8',
                'category' => 'Automatizări',
                'description' => 'Modul de distribuție alimentare 24V DC pentru tablouri electrice.',
                'price' => 145.00,
                'origin' => 'manufactured',
                'supplier' => null,
            ],
            [
                'sku' => 'ELC-0006',
                'name' => 'SSD SATA 1TB',
                'category' => 'Componente PC',
                'description' => 'SSD 2.5", SATA III, capacitate 1 TB.',
                'price' => 329.00,
                'origin' => 'purchased',
                'supplier' => 'SUP-005',
            ],
            [
                'sku' => 'ELC-0007',
                'name' => 'UPS 1500VA',
                'category' => 'Alimentare',
                'description' => 'UPS Line-Interactive pentru protecția echipamentelor.',
                'price' => 799.00,
                'origin' => 'purchased',
                'supplier' => 'SUP-006',
            ],
        ];

        $products = [];
        foreach ($data as $row) {
            $supplierId = $row['supplier'] ? $suppliers[$row['supplier']]->id : null;
            $description = "Categorie: {$row['category']}. {$row['description']}";

            $products[$row['sku']] = Product::updateOrCreate(
                ['sku' => $row['sku']],
                [
                    'name' => $row['name'],
                    'description' => $description,
                    'price' => $row['price'],
                    'origin' => $row['origin'],
                    'supplier_id' => $supplierId,
                ]
            );
        }

        return $products;
    }

    private function seedCustomers(): array
    {
        $data = [
            [
                'name' => 'Instal Electric SRL',
                'email' => 'comenzi@instalelectric.ro',
                'phone' => '021 456 7890',
                'city' => 'București',
            ],
            [
                'name' => 'Proiect Industrial SA',
                'email' => 'achizitii@proiectindustrial.ro',
                'phone' => '0264 111 222',
                'city' => 'Cluj-Napoca',
            ],
        ];

        $customers = [];
        foreach ($data as $row) {
            $customers[] = Customer::updateOrCreate(
                ['email' => $row['email']],
                [
                    'name' => $row['name'],
                    'phone' => $row['phone'],
                    'billing_phone' => $row['phone'],
                    'shipping_phone' => $row['phone'],
                    'contact_person' => 'Departament achiziții',
                    'billing_city' => $row['city'],
                    'shipping_city' => $row['city'],
                ]
            );
        }

        return $customers;
    }

    private function seedInvoices(array $suppliers, array $products, array $customers): void
    {
        $this->createExpenseInvoice(
            number: 'INV-EX-ELC-001',
            supplier: $suppliers['SUP-001'],
            status: 'paid',
            issueDate: now()->subDays(20),
            dueDate: now()->subDays(10),
            paidDate: now()->subDays(8),
            category: 'procurement',
            description: 'Achiziție consumabile și iluminat',
            lines: [
                ['product' => $products['ELC-0001'], 'quantity' => 50],
                ['product' => $products['ELC-0002'], 'quantity' => 100],
            ],
            payment: [
                'number' => 'TXN-ELC-00001',
                'amount' => null,
                'date' => now()->subDays(8),
            ],
        );

        $this->createExpenseInvoice(
            number: 'INV-EX-ELC-002',
            supplier: $suppliers['SUP-003'],
            status: 'sent',
            issueDate: now()->subDays(7),
            dueDate: now()->addDays(23),
            paidDate: null,
            category: 'procurement',
            description: 'Materiale rețelistică - comandă în așteptare plată',
            lines: [
                ['product' => $products['ELC-0003'], 'quantity' => 2],
                ['product' => $products['ELC-0004'], 'quantity' => 200],
            ],
        );

        $this->createExpenseInvoice(
            number: 'INV-EX-ELC-003',
            supplier: $suppliers['SUP-005'],
            status: 'paid',
            issueDate: now()->subDays(14),
            dueDate: now()->subDays(4),
            paidDate: now()->subDays(2),
            category: 'procurement',
            description: 'Stoc componente PC',
            lines: [
                ['product' => $products['ELC-0006'], 'quantity' => 10],
            ],
            payment: [
                'number' => 'TXN-ELC-00002',
                'amount' => null,
                'date' => now()->subDays(2),
            ],
        );

        $this->createExpenseInvoice(
            number: 'INV-EX-ELC-004',
            supplier: $suppliers['SUP-006'],
            status: 'overdue',
            issueDate: now()->subDays(45),
            dueDate: now()->subDays(15),
            paidDate: null,
            category: 'procurement',
            description: 'Echipamente alimentare neachitate',
            lines: [
                ['product' => $products['ELC-0007'], 'quantity' => 3],
            ],
        );

        $this->createIncomeInvoice(
            number: 'INV-IN-ELC-001',
            customer: $customers[0],
            status: 'paid',
            issueDate: now()->subDays(12),
            dueDate: now()->subDays(2),
            paidDate: now()->subDays(1),
            category: 'sales',
            description: 'Vânzare panouri și tablouri proprii',
            lines: [
                ['product' => $products['PRD-0001'], 'quantity' => 1],
                ['product' => $products['PRD-0002'], 'quantity' => 2],
            ],
            payment: [
                'number' => 'TXN-ELC-00003',
                'amount' => null,
                'date' => now()->subDays(1),
            ],
        );

        $this->createIncomeInvoice(
            number: 'INV-IN-ELC-002',
            customer: $customers[1],
            status: 'sent',
            issueDate: now()->subDays(5),
            dueDate: now()->addDays(25),
            paidDate: null,
            category: 'sales',
            description: 'Echipamente rețea și iluminat',
            lines: [
                ['product' => $products['ELC-0005'], 'quantity' => 4],
                ['product' => $products['ELC-0002'], 'quantity' => 30],
            ],
            payment: [
                'number' => 'TXN-ELC-00004',
                'amount' => 1500.00,
                'date' => now()->subDay(),
                'partial' => true,
            ],
        );
    }

    private function seedOrders(array $products, array $customers, Employee $employee): array
    {
        $orders = [];

        $order1 = Order::updateOrCreate(
            ['order_number' => 'ORD-ELC-1001'],
            [
                'customer_id' => $customers[0]->id,
                'assigned_to' => $employee->id,
                'status' => 'processing',
                'notes' => 'Comandă în desfășurare - panou comandă și switch rețea',
                'total_amount' => 0,
            ]
        );
        $total1 = $this->syncOrderItems($order1, [
            ['product' => $products['PRD-0001'], 'quantity' => 1],
            ['product' => $products['ELC-0005'], 'quantity' => 2],
        ]);
        $order1->update(['total_amount' => $total1]);
        $orders[] = $order1;

        $order2 = Order::updateOrCreate(
            ['order_number' => 'ORD-ELC-1002'],
            [
                'customer_id' => $customers[1]->id,
                'assigned_to' => $employee->id,
                'status' => 'processing',
                'notes' => 'Comandă în desfășurare - tablou electric și modul distribuție',
                'total_amount' => 0,
            ]
        );
        $total2 = $this->syncOrderItems($order2, [
            ['product' => $products['PRD-0002'], 'quantity' => 1],
            ['product' => $products['PRD-0003'], 'quantity' => 3],
        ]);
        $order2->update(['total_amount' => $total2]);
        $orders[] = $order2;

        return $orders;
    }

    private function seedTask(User $admin, User $employeeUser, Order $order): void
    {
        Task::updateOrCreate(
            [
                'assigned_by' => $admin->id,
                'assigned_to' => $employeeUser->id,
                'order_id' => $order->id,
                'title' => 'Pregătire comandă ' . $order->order_number,
            ],
            [
                'description' => 'Verificare stoc, ambalare și etichetare produse pentru livrare.',
                'status' => 'in_progress',
                'due_date' => now()->addDays(3),
            ]
        );
    }

    private function syncOrderItems(Order $order, array $lines): float
    {
        $total = 0.0;

        foreach ($lines as $index => $line) {
            $product = $line['product'];
            $quantity = $line['quantity'];
            $price = (float) $product->price;

            OrderItem::updateOrCreate(
                ['order_id' => $order->id, 'product_id' => $product->id],
                ['quantity' => $quantity, 'price' => $price]
            );

            $total += $quantity * $price;
        }

        return round($total, 2);
    }

    private function createExpenseInvoice(
        string $number,
        Supplier $supplier,
        string $status,
        $issueDate,
        $dueDate,
        $paidDate,
        string $category,
        string $description,
        array $lines,
        ?array $payment = null,
    ): Invoice {
        $totals = $this->calculateTotals($lines);

        $invoice = Invoice::updateOrCreate(
            ['invoice_number' => $number],
            [
                'supplier_id' => $supplier->id,
                'customer_id' => null,
                'type' => 'expense',
                'status' => $status,
                'issue_date' => $issueDate,
                'due_date' => $dueDate,
                'paid_date' => $paidDate,
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax'],
                'discount_amount' => 0,
                'total_amount' => $totals['total'],
                'category' => $category,
                'description' => $description,
            ]
        );

        $this->syncInvoiceItems($invoice, $lines);

        if ($payment) {
            $amount = $payment['amount'] ?? $totals['total'];
            Transaction::updateOrCreate(
                ['transaction_number' => $payment['number']],
                [
                    'supplier_id' => $supplier->id,
                    'customer_id' => null,
                    'invoice_id' => $invoice->id,
                    'type' => 'payment',
                    'category' => 'supplier_payment',
                    'amount' => $amount,
                    'payment_method' => 'bank_transfer',
                    'transaction_date' => $payment['date'],
                    'description' => 'Plată factură ' . $invoice->invoice_number,
                ]
            );
        }

        return $invoice;
    }

    private function createIncomeInvoice(
        string $number,
        Customer $customer,
        string $status,
        $issueDate,
        $dueDate,
        $paidDate,
        string $category,
        string $description,
        array $lines,
        ?array $payment = null,
    ): Invoice {
        $totals = $this->calculateTotals($lines);

        $invoice = Invoice::updateOrCreate(
            ['invoice_number' => $number],
            [
                'supplier_id' => null,
                'customer_id' => $customer->id,
                'type' => 'income',
                'status' => $status,
                'issue_date' => $issueDate,
                'due_date' => $dueDate,
                'paid_date' => $paidDate,
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax'],
                'discount_amount' => 0,
                'total_amount' => $totals['total'],
                'category' => $category,
                'description' => $description,
            ]
        );

        $this->syncInvoiceItems($invoice, $lines);

        if ($payment) {
            $amount = $payment['amount'] ?? $totals['total'];
            Transaction::updateOrCreate(
                ['transaction_number' => $payment['number']],
                [
                    'supplier_id' => null,
                    'customer_id' => $customer->id,
                    'invoice_id' => $invoice->id,
                    'type' => 'receipt',
                    'category' => 'customer_payment',
                    'amount' => $amount,
                    'payment_method' => 'bank_transfer',
                    'transaction_date' => $payment['date'],
                    'description' => ($payment['partial'] ?? false ? 'Încasare parțială ' : 'Încasare ')
                        . 'factură ' . $invoice->invoice_number,
                ]
            );
        }

        return $invoice;
    }

    private function syncInvoiceItems(Invoice $invoice, array $lines): void
    {
        foreach ($lines as $position => $line) {
            $product = $line['product'];
            $quantity = (float) $line['quantity'];
            $unitPrice = (float) $product->price;
            $lineSubtotal = round($quantity * $unitPrice, 2);
            $lineTax = round($lineSubtotal * self::TAX_RATE / 100, 2);
            $lineTotal = round($lineSubtotal + $lineTax, 2);

            InvoiceItem::updateOrCreate(
                ['invoice_id' => $invoice->id, 'position' => $position],
                [
                    'item_type' => 'product',
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'description' => $product->description,
                    'quantity' => $quantity,
                    'unit' => 'buc',
                    'unit_price' => $unitPrice,
                    'tax_rate' => self::TAX_RATE,
                    'discount_rate' => 0,
                    'line_subtotal' => $lineSubtotal,
                    'line_tax' => $lineTax,
                    'line_total' => $lineTotal,
                ]
            );
        }
    }

    private function calculateTotals(array $lines): array
    {
        $subtotal = 0.0;

        foreach ($lines as $line) {
            $subtotal += (float) $line['product']->price * (float) $line['quantity'];
        }

        $subtotal = round($subtotal, 2);
        $tax = round($subtotal * self::TAX_RATE / 100, 2);

        return [
            'subtotal' => $subtotal,
            'tax' => $tax,
            'total' => round($subtotal + $tax, 2),
        ];
    }
}

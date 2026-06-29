<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\SalaryController;
use App\Http\Controllers\Api\LeaveTypeController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\PayrollRecordController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\DepositController;
use App\Http\Controllers\Api\ShelfController;
use App\Http\Controllers\Api\WallController;
use App\Http\Controllers\Api\DoorController;
use App\Http\Controllers\Api\FinancialDashboardController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\BiometricController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/biometric/events', [BiometricController::class, 'storeEvent']);

Route::middleware(['auth:sanctum', 'ensure.user'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user', [AuthController::class, 'updateProfile']);
    Route::post('/user/avatar', [AuthController::class, 'uploadAvatar']);

    Route::get('/products', [ProductController::class, 'index'])->middleware('permission:view products,web');
    Route::post('/products', [ProductController::class, 'store'])->middleware('permission:create products,web');
    Route::get('/products/{product}', [ProductController::class, 'show'])->middleware('permission:view products,web');
    Route::put('/products/{product}', [ProductController::class, 'update'])->middleware('permission:edit products,web');
    Route::patch('/products/{product}', [ProductController::class, 'update'])->middleware('permission:edit products,web');
    Route::post('/products/{product}/images', [ProductController::class, 'uploadImage'])->middleware('permission:edit products,web');
    Route::delete('/products/{product}/images', [ProductController::class, 'deleteImage'])->middleware('permission:edit products,web');
    Route::delete('/products/{product}', [ProductController::class, 'destroy'])->middleware('permission:delete products,web');

    Route::get('/inventory', [InventoryController::class, 'index'])->middleware('permission:view inventory,web');
    Route::post('/inventory', [InventoryController::class, 'store'])->middleware('permission:manage inventory,web');
    Route::get('/inventory/{inventory}', [InventoryController::class, 'show'])->middleware('permission:view inventory,web');
    Route::get('/inventory/{inventory}/activity', [InventoryController::class, 'activity'])->middleware('permission:view inventory,web');
    Route::put('/inventory/{inventory}', [InventoryController::class, 'update'])->middleware('permission:manage inventory,web');
    Route::patch('/inventory/{inventory}', [InventoryController::class, 'update'])->middleware('permission:manage inventory,web');
    Route::delete('/inventory/{inventory}', [InventoryController::class, 'destroy'])->middleware('permission:manage inventory,web');
    Route::post('/inventory/{inventory}/adjust', [InventoryController::class, 'adjust'])->middleware('permission:adjust inventory,web');

    Route::get('/orders', [OrderController::class, 'index'])->middleware('permission:view orders,web');
    Route::post('/orders', [OrderController::class, 'store'])->middleware('permission:create orders,web');
    Route::get('/orders/{order}', [OrderController::class, 'show'])->middleware('permission:view orders,web');
    Route::put('/orders/{order}', [OrderController::class, 'update'])->middleware('permission:edit orders,web');
    Route::patch('/orders/{order}', [OrderController::class, 'update'])->middleware('permission:edit orders,web');
    Route::delete('/orders/{order}', [OrderController::class, 'destroy'])->middleware('permission:delete orders,web');
    Route::post('/orders/{order}/documents', [OrderController::class, 'uploadDocument'])->middleware('permission:edit orders,web');
    Route::delete('/orders/{order}/documents/{document}', [OrderController::class, 'deleteDocument'])->middleware('permission:edit orders,web');
    Route::put('/orders/{order}/assign', [OrderController::class, 'assign'])->middleware('permission:edit orders,web');
    Route::post('/orders/{order}/generate-invoice', [OrderController::class, 'generateInvoice'])->middleware('permission:edit orders,web');

    Route::get('/suppliers', [SupplierController::class, 'index'])->middleware('permission:view suppliers,web');
    Route::post('/suppliers', [SupplierController::class, 'store'])->middleware('permission:create suppliers,web');
    Route::get('/suppliers/{supplier}', [SupplierController::class, 'show'])->middleware('permission:view suppliers,web');
    Route::put('/suppliers/{supplier}', [SupplierController::class, 'update'])->middleware('permission:edit suppliers,web');
    Route::patch('/suppliers/{supplier}', [SupplierController::class, 'update'])->middleware('permission:edit suppliers,web');
    Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy'])->middleware('permission:delete suppliers,web');

    Route::get('/customers', [CustomerController::class, 'index'])->middleware('role_or_permission:view customers|view orders|view invoices,web');
    Route::post('/customers', [CustomerController::class, 'store'])->middleware('permission:create customers,web');
    Route::get('/customers/{customer}', [CustomerController::class, 'show'])->middleware('permission:view customers,web');
    Route::put('/customers/{customer}', [CustomerController::class, 'update'])->middleware('permission:edit customers,web');
    Route::patch('/customers/{customer}', [CustomerController::class, 'update'])->middleware('permission:edit customers,web');
    Route::delete('/customers/{customer}', [CustomerController::class, 'destroy'])->middleware('permission:delete customers,web');

    Route::get('/tasks', [TaskController::class, 'index'])->middleware('permission:view tasks,web');
    Route::post('/tasks', [TaskController::class, 'store'])->middleware('permission:create tasks,web');
    Route::get('/tasks/{task}', [TaskController::class, 'show'])->middleware('permission:view tasks,web');
    Route::put('/tasks/{task}', [TaskController::class, 'update']);
    Route::patch('/tasks/{task}', [TaskController::class, 'update']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy'])->middleware('permission:delete tasks,web');

    Route::get('/departments', [DepartmentController::class, 'index'])->middleware('permission:view employees,web');
    Route::post('/departments', [DepartmentController::class, 'store'])->middleware('permission:create employees,web');
    Route::get('/departments/{department}', [DepartmentController::class, 'show'])->middleware('permission:view employees,web');
    Route::put('/departments/{department}', [DepartmentController::class, 'update'])->middleware('permission:edit employees,web');
    Route::patch('/departments/{department}', [DepartmentController::class, 'update'])->middleware('permission:edit employees,web');
    Route::delete('/departments/{department}', [DepartmentController::class, 'destroy'])->middleware('permission:delete employees,web');

    Route::get('/employees', [EmployeeController::class, 'index'])->middleware('permission:view employees,web');
    Route::post('/employees', [EmployeeController::class, 'store'])->middleware('permission:create employees,web');
    Route::get('/employees/{employee}', [EmployeeController::class, 'show'])->middleware('permission:view employees,web');
    Route::put('/employees/{employee}', [EmployeeController::class, 'update'])->middleware('permission:edit employees,web');
    Route::patch('/employees/{employee}', [EmployeeController::class, 'update'])->middleware('permission:edit employees,web');
    Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->middleware('permission:delete employees,web');

    Route::get('/salaries', [SalaryController::class, 'index'])->middleware('permission:view salaries,web');
    Route::post('/salaries', [SalaryController::class, 'store'])->middleware('permission:manage salaries,web');
    Route::get('/salaries/{salary}', [SalaryController::class, 'show'])->middleware('permission:view salaries,web');
    Route::put('/salaries/{salary}', [SalaryController::class, 'update'])->middleware('permission:manage salaries,web');
    Route::patch('/salaries/{salary}', [SalaryController::class, 'update'])->middleware('permission:manage salaries,web');
    Route::delete('/salaries/{salary}', [SalaryController::class, 'destroy'])->middleware('permission:manage salaries,web');

    Route::get('/leave-types', [LeaveTypeController::class, 'index'])->middleware('permission:view leave types,web');
    Route::post('/leave-types', [LeaveTypeController::class, 'store'])->middleware('permission:manage leave types,web');
    Route::get('/leave-types/{leaveType}', [LeaveTypeController::class, 'show'])->middleware('permission:view leave types,web');
    Route::put('/leave-types/{leaveType}', [LeaveTypeController::class, 'update'])->middleware('permission:manage leave types,web');
    Route::patch('/leave-types/{leaveType}', [LeaveTypeController::class, 'update'])->middleware('permission:manage leave types,web');
    Route::delete('/leave-types/{leaveType}', [LeaveTypeController::class, 'destroy'])->middleware('permission:manage leave types,web');

    Route::get('/leaves', [LeaveController::class, 'index'])->middleware('permission:view leaves,web');
    Route::post('/leaves', [LeaveController::class, 'store'])->middleware('permission:create leaves,web');
    Route::get('/leaves/{leave}', [LeaveController::class, 'show'])->middleware('permission:view leaves,web');
    Route::put('/leaves/{leave}', [LeaveController::class, 'update'])->middleware('permission:edit leaves,web');
    Route::patch('/leaves/{leave}', [LeaveController::class, 'update'])->middleware('permission:edit leaves,web');
    Route::delete('/leaves/{leave}', [LeaveController::class, 'destroy'])->middleware('permission:delete leaves,web');

    Route::get('/attendance', [AttendanceController::class, 'index'])->middleware('permission:view attendance,web');
    Route::post('/attendance', [AttendanceController::class, 'store'])->middleware('permission:manage attendance,web');
    Route::get('/attendance/{attendance}', [AttendanceController::class, 'show'])->middleware('permission:view attendance,web');
    Route::put('/attendance/{attendance}', [AttendanceController::class, 'update'])->middleware('permission:manage attendance,web');
    Route::patch('/attendance/{attendance}', [AttendanceController::class, 'update'])->middleware('permission:manage attendance,web');
    Route::delete('/attendance/{attendance}', [AttendanceController::class, 'destroy'])->middleware('permission:manage attendance,web');

    Route::get('/payroll-records', [PayrollRecordController::class, 'index'])->middleware('permission:view payroll,web');
    Route::post('/payroll-records', [PayrollRecordController::class, 'store'])->middleware('permission:manage payroll,web');
    Route::get('/payroll-records/{payrollRecord}', [PayrollRecordController::class, 'show'])->middleware('permission:view payroll,web');
    Route::put('/payroll-records/{payrollRecord}', [PayrollRecordController::class, 'update'])->middleware('permission:manage payroll,web');
    Route::patch('/payroll-records/{payrollRecord}', [PayrollRecordController::class, 'update'])->middleware('permission:manage payroll,web');
    Route::delete('/payroll-records/{payrollRecord}', [PayrollRecordController::class, 'destroy'])->middleware('permission:manage payroll,web');

    Route::get('/financial/dashboard', [FinancialDashboardController::class, 'index'])->middleware('permission:view financial,web');
    Route::get('/financial/export', [FinancialDashboardController::class, 'export'])->middleware('permission:view financial,web');

    Route::get('/invoices', [InvoiceController::class, 'index'])->middleware('permission:view invoices,web');
    Route::post('/invoices', [InvoiceController::class, 'store'])->middleware('permission:create invoices,web');
    Route::get('/invoices/{invoice}', [InvoiceController::class, 'show'])->middleware('permission:view invoices,web');
    Route::put('/invoices/{invoice}', [InvoiceController::class, 'update'])->middleware('permission:edit invoices,web');
    Route::patch('/invoices/{invoice}', [InvoiceController::class, 'update'])->middleware('permission:edit invoices,web');
    Route::post('/invoices/{invoice}/attachments', [InvoiceController::class, 'uploadAttachments'])->middleware('permission:edit invoices,web');
    Route::delete('/invoices/{invoice}', [InvoiceController::class, 'destroy'])->middleware('permission:delete invoices,web');

    Route::get('/payments', [PaymentController::class, 'index'])->middleware('permission:view payments,web');
    Route::post('/payments', [PaymentController::class, 'store'])->middleware('permission:create payments,web');
    Route::get('/payments/{payment}', [PaymentController::class, 'show'])->middleware('permission:view payments,web');
    Route::put('/payments/{payment}', [PaymentController::class, 'update'])->middleware('permission:edit payments,web');
    Route::patch('/payments/{payment}', [PaymentController::class, 'update'])->middleware('permission:edit payments,web');
    Route::delete('/payments/{payment}', [PaymentController::class, 'destroy'])->middleware('permission:delete payments,web');

    Route::get('/deposits', [DepositController::class, 'index'])->middleware('permission:view deposits,web');
    Route::post('/deposits', [DepositController::class, 'store'])->middleware('permission:create deposits,web');
    Route::get('/deposits/{deposit}', [DepositController::class, 'show'])->middleware('permission:view deposits,web');
    Route::put('/deposits/{deposit}', [DepositController::class, 'update'])->middleware('permission:edit deposits,web');
    Route::patch('/deposits/{deposit}', [DepositController::class, 'update'])->middleware('permission:edit deposits,web');
    Route::delete('/deposits/{deposit}', [DepositController::class, 'destroy'])->middleware('permission:delete deposits,web');

    Route::get('/deposits/{depositId}/shelves', [ShelfController::class, 'index'])->middleware('permission:view deposits,web');
    Route::post('/deposits/{depositId}/shelves', [ShelfController::class, 'store'])->middleware('permission:edit deposits,web');
    Route::get('/deposits/{depositId}/shelves/{shelf}', [ShelfController::class, 'show'])->middleware('permission:view deposits,web');
    Route::put('/deposits/{depositId}/shelves/{shelf}', [ShelfController::class, 'update'])->middleware('permission:edit deposits,web');
    Route::patch('/deposits/{depositId}/shelves/{shelf}', [ShelfController::class, 'update'])->middleware('permission:edit deposits,web');
    Route::delete('/deposits/{depositId}/shelves/{shelf}', [ShelfController::class, 'destroy'])->middleware('permission:edit deposits,web');
    
    Route::get('/deposits/{depositId}/shelves/{shelf}/products', [ShelfController::class, 'getProducts'])->middleware('permission:view deposits,web');
    Route::post('/deposits/{depositId}/shelves/{shelf}/products', [ShelfController::class, 'assignProduct'])->middleware('permission:edit deposits,web');
    Route::put('/deposits/{depositId}/shelves/{shelf}/products/{product}', [ShelfController::class, 'updateProductQuantity'])->middleware('permission:edit deposits,web');
    Route::delete('/deposits/{depositId}/shelves/{shelf}/products/{product}', [ShelfController::class, 'removeProduct'])->middleware('permission:edit deposits,web');

    Route::get('/deposits/{depositId}/walls', [WallController::class, 'index'])->middleware('permission:view deposits,web');
    Route::post('/deposits/{depositId}/walls', [WallController::class, 'store'])->middleware('permission:edit deposits,web');
    Route::get('/deposits/{depositId}/walls/{wall}', [WallController::class, 'show'])->middleware('permission:view deposits,web');
    Route::put('/deposits/{depositId}/walls/{wall}', [WallController::class, 'update'])->middleware('permission:edit deposits,web');
    Route::patch('/deposits/{depositId}/walls/{wall}', [WallController::class, 'update'])->middleware('permission:edit deposits,web');
    Route::delete('/deposits/{depositId}/walls/{wall}', [WallController::class, 'destroy'])->middleware('permission:edit deposits,web');

    Route::get('/deposits/{depositId}/doors', [DoorController::class, 'index'])->middleware('permission:view deposits,web');
    Route::post('/deposits/{depositId}/doors', [DoorController::class, 'store'])->middleware('permission:edit deposits,web');
    Route::get('/deposits/{depositId}/doors/{door}', [DoorController::class, 'show'])->middleware('permission:view deposits,web');
    Route::put('/deposits/{depositId}/doors/{door}', [DoorController::class, 'update'])->middleware('permission:edit deposits,web');
    Route::patch('/deposits/{depositId}/doors/{door}', [DoorController::class, 'update'])->middleware('permission:edit deposits,web');
    Route::delete('/deposits/{depositId}/doors/{door}', [DoorController::class, 'destroy'])->middleware('permission:edit deposits,web');

    Route::get('/settings', [SettingsController::class, 'index']);
    Route::put('/settings', [SettingsController::class, 'update']);
    Route::post('/settings/logo', [SettingsController::class, 'uploadLogo']);
    Route::post('/settings/smtp/test', [SettingsController::class, 'sendSmtpTestEmail']);
    Route::get('/settings/invoice-data', [SettingsController::class, 'invoiceData']);

    Route::get('/biometric/devices', [BiometricController::class, 'indexDevices']);
    Route::post('/biometric/devices', [BiometricController::class, 'storeDevice']);
    Route::put('/biometric/devices/{device}', [BiometricController::class, 'updateDevice']);
    Route::patch('/biometric/devices/{device}', [BiometricController::class, 'updateDevice']);
    Route::get('/biometric/deposits', [BiometricController::class, 'indexDeposits']);
    Route::get('/biometric/events', [BiometricController::class, 'listEvents']);
    Route::get('/biometric/users/{user}/templates', [BiometricController::class, 'indexUserTemplates']);
    Route::post('/biometric/users/{user}/templates', [BiometricController::class, 'storeUserTemplate']);
    Route::post('/biometric/users/{user}/enroll', [BiometricController::class, 'enrollUserFromDevice']);
    Route::post('/biometric/users/{user}/enroll/start', [BiometricController::class, 'startEnrollSession']);
    Route::post('/biometric/users/{user}/enroll/{session}/first-scan', [BiometricController::class, 'enrollFirstScan']);
    Route::post('/biometric/users/{user}/enroll/{session}/second-scan', [BiometricController::class, 'enrollSecondScan']);
    Route::delete('/biometric/users/{user}/enroll/{session}', [BiometricController::class, 'cancelEnrollSession']);
    Route::delete('/biometric/templates/{template}', [BiometricController::class, 'destroyTemplate']);
    Route::get('/biometric/users/{user}/access', [BiometricController::class, 'showUserAccess']);
    Route::put('/biometric/users/{user}/access', [BiometricController::class, 'syncUserAccess']);

    Route::prefix('admin')->middleware('permission:view roles|view permissions|view users,web')->group(function () {
        Route::get('/roles', [RoleController::class, 'index'])->middleware('permission:view roles,web');
        Route::post('/roles', [RoleController::class, 'store'])->middleware('permission:create roles,web');
        Route::get('/roles/{role}', [RoleController::class, 'show'])->middleware('permission:view roles,web');
        Route::put('/roles/{role}', [RoleController::class, 'update'])->middleware('permission:edit roles,web');
        Route::patch('/roles/{role}', [RoleController::class, 'update'])->middleware('permission:edit roles,web');
        Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:delete roles,web');
        Route::post('/roles/{role}/permissions', [RoleController::class, 'assignPermissions'])->middleware('permission:manage permissions,web');

        Route::get('/permissions', [PermissionController::class, 'index'])->middleware('permission:view permissions,web');
        Route::post('/permissions', [PermissionController::class, 'store'])->middleware('permission:manage permissions,web');
        Route::get('/permissions/{permission}', [PermissionController::class, 'show'])->middleware('permission:view permissions,web');
        Route::put('/permissions/{permission}', [PermissionController::class, 'update'])->middleware('permission:manage permissions,web');
        Route::patch('/permissions/{permission}', [PermissionController::class, 'update'])->middleware('permission:manage permissions,web');
        Route::delete('/permissions/{permission}', [PermissionController::class, 'destroy'])->middleware('permission:manage permissions,web');

        Route::get('/users', [UserController::class, 'index'])->middleware('permission:view users,web');
        Route::post('/users', [UserController::class, 'store'])->middleware('permission:create users,web');
        Route::get('/users/{user}', [UserController::class, 'show'])->middleware('permission:view users,web');
        Route::put('/users/{user}', [UserController::class, 'update'])->middleware('permission:edit users,web');
        Route::patch('/users/{user}', [UserController::class, 'update'])->middleware('permission:edit users,web');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->middleware('permission:delete users,web');
        Route::post('/users/{user}/roles', [UserController::class, 'assignRoles'])->middleware('permission:assign roles,web');
    });
});


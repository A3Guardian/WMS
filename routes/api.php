<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::get('/products', [ProductController::class, 'index'])->middleware('permission:view products');
    Route::post('/products', [ProductController::class, 'store'])->middleware('permission:create products');
    Route::get('/products/{product}', [ProductController::class, 'show'])->middleware('permission:view products');
    Route::put('/products/{product}', [ProductController::class, 'update'])->middleware('permission:edit products');
    Route::patch('/products/{product}', [ProductController::class, 'update'])->middleware('permission:edit products');
    Route::delete('/products/{product}', [ProductController::class, 'destroy'])->middleware('permission:delete products');

    Route::get('/inventory', [InventoryController::class, 'index'])->middleware('permission:view inventory');
    Route::post('/inventory', [InventoryController::class, 'store'])->middleware('permission:manage inventory');
    Route::get('/inventory/{inventory}', [InventoryController::class, 'show'])->middleware('permission:view inventory');
    Route::put('/inventory/{inventory}', [InventoryController::class, 'update'])->middleware('permission:manage inventory');
    Route::patch('/inventory/{inventory}', [InventoryController::class, 'update'])->middleware('permission:manage inventory');
    Route::delete('/inventory/{inventory}', [InventoryController::class, 'destroy'])->middleware('permission:manage inventory');
    Route::post('/inventory/{inventory}/adjust', [InventoryController::class, 'adjust'])->middleware('permission:adjust inventory');

    Route::get('/orders', [OrderController::class, 'index'])->middleware('permission:view orders');
    Route::post('/orders', [OrderController::class, 'store'])->middleware('permission:create orders');
    Route::get('/orders/{order}', [OrderController::class, 'show'])->middleware('permission:view orders');
    Route::put('/orders/{order}', [OrderController::class, 'update'])->middleware('permission:edit orders');
    Route::patch('/orders/{order}', [OrderController::class, 'update'])->middleware('permission:edit orders');
    Route::delete('/orders/{order}', [OrderController::class, 'destroy'])->middleware('permission:delete orders');

    Route::get('/suppliers', [SupplierController::class, 'index'])->middleware('permission:view suppliers');
    Route::post('/suppliers', [SupplierController::class, 'store'])->middleware('permission:create suppliers');
    Route::get('/suppliers/{supplier}', [SupplierController::class, 'show'])->middleware('permission:view suppliers');
    Route::put('/suppliers/{supplier}', [SupplierController::class, 'update'])->middleware('permission:edit suppliers');
    Route::patch('/suppliers/{supplier}', [SupplierController::class, 'update'])->middleware('permission:edit suppliers');
    Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy'])->middleware('permission:delete suppliers');

    Route::prefix('admin')->middleware('permission:view roles|view permissions|view users')->group(function () {
        Route::get('/roles', [RoleController::class, 'index'])->middleware('permission:view roles');
        Route::post('/roles', [RoleController::class, 'store'])->middleware('permission:create roles');
        Route::get('/roles/{role}', [RoleController::class, 'show'])->middleware('permission:view roles');
        Route::put('/roles/{role}', [RoleController::class, 'update'])->middleware('permission:edit roles');
        Route::patch('/roles/{role}', [RoleController::class, 'update'])->middleware('permission:edit roles');
        Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:delete roles');
        Route::post('/roles/{role}/permissions', [RoleController::class, 'assignPermissions'])->middleware('permission:manage permissions');

        Route::get('/permissions', [PermissionController::class, 'index'])->middleware('permission:view permissions');
        Route::post('/permissions', [PermissionController::class, 'store'])->middleware('permission:manage permissions');
        Route::get('/permissions/{permission}', [PermissionController::class, 'show'])->middleware('permission:view permissions');
        Route::put('/permissions/{permission}', [PermissionController::class, 'update'])->middleware('permission:manage permissions');
        Route::patch('/permissions/{permission}', [PermissionController::class, 'update'])->middleware('permission:manage permissions');
        Route::delete('/permissions/{permission}', [PermissionController::class, 'destroy'])->middleware('permission:manage permissions');

        Route::get('/users', [UserController::class, 'index'])->middleware('permission:view users');
        Route::post('/users', [UserController::class, 'store'])->middleware('permission:create users');
        Route::get('/users/{user}', [UserController::class, 'show'])->middleware('permission:view users');
        Route::put('/users/{user}', [UserController::class, 'update'])->middleware('permission:edit users');
        Route::patch('/users/{user}', [UserController::class, 'update'])->middleware('permission:edit users');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->middleware('permission:delete users');
        Route::post('/users/{user}/roles', [UserController::class, 'assignRoles'])->middleware('permission:assign roles');
    });
});


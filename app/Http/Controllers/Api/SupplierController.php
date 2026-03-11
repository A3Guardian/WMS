<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::query();

        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%');
        }

        return response()->json($query->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'email' => 'required|email|unique:suppliers,email',
            'phone' => 'nullable|string|max:255',
            'billing_phone' => 'nullable|string|max:255',
            'shipping_phone' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'billing_address' => 'nullable|string',
            'billing_city' => 'nullable|string|max:255',
            'billing_postcode' => 'nullable|string|max:255',
            'billing_country' => 'nullable|string|max:255',
            'shipping_address' => 'nullable|string',
            'shipping_city' => 'nullable|string|max:255',
            'shipping_postcode' => 'nullable|string|max:255',
            'shipping_country' => 'nullable|string|max:255',
            'tax_number' => 'nullable|string|max:255',
            'registration_number' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'bank_iban' => 'nullable|string|max:255',
            'bank_swift' => 'nullable|string|max:255',
            'payment_terms_days' => 'nullable|integer|min:0',
            'credit_limit' => 'nullable|numeric|min:0',
        ]);

        $supplier = Supplier::create($validated);

        ActivityLogService::logCreated($supplier, $validated);

        return response()->json($supplier, 201);
    }

    public function show(Supplier $supplier)
    {
        return response()->json($supplier);
    }

    public function update(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'email' => 'sometimes|required|email|unique:suppliers,email,' . $supplier->id,
            'phone' => 'nullable|string|max:255',
            'billing_phone' => 'nullable|string|max:255',
            'shipping_phone' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'billing_address' => 'nullable|string',
            'billing_city' => 'nullable|string|max:255',
            'billing_postcode' => 'nullable|string|max:255',
            'billing_country' => 'nullable|string|max:255',
            'shipping_address' => 'nullable|string',
            'shipping_city' => 'nullable|string|max:255',
            'shipping_postcode' => 'nullable|string|max:255',
            'shipping_country' => 'nullable|string|max:255',
            'tax_number' => 'nullable|string|max:255',
            'registration_number' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'bank_iban' => 'nullable|string|max:255',
            'bank_swift' => 'nullable|string|max:255',
            'payment_terms_days' => 'nullable|integer|min:0',
            'credit_limit' => 'nullable|numeric|min:0',
        ]);

        $oldValues = $supplier->only(array_keys($validated));
        $supplier->update($validated);
        $newValues = $supplier->only(array_keys($validated));

        ActivityLogService::logUpdated($supplier, $oldValues, $newValues);

        return response()->json($supplier);
    }

    public function destroy(Supplier $supplier)
    {
        ActivityLogService::logDeleted($supplier);
        $supplier->delete();

        return response()->json(['message' => 'Supplier deleted successfully']);
    }
}


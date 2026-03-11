<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%')
                    ->orWhere('phone', 'like', '%' . $search . '%')
                    ->orWhere('contact_person', 'like', '%' . $search . '%');
            });
        }

        return response()->json($query->orderBy('name')->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255|unique:customers,email',
            'phone' => 'nullable|string|max:255',
            'billing_phone' => 'nullable|string|max:255',
            'shipping_phone' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
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

        $customer = Customer::create($validated);

        ActivityLogService::logCreated($customer, $validated);

        return response()->json($customer, 201);
    }

    public function show(Customer $customer)
    {
        return response()->json($customer);
    }

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255|unique:customers,email,' . $customer->id,
            'phone' => 'nullable|string|max:255',
            'billing_phone' => 'nullable|string|max:255',
            'shipping_phone' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
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

        $oldValues = $customer->only(array_keys($validated));
        $customer->update($validated);
        $newValues = $customer->only(array_keys($validated));

        ActivityLogService::logUpdated($customer, $oldValues, $newValues);

        return response()->json($customer);
    }

    public function destroy(Customer $customer)
    {
        ActivityLogService::logDeleted($customer);
        $customer->delete();

        return response()->json(['message' => 'Customer deleted successfully']);
    }
}

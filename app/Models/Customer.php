<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'company_name',
        'email',
        'phone',
        'billing_phone',
        'shipping_phone',
        'contact_person',
        'notes',
        'billing_address',
        'billing_city',
        'billing_postcode',
        'billing_country',
        'shipping_address',
        'shipping_city',
        'shipping_postcode',
        'shipping_country',
        'tax_number',
        'registration_number',
        'bank_name',
        'bank_iban',
        'bank_swift',
        'payment_terms_days',
        'credit_limit',
    ];

    protected $casts = [
        'payment_terms_days' => 'integer',
        'credit_limit' => 'decimal:2',
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}


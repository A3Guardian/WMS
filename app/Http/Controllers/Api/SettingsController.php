<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    private const KEYS = [
        'app.logo',
        'app.locale',
        'company.name',
        'company.cui',
        'company.phone',
        'company.address',
        'smtp.host',
        'smtp.port',
        'smtp.username',
        'smtp.password',
        'smtp.encryption',
        'smtp.from_address',
        'smtp.from_name',
    ];

    public function index(): JsonResponse
    {
        $this->authorizeAdmin();
        return response()->json($this->getSettingsData());
    }

    private function authorizeAdmin(): void
    {
        $user = request()->user();
        if (!$user || (! $user->hasRole('Admin') && ! $user->hasRole('admin'))) {
            abort(403, 'Doar administratorii pot accesa setările.');
        }
    }

    private function getSettingsData(): array
    {
        $settings = Setting::all()->keyBy('key');
        $raw = [];
        foreach (self::KEYS as $k) {
            $raw[$k] = $settings->get($k)?->value;
        }
        $logoPath = $raw['app.logo'] ?? null;
        $logoUrl = $logoPath ? asset('storage/' . $logoPath) : null;
        return [
            'app' => [
                'logo' => $raw['app.logo'],
                'logo_url' => $logoUrl,
                'locale' => $raw['app.locale'] ?? 'ro',
            ],
            'company' => [
                'name' => $raw['company.name'] ?? '',
                'cui' => $raw['company.cui'] ?? '',
                'phone' => $raw['company.phone'] ?? '',
                'address' => $raw['company.address'] ?? '',
            ],
            'smtp' => [
                'host' => $raw['smtp.host'] ?? '',
                'port' => $raw['smtp.port'] ?? '587',
                'username' => $raw['smtp.username'] ?? '',
                'password' => '', // never expose in API
                'encryption' => $raw['smtp.encryption'] ?? 'tls',
                'from_address' => $raw['smtp.from_address'] ?? '',
                'from_name' => $raw['smtp.from_name'] ?? '',
            ],
        ];
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorizeAdmin();
        $allowed = [
            'app.locale',
            'company.name',
            'company.cui',
            'company.phone',
            'company.address',
            'smtp.host',
            'smtp.port',
            'smtp.username',
            'smtp.password',
            'smtp.encryption',
            'smtp.from_address',
            'smtp.from_name',
        ];
        $validated = $request->validate([
            'app.locale' => 'nullable|string|in:ro,en',
            'company.name' => 'nullable|string|max:255',
            'company.cui' => 'nullable|string|max:50',
            'company.phone' => 'nullable|string|max:50',
            'company.address' => 'nullable|string',
            'smtp.host' => 'nullable|string|max:255',
            'smtp.port' => 'nullable|string|max:10',
            'smtp.username' => 'nullable|string|max:255',
            'smtp.password' => 'nullable|string|max:255',
            'smtp.encryption' => 'nullable|string|in:tls,ssl,null',
            'smtp.from_address' => 'nullable|string|email|max:255',
            'smtp.from_name' => 'nullable|string|max:255',
        ]);

        $userId = $request->user()?->id;
        foreach ($validated as $key => $value) {
            if (! in_array($key, $allowed)) {
                continue;
            }
            if ($key === 'smtp.password' && $value === '') {
                continue; // do not overwrite with empty
            }
            Setting::set($key, $value === '' ? null : (string) $value, $userId);
        }

        return response()->json($this->getSettingsData());
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $this->authorizeAdmin();
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
        ]);

        $file = $request->file('logo');
        $path = $file->store('logos', 'public');
        $previous = Setting::get('app.logo');
        if ($previous && Storage::disk('public')->exists($previous)) {
            Storage::disk('public')->delete($previous);
        }
        Setting::set('app.logo', $path, $request->user()?->id);

        $logoUrl = asset('storage/' . $path);
        return response()->json([
            'path' => $path,
            'logo_url' => $logoUrl,
        ]);
    }
}

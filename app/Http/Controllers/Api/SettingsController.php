<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class SettingsController extends Controller
{
    private const KEYS = [
        'app.logo',
        'app.locale',
        'company.name',
        'company.cui',
        'company.phone',
        'company.address',
        'company.city',
        'company.county',
        'company.email',
        'company.bank',
        'company.iban',
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
                'city' => $raw['company.city'] ?? '',
                'county' => $raw['company.county'] ?? '',
                'email' => $raw['company.email'] ?? '',
                'bank' => $raw['company.bank'] ?? '',
                'iban' => $raw['company.iban'] ?? '',
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
            'company.city',
            'company.county',
            'company.email',
            'company.bank',
            'company.iban',
            'smtp.host',
            'smtp.port',
            'smtp.username',
            'smtp.password',
            'smtp.encryption',
            'smtp.from_address',
            'smtp.from_name',
        ];
        $validated = $request->validate([
            'app' => 'sometimes|array',
            'app.locale' => 'nullable|string|in:ro,en',
            'company' => 'sometimes|array',
            'company.name' => 'nullable|string|max:255',
            'company.cui' => 'nullable|string|max:50',
            'company.phone' => 'nullable|string|max:50',
            'company.address' => 'nullable|string',
            'company.city' => 'nullable|string|max:100',
            'company.county' => 'nullable|string|max:100',
            'company.email' => 'nullable|string|email|max:255',
            'company.bank' => 'nullable|string|max:255',
            'company.iban' => 'nullable|string|max:50',
            'smtp' => 'sometimes|array',
            'smtp.host' => 'nullable|string|max:255',
            'smtp.port' => 'nullable|string|max:10',
            'smtp.username' => 'nullable|string|max:255',
            'smtp.password' => 'nullable|string|max:255',
            'smtp.encryption' => 'nullable|string|in:tls,ssl,null',
            'smtp.from_address' => 'nullable|string|email|max:255',
            'smtp.from_name' => 'nullable|string|max:255',
        ]);

        $userId = $request->user()?->id;
        $flat = Arr::dot($validated);
        foreach ($flat as $key => $value) {
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

    public function invoiceData(): JsonResponse
    {
        $settings = Setting::all()->keyBy('key');
        $raw = [];
        foreach (['app.logo', 'company.name', 'company.cui', 'company.phone', 'company.address', 'company.city', 'company.county', 'company.email', 'company.bank', 'company.iban'] as $k) {
            $raw[$k] = $settings->get($k)?->value;
        }
        $logoPath = $raw['app.logo'] ?? null;
        $logoUrl = $logoPath ? asset('storage/' . $logoPath) : null;
        return response()->json([
            'company' => [
                'name' => $raw['company.name'] ?? '',
                'cui' => $raw['company.cui'] ?? '',
                'phone' => $raw['company.phone'] ?? '',
                'address' => $raw['company.address'] ?? '',
                'city' => $raw['company.city'] ?? '',
                'county' => $raw['company.county'] ?? '',
                'email' => $raw['company.email'] ?? '',
                'bank' => $raw['company.bank'] ?? '',
                'iban' => $raw['company.iban'] ?? '',
            ],
            'logo_url' => $logoUrl,
        ]);
    }

    public function sendSmtpTestEmail(Request $request): JsonResponse
    {
        $this->authorizeAdmin();
        $locale = Setting::get('app.locale', config('app.locale'));
        if (in_array($locale, ['en', 'ro'], true)) {
            app()->setLocale($locale);
        }

        $validated = $request->validate([
            'email' => 'required|string|email|max:255',
        ]);

        $smtp = [
            'host' => trim((string) (Setting::get('smtp.host') ?? '')),
            'port' => trim((string) (Setting::get('smtp.port') ?? '')),
            'username' => trim((string) (Setting::get('smtp.username') ?? '')),
            'password' => (string) (Setting::get('smtp.password') ?? ''),
            'encryption' => trim((string) (Setting::get('smtp.encryption') ?? 'tls')),
            'from_address' => trim((string) (Setting::get('smtp.from_address') ?? '')),
            'from_name' => trim((string) (Setting::get('smtp.from_name') ?? config('app.name', 'WMS'))),
        ];

        Validator::make($smtp, [
            'host' => 'required|string|max:255',
            'port' => 'required|string|max:10',
            'username' => 'required|string|max:255',
            'password' => 'required|string|max:255',
            'encryption' => 'nullable|string|in:tls,ssl,null',
            'from_address' => 'required|string|email|max:255',
            'from_name' => 'nullable|string|max:255',
        ])->validate();

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.transport' => 'smtp',
            'mail.mailers.smtp.host' => $smtp['host'],
            'mail.mailers.smtp.port' => (int) $smtp['port'],
            'mail.mailers.smtp.encryption' => $smtp['encryption'] === 'null' ? null : $smtp['encryption'],
            'mail.mailers.smtp.username' => $smtp['username'],
            'mail.mailers.smtp.password' => $smtp['password'],
            'mail.from.address' => $smtp['from_address'],
            'mail.from.name' => $smtp['from_name'] ?: config('app.name', 'WMS'),
        ]);

        try {
            Mail::raw(__('This is a test email sent from WMS SMTP settings.'), function ($message) use ($validated) {
                $message
                    ->to($validated['email'])
                    ->subject(__('WMS - SMTP Test'));
            });
        } catch (\Throwable $e) {
            return response()->json([
                'message' => __('Could not send test email.'),
                'errors' => [
                    'smtp' => [$e->getMessage()],
                ],
            ], 422);
        }

        return response()->json([
            'message' => __('Test email sent successfully.'),
        ]);
    }
}

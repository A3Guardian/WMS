<?php

use Illuminate\Support\Facades\Route;

// SPA fallback - all routes should return the app view
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');

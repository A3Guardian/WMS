import './bootstrap';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Find the element where React should mount
const container = document.getElementById('app');

if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}

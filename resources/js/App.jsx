import React from 'react';
import { createRoot } from 'react-dom/client';
import Example from './components/Example';

function App() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl font-bold mb-6 text-center">
                    Welcome to Laravel + React
                </h1>
                <Example />
            </div>
        </div>
    );
}

export default App;

if (document.getElementById('app')) {
    createRoot(document.getElementById('app')).render(<App />);
}

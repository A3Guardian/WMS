import React from 'react';
import Example from './components/Example';

function App() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Welcome to Laravel + React</h1>
            <p className="text-gray-600 mb-6">React is now set up and ready to use in your Laravel application!</p>
            <Example />
        </div>
    );
}

export default App;

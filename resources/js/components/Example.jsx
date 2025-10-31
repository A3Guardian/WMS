import React, { useState } from 'react';

function Example() {
    const [count, setCount] = useState(0);

    return (
        <div className="p-4 border rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Example React Component</h2>
            <p className="mb-4">This is a simple counter component demonstrating React state.</p>
            <button
                onClick={() => setCount(count + 1)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
                Count: {count}
            </button>
        </div>
    );
}

export default Example;

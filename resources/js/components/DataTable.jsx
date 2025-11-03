import React from 'react';

export default function DataTable({ columns, data, loading }) {
    if (loading) {
        return <div className="text-center py-8 text-gray-600">Loading...</div>;
    }

    if (!data || data.length === 0) {
        return <div className="text-center py-8 text-gray-500">No data available</div>;
    }

    const getNestedValue = (obj, path) => {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white shadow-md rounded-lg">
                <thead className="bg-gray-200">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                            >
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                            {columns.map((column) => {
                                const value = column.key.includes('.') 
                                    ? getNestedValue(row, column.key)
                                    : row[column.key];
                                return (
                                    <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                                        {column.render
                                            ? column.render(value, row)
                                            : value ?? '-'}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}


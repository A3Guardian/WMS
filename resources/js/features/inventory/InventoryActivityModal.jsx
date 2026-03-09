import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { History, User, Calendar } from 'lucide-react';

function formatAction(action) {
    const labels = {
        created: 'Created',
        updated: 'Updated',
        adjusted: 'Stock adjusted',
        deleted: 'Deleted',
    };
    return labels[action] || action;
}

function formatChanges(changes) {
    if (!changes || typeof changes !== 'object') return null;
    return Object.entries(changes).map(([key, val]) => {
        if (val && typeof val === 'object' && 'old' in val && 'new' in val) {
            return (
                <span key={key} className="block text-sm text-gray-600 mt-0.5">
                    {key}: <span className="line-through">{String(val.old)}</span> → <span className="font-medium">{String(val.new)}</span>
                </span>
            );
        }
        return null;
    }).filter(Boolean);
}

export default function InventoryActivityModal({ isOpen, onClose, inventory }) {
    const { data: logs, loading, error } = useQuery({
        queryKey: ['inventory-activity', inventory?.id],
        queryFn: async () => {
            const res = await api.get(`/inventory/${inventory?.id}/activity`);
            return res.data;
        },
        enabled: isOpen && !!inventory?.id,
    });

    if (!inventory) return null;

    const productName = inventory.product?.name || `Inventory #${inventory.id}`;
    const location = [inventory.deposit?.name, inventory.shelf?.name].filter(Boolean).join(' – ') || '-';

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col z-50">
                    <Dialog.Title className="text-xl font-bold mb-1 flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-600" />
                        Inventory history
                    </Dialog.Title>
                    <p className="text-sm text-gray-600 mb-4">
                        {productName}
                        {location !== '-' && <span className="block text-gray-500">{location}</span>}
                    </p>

                    <div className="flex-1 overflow-y-auto border-t pt-4 space-y-4">
                        {loading && <p className="text-gray-500 text-sm">Loading...</p>}
                        {error && (
                            <p className="text-red-600 text-sm">
                                {error?.response?.data?.message || error?.message || 'Failed to load history'}
                            </p>
                        )}
                        {!loading && !error && (!logs || logs.length === 0) && (
                            <p className="text-gray-500 text-sm">No activity recorded yet.</p>
                        )}
                        {!loading && !error && Array.isArray(logs) && logs.length > 0 && (
                            <ul className="space-y-3">
                                {logs.map((log) => (
                                    <li key={log.id} className="flex gap-3 text-sm">
                                        <div className="flex flex-col items-center">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                                            <div className="w-px flex-1 min-h-[20px] bg-gray-200" />
                                        </div>
                                        <div className="flex-1 pb-4">
                                            <p className="font-medium text-gray-900">
                                                {formatAction(log.action)}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-gray-500">
                                                {log.user && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3.5 h-3.5" />
                                                        {log.user.name}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                                                </span>
                                            </div>
                                            {log.description && (
                                                <p className="text-gray-600 mt-1">{log.description}</p>
                                            )}
                                            {log.changes && Object.keys(log.changes).length > 0 && (
                                                <div className="mt-1 pl-2 border-l-2 border-gray-200">
                                                    {formatChanges(log.changes)}
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="flex justify-end mt-4 pt-4 border-t">
                        <Dialog.Close asChild>
                            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                                Close
                            </button>
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

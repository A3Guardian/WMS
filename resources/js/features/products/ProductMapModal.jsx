import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import api from '../../utils/api';
import ProductDepositMap from '../../components/ProductDepositMap';

export default function ProductMapModal({ 
    isOpen, 
    onClose, 
    product 
}) {
    const mapContainerRef = useRef(null);
    const [mapScale, setMapScale] = useState(1);
    const [baseScale, setBaseScale] = useState(1);
    const [selectedDepositId, setSelectedDepositId] = useState(null);

    const inventories = product?.inventories || [];
    const byDeposit = inventories.reduce((acc, inv) => {
        const id = inv.deposit_id ?? inv.deposit?.id;
        if (id == null) return acc;
        if (!acc[id]) acc[id] = { deposit: inv.deposit, deposit_id: id, items: [] };
        acc[id].items.push(inv);
        return acc;
    }, {});
    const depositList = Object.values(byDeposit);
    const currentDepositId = selectedDepositId ?? depositList[0]?.deposit_id ?? null;
    const currentGroup = depositList.find((g) => g.deposit_id === currentDepositId);
    const firstInventory = currentGroup?.items?.[0] ?? null;

    const { data: depositDetails } = useQuery({
        queryKey: ['deposit', firstInventory?.deposit_id],
        queryFn: async () => {
            if (!firstInventory?.deposit_id) return null;
            const response = await api.get(`/deposits/${firstInventory.deposit_id}`);
            return response.data;
        },
        enabled: !!firstInventory?.deposit_id && isOpen,
    });

    const { data: mapShelves } = useQuery({
        queryKey: ['shelves', firstInventory?.deposit_id],
        queryFn: async () => {
            if (!firstInventory?.deposit_id) return [];
            const response = await api.get(`/deposits/${firstInventory.deposit_id}/shelves`);
            return response.data?.data || response.data || [];
        },
        enabled: !!firstInventory?.deposit_id && isOpen,
    });

    const { data: mapWalls } = useQuery({
        queryKey: ['walls', firstInventory?.deposit_id],
        queryFn: async () => {
            if (!firstInventory?.deposit_id) return [];
            const response = await api.get(`/deposits/${firstInventory.deposit_id}/walls`);
            return response.data?.data || response.data || [];
        },
        enabled: !!firstInventory?.deposit_id && isOpen,
    });

    const { data: mapDoors } = useQuery({
        queryKey: ['doors', firstInventory?.deposit_id],
        queryFn: async () => {
            if (!firstInventory?.deposit_id) return [];
            const response = await api.get(`/deposits/${firstInventory.deposit_id}/doors`);
            return response.data?.data || response.data || [];
        },
        enabled: !!firstInventory?.deposit_id && isOpen,
    });

    useEffect(() => {
        if (depositDetails && mapContainerRef.current && isOpen) {
            const timer = setTimeout(() => {
                const container = mapContainerRef.current;
                if (container) {
                    const containerWidth = container.clientWidth - 100;
                    const containerHeight = container.clientHeight - 100;
                    
                    const scaleX = containerWidth / (depositDetails.width * 50);
                    const scaleY = containerHeight / (depositDetails.height * 50);
                    const newScale = Math.min(scaleX, scaleY, 1);
                    
                    setBaseScale(newScale);
                    setMapScale(newScale);
                }
            }, 100);
            
            return () => clearTimeout(timer);
        }
    }, [depositDetails, isOpen]);

    useEffect(() => {
        const container = mapContainerRef.current;
        if (!container || !isOpen) return;

        const handleWheel = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                setMapScale(prev => {
                    const newScale = prev * delta;
                    return Math.max(0.1, Math.min(5, newScale));
                });
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [isOpen]);

    const handleZoomIn = () => {
        setMapScale(prev => Math.min(prev * 1.2, 5));
    };

    const handleZoomOut = () => {
        setMapScale(prev => Math.max(prev / 1.2, 0.1));
    };

    const handleZoomReset = () => {
        setMapScale(baseScale);
    };

    const handleClose = () => {
        setMapScale(1);
        setBaseScale(1);
        onClose();
    };

    if (!product) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => {
            if (!open) {
                handleClose();
            }
        }}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-6xl max-h-[90vh] overflow-hidden z-50 flex flex-col">
                    <Dialog.Title className="text-2xl font-bold mb-2">
                        Product Location - {product.name}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-600 mb-4">
                        View the product location on the deposit map
                    </Dialog.Description>
                    {depositList.length > 1 && (
                        <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 pb-3">
                            <span className="text-sm font-medium text-gray-700 self-center mr-2">Deposit:</span>
                            {depositList.map((group) => {
                                const name = group.deposit?.name || `Deposit #${group.deposit_id}`;
                                const isSelected = group.deposit_id === currentDepositId;
                                return (
                                    <button
                                        key={group.deposit_id}
                                        type="button"
                                        onClick={() => setSelectedDepositId(group.deposit_id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isSelected
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div className="flex justify-between items-center mb-4">
                        <div></div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">Zoom:</span>
                            <button
                                onClick={handleZoomOut}
                                className="p-2 bg-gray-200 hover:bg-gray-300 rounded-md"
                                title="Zoom Out"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                                </svg>
                            </button>
                            <span className="text-sm font-medium w-16 text-center">
                                {Math.round(mapScale * 100)}%
                            </span>
                            <button
                                onClick={handleZoomIn}
                                className="p-2 bg-gray-200 hover:bg-gray-300 rounded-md"
                                title="Zoom In"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                </svg>
                            </button>
                            <button
                                onClick={handleZoomReset}
                                className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
                                title="Reset Zoom"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                    {depositDetails && mapShelves && firstInventory ? (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <div className="mb-4">
                                <p className="text-gray-600">
                                    <strong>Deposit:</strong> {depositDetails.name} ({depositDetails.width}m × {depositDetails.height}m)
                                </p>
                                {firstInventory.shelf && (
                                    <p className="text-gray-600">
                                        <strong>Shelf:</strong> {firstInventory.shelf.name} at ({firstInventory.shelf.x_position}m, {firstInventory.shelf.y_position}m)
                                    </p>
                                )}
                                <p className="text-sm text-gray-500 mt-1">
                                    Use Ctrl+Scroll to zoom • Click and drag to pan (if implemented)
                                </p>
                            </div>
                            <ProductDepositMap
                                depositDetails={depositDetails}
                                shelves={mapShelves}
                                walls={mapWalls}
                                doors={mapDoors}
                                productShelfId={firstInventory.shelf_id}
                                scale={mapScale}
                                containerRef={mapContainerRef}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <p>No inventory location found for this product.</p>
                        </div>
                    )}
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
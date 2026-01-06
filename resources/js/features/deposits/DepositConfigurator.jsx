import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../utils/api';
import { usePermissions } from '../../hooks/usePermissions';
import DepositMap from '../../components/DepositMap';
import ShelfProductsList from './ShelfProductsList';

export default function DepositConfigurator() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const canvasRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [baseScale, setBaseScale] = useState(1);
    const [selectedShelf, setSelectedShelf] = useState(null);
    const [selectedWall, setSelectedWall] = useState(null);
    const [selectedDoor, setSelectedDoor] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [newShelfSize, setNewShelfSize] = useState({ width: 1, height: 1 });
    const [drawingMode, setDrawingMode] = useState(null); // 'wall', 'door', or null
    const [wallStart, setWallStart] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const { data: deposit, isLoading: depositLoading } = useQuery({
        queryKey: ['deposit', id],
        queryFn: async () => {
            const response = await api.get(`/deposits/${id}`);
            return response.data;
        },
    });

    const { data: shelves = [], isLoading: shelvesLoading } = useQuery({
        queryKey: ['shelves', id],
        queryFn: async () => {
            const response = await api.get(`/deposits/${id}/shelves`);
            return response.data;
        },
        enabled: !!id,
    });

    const { data: walls = [], isLoading: wallsLoading } = useQuery({
        queryKey: ['walls', id],
        queryFn: async () => {
            const response = await api.get(`/deposits/${id}/walls`);
            return response.data;
        },
        enabled: !!id,
    });

    const { data: doors = [], isLoading: doorsLoading } = useQuery({
        queryKey: ['doors', id],
        queryFn: async () => {
            const response = await api.get(`/deposits/${id}/doors`);
            return response.data;
        },
        enabled: !!id,
    });


    const { data: shelfProducts = [], isLoading: shelfProductsLoading, error: shelfProductsError } = useQuery({
        queryKey: ['shelf-products', id, selectedShelf?.id],
        queryFn: async () => {
            if (!selectedShelf?.id || !id) return [];
            try {
                const response = await api.get(`/deposits/${id}/shelves/${selectedShelf.id}/products`);
                return response.data || [];
            } catch (error) {
                console.error('Error fetching shelf products:', error);
                toast.error('Failed to load products', {
                    description: error.response?.data?.message || 'An error occurred',
                });
                return [];
            }
        },
        enabled: !!selectedShelf?.id && !!id,
    });

    const { data: allShelfProducts = [] } = useQuery({
        queryKey: ['all-shelf-products', id],
        queryFn: async () => {
            if (!id) return [];
            const response = await api.get('/products', {
                params: { deposit_id: id, per_page: 1000 }
            });
            return response.data?.data || response.data || [];
        },
        enabled: !!id,
    });

    const createShelfMutation = useMutation({
        mutationFn: async (shelfData) => {
            const response = await api.post(`/deposits/${id}/shelves`, shelfData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shelves', id] });
            toast.success('Shelf created successfully');
            setDrawingMode(null);
        },
        onError: (error) => {
            toast.error('Failed to create shelf', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const updateShelfMutation = useMutation({
        mutationFn: async ({ shelfId, data }) => {
            const response = await api.put(`/deposits/${id}/shelves/${shelfId}`, data);
            return response.data;
        },
        onSuccess: (updatedShelf) => {
            queryClient.setQueryData(['shelves', id], (oldShelves) => {
                return oldShelves.map(shelf => 
                    shelf.id === updatedShelf.id ? updatedShelf : shelf
                );
            });
            setSelectedShelf(updatedShelf);
        },
        onError: (error) => {
            toast.error('Failed to update shelf', {
                description: error.response?.data?.message || 'An error occurred',
            });
            queryClient.invalidateQueries({ queryKey: ['shelves', id] });
        },
    });

    const deleteShelfMutation = useMutation({
        mutationFn: async (shelfId) => {
            await api.delete(`/deposits/${id}/shelves/${shelfId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shelves', id] });
            setSelectedShelf(null);
            toast.success('Shelf deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete shelf', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const createWallMutation = useMutation({
        mutationFn: async (wallData) => {
            const response = await api.post(`/deposits/${id}/walls`, wallData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['walls', id] });
            toast.success('Wall created successfully');
            setDrawingMode(null);
            setWallStart(null);
            setSelectedShelf(null);
            setSelectedWall(null);
            setSelectedDoor(null);
        },
        onError: (error) => {
            toast.error('Failed to create wall', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const deleteWallMutation = useMutation({
        mutationFn: async (wallId) => {
            await api.delete(`/deposits/${id}/walls/${wallId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['walls', id] });
            setSelectedWall(null);
            toast.success('Wall deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete wall', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const createDoorMutation = useMutation({
        mutationFn: async (doorData) => {
            const response = await api.post(`/deposits/${id}/doors`, doorData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doors', id] });
            toast.success('Door created successfully');
            setDrawingMode(null);
            setSelectedShelf(null);
            setSelectedWall(null);
            setSelectedDoor(null);
        },
        onError: (error) => {
            toast.error('Failed to create door', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const deleteDoorMutation = useMutation({
        mutationFn: async (doorId) => {
            await api.delete(`/deposits/${id}/doors/${doorId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doors', id] });
            setSelectedDoor(null);
            toast.success('Door deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete door', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });


    useEffect(() => {
        if (deposit && canvasRef.current) {
            const container = canvasRef.current.parentElement;
            const containerWidth = container.clientWidth - 100;
            const containerHeight = container.clientHeight - 100;
            
            const scaleX = containerWidth / (deposit.width * 50); 
            const scaleY = containerHeight / (deposit.height * 50);
            const newScale = Math.min(scaleX, scaleY, 1); 
            
            setBaseScale(newScale);
            setScale(newScale);
        }
    }, [deposit]);

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev * 1.2, 5)); 
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev / 1.2, 0.1));
    };

    const handleZoomReset = () => {
        setScale(baseScale);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheel = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                setScale(prev => {
                    const newScale = prev * delta;
                    return Math.max(0.1, Math.min(5, newScale)); 
                });
            }
        };

        canvas.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
        };
    }, []);

    const metersToPixels = (meters) => meters * 50 * scale;

    const pixelsToMeters = (pixels) => pixels / (50 * scale);

    const handleCanvasClick = (e) => {
        if (isDragging) return;
        
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const xMeters = pixelsToMeters(x);
        const yMeters = pixelsToMeters(y);

        if (drawingMode === 'wall') {
            if (!wallStart) {
                setWallStart({ x: xMeters, y: yMeters });
                toast.info('Click again to set wall end point');
            } else {
                createWallMutation.mutate({
                    x_start: wallStart.x,
                    y_start: wallStart.y,
                    x_end: xMeters,
                    y_end: yMeters,
                    thickness: 0.2,
                });
            }
            return;
        }

        if (drawingMode === 'door') {
            const borderWalls = [
                { id: 'border-top', x_start: 0, y_start: 0, x_end: deposit.width, y_end: 0 }, // Top
                { id: 'border-right', x_start: deposit.width, y_start: 0, x_end: deposit.width, y_end: deposit.height }, // Right
                { id: 'border-bottom', x_start: deposit.width, y_start: deposit.height, x_end: 0, y_end: deposit.height }, // Bottom
                { id: 'border-left', x_start: 0, y_start: deposit.height, x_end: 0, y_end: 0 }, // Left
            ];

            const detectionThreshold = Math.max(20, 20 / scale);
            
            let clickedWall = null;
            let minDistance = Infinity;
            
            walls.forEach(wall => {
                if (!wall || typeof wall.x_start === 'undefined') return;
                
                const x1 = metersToPixels(wall.x_start);
                const y1 = metersToPixels(wall.y_start);
                const x2 = metersToPixels(wall.x_end);
                const y2 = metersToPixels(wall.y_end);
                
                const distance = pointToLineDistance(x, y, x1, y1, x2, y2);
                if (distance < detectionThreshold && distance < minDistance) {
                    minDistance = distance;
                    clickedWall = wall;
                }
            });

            if (!clickedWall) {
                minDistance = Infinity; 
                borderWalls.forEach(wall => {
                    const x1 = metersToPixels(wall.x_start);
                    const y1 = metersToPixels(wall.y_start);
                    const x2 = metersToPixels(wall.x_end);
                    const y2 = metersToPixels(wall.y_end);
                    
                    const distance = pointToLineDistance(x, y, x1, y1, x2, y2);
                    if (distance < detectionThreshold && distance < minDistance) {
                        minDistance = distance;
                        clickedWall = wall;
                    }
                });
            }

            if (!clickedWall) {
                console.log('Door placement failed:', { 
                    clickPos: { x, y }, 
                    xMeters, 
                    yMeters, 
                    wallsCount: walls.length,
                    detectionThreshold,
                    scale 
                });
                toast.error('Please click on a wall or deposit border to place a door');
                return;
            }

            const xStart = parseFloat(clickedWall.x_start);
            const yStart = parseFloat(clickedWall.y_start);
            const xEnd = parseFloat(clickedWall.x_end);
            const yEnd = parseFloat(clickedWall.y_end);

            const dx = xEnd - xStart;
            const dy = yEnd - yStart;
            const wallLength = Math.sqrt(dx * dx + dy * dy);

            if (wallLength === 0) {
                toast.error('Invalid wall');
                return;
            }

            const t = Math.max(0, Math.min(1, 
                ((xMeters - xStart) * dx + (yMeters - yStart) * dy) / (wallLength * wallLength)
            ));

            const doorX = parseFloat((xStart + t * dx).toFixed(2));
            const doorY = parseFloat((yStart + t * dy).toFixed(2));

            const isHorizontal = Math.abs(dy) < Math.abs(dx);
            const orientation = isHorizontal ? 'horizontal' : 'vertical';

            const doorData = {
                x_position: doorX,
                y_position: doorY,
                width: 0.9,
                orientation: orientation,
            };

            const isBorderWall = typeof clickedWall.id === 'string' && clickedWall.id.startsWith('border-');
            if (clickedWall.id && !isBorderWall) {
                doorData.wall_id = clickedWall.id;
            }

            createDoorMutation.mutate(doorData);
            return;
        }

        if (drawingMode) {
            if (drawingMode === 'door') {
                return;
            } else if (drawingMode === 'wall') {
                return;
            }
            return;
        }

        const clickedShelf = shelves.find(shelf => {
            const shelfX = metersToPixels(shelf.x_position);
            const shelfY = metersToPixels(shelf.y_position);
            const shelfW = metersToPixels(shelf.width);
            const shelfH = metersToPixels(shelf.height);
            
            return x >= shelfX && x <= shelfX + shelfW && y >= shelfY && y <= shelfY + shelfH;
        });

        if (clickedShelf) {
            setSelectedShelf(clickedShelf);
            setSelectedWall(null);
            setSelectedDoor(null);
            return;
        }

        const clickedWall = walls.find(wall => {
            const x1 = metersToPixels(wall.x_start);
            const y1 = metersToPixels(wall.y_start);
            const x2 = metersToPixels(wall.x_end);
            const y2 = metersToPixels(wall.y_end);
            
            const distance = pointToLineDistance(x, y, x1, y1, x2, y2);
            return distance < 5;
        });

        if (clickedWall) {
            setSelectedWall(clickedWall);
            setSelectedShelf(null);
            setSelectedDoor(null);
            return;
        }

        const clickedDoor = doors.find(door => {
            const doorX = metersToPixels(door.x_position);
            const doorY = metersToPixels(door.y_position);
            const doorW = door.orientation === 'horizontal' ? metersToPixels(door.width) : 10;
            const doorH = door.orientation === 'vertical' ? metersToPixels(door.width) : 10;
            
            return x >= doorX - 5 && x <= doorX + doorW + 5 && y >= doorY - 5 && y <= doorY + doorH + 5;
        });

        if (clickedDoor) {
            setSelectedDoor(clickedDoor);
            setSelectedShelf(null);
            setSelectedWall(null);
            return;
        }

        setSelectedShelf(null);
        setSelectedWall(null);
        setSelectedDoor(null);
    };

    const handleMouseMove = (e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (drawingMode === 'wall' && wallStart) {
            setMousePosition({ x, y });
        } else if (drawingMode === 'door') {
            setMousePosition({ x, y });
        }
    };

    const pointToLineDistance = (px, py, x1, y1, x2, y2) => {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;
        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const handleAddShelf = () => {
        if (!deposit || !hasPermission('edit deposits')) return;

        let xPos = 0;
        let yPos = 0;
        
        const positionOccupied = (x, y, width, height) => {
            return shelves.some(shelf => {
                const shelfRight = shelf.x_position + shelf.width;
                const shelfBottom = shelf.y_position + shelf.height;
                const newRight = x + width;
                const newBottom = y + height;
                
                return !(
                    newRight <= shelf.x_position ||
                    x >= shelfRight ||
                    newBottom <= shelf.y_position ||
                    y >= shelfBottom
                );
            });
        };

        let found = false;
        for (let y = 0; y <= deposit.height - newShelfSize.height && !found; y += 0.5) {
            for (let x = 0; x <= deposit.width - newShelfSize.width && !found; x += 0.5) {
                if (!positionOccupied(x, y, newShelfSize.width, newShelfSize.height)) {
                    xPos = x;
                    yPos = y;
                    found = true;
                }
            }
        }

        if (xPos + newShelfSize.width > deposit.width) {
            xPos = Math.max(0, deposit.width - newShelfSize.width);
        }
        if (yPos + newShelfSize.height > deposit.height) {
            yPos = Math.max(0, deposit.height - newShelfSize.height);
        }

        createShelfMutation.mutate({
            name: `Shelf ${shelves.length + 1}`,
            x_position: xPos,
            y_position: yPos,
            width: newShelfSize.width,
            height: newShelfSize.height,
        });
    };

    const handleShelfDragStart = (e, shelf) => {
        if (drawingMode) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        e.stopPropagation();
        setIsDragging(true);
        setSelectedShelf(shelf);
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        setDragStart({
            x: e.clientX - rect.left - metersToPixels(shelf.x_position),
            y: e.clientY - rect.top - metersToPixels(shelf.y_position),
        });
    };

    const handleShelfDragMove = (e) => {
        if (!isDragging || !selectedShelf || !deposit) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - dragStart.x;
        const y = e.clientY - rect.top - dragStart.y;

        const xMeters = Math.max(0, pixelsToMeters(x));
        const yMeters = Math.max(0, pixelsToMeters(y));

        const maxX = Math.max(0, deposit.width - selectedShelf.width);
        const maxY = Math.max(0, deposit.height - selectedShelf.height);

        const finalX = Math.min(xMeters, maxX);
        const finalY = Math.min(yMeters, maxY);

        setSelectedShelf({
            ...selectedShelf,
            x_position: finalX,
            y_position: finalY,
        });
    };

    const handleMouseUp = () => {
        if (isDragging && selectedShelf) {
            const finalShelf = {
                ...selectedShelf,
            };
            updateShelfMutation.mutate({
                shelfId: finalShelf.id,
                data: {
                    x_position: finalShelf.x_position,
                    y_position: finalShelf.y_position,
                },
            }, {
                onSuccess: () => {
                    toast.success('Shelf position updated');
                }
            });
        }
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            const moveHandler = (e) => handleShelfDragMove(e);
            const upHandler = () => handleMouseUp();
            
            window.addEventListener('mousemove', moveHandler);
            window.addEventListener('mouseup', upHandler);
            return () => {
                window.removeEventListener('mousemove', moveHandler);
                window.removeEventListener('mouseup', upHandler);
            };
        }
    }, [isDragging, selectedShelf, dragStart, deposit]);

    const handleDeleteShelf = () => {
        if (selectedShelf && window.confirm(`Delete shelf "${selectedShelf.name}"?`)) {
            deleteShelfMutation.mutate(selectedShelf.id);
        }
    };

    const handleDeleteWall = () => {
        if (selectedWall && window.confirm(`Delete wall?`)) {
            deleteWallMutation.mutate(selectedWall.id);
        }
    };

    const handleDeleteDoor = () => {
        if (selectedDoor && window.confirm(`Delete door "${selectedDoor.name || 'door'}"?`)) {
            deleteDoorMutation.mutate(selectedDoor.id);
        }
    };

    const handleStartDrawingWall = () => {
        setDrawingMode('wall');
        setWallStart(null);
        setSelectedShelf(null);
        setSelectedWall(null);
        setSelectedDoor(null);
        setIsDragging(false);
    };

    const handleStartDrawingDoor = () => {
        setDrawingMode('door');
        setSelectedShelf(null);
        setSelectedWall(null);
        setSelectedDoor(null);
        setIsDragging(false);
    };

    const handleCancelDrawing = () => {
        setDrawingMode(null);
        setWallStart(null);
        setSelectedShelf(null);
        setSelectedWall(null);
        setSelectedDoor(null);
    };

    if (depositLoading || shelvesLoading || wallsLoading || doorsLoading) {
        return <div className="text-center py-8 text-gray-600">Loading...</div>;
    }

    if (!deposit) {
        return <div className="text-red-500 p-4">Deposit not found</div>;
    }

    if (!hasPermission('view deposits')) {
        return <div className="text-red-500 p-4">You don't have permission to view deposits.</div>;
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Deposit Configurator</h1>
                    <p className="text-gray-600 mt-1">{deposit.name} - {deposit.width}m × {deposit.height}m</p>
                </div>
                <button
                    onClick={() => navigate('/deposits')}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                    Back to Deposits
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <div className="bg-white shadow-md rounded-lg p-6">
                        <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
                            <h2 className="text-xl font-semibold">Layout</h2>
                            <div className="flex items-center gap-4 flex-wrap">
                                <label className="text-sm text-gray-700">
                                    New Shelf Size:
                                </label>
                                <input
                                    type="number"
                                    value={newShelfSize.width}
                                    onChange={(e) => setNewShelfSize({ ...newShelfSize, width: parseFloat(e.target.value) || 1 })}
                                    step="0.1"
                                    min="0.1"
                                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                                    placeholder="W"
                                />
                                <span>×</span>
                                <input
                                    type="number"
                                    value={newShelfSize.height}
                                    onChange={(e) => setNewShelfSize({ ...newShelfSize, height: parseFloat(e.target.value) || 1 })}
                                    step="0.1"
                                    min="0.1"
                                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                                    placeholder="H"
                                />
                                <span className="text-sm text-gray-500">meters</span>
                                <button
                                    onClick={handleAddShelf}
                                    disabled={!hasPermission('edit deposits') || !deposit || drawingMode}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Shelf
                                </button>
                                <button
                                    onClick={drawingMode === 'wall' ? handleCancelDrawing : handleStartDrawingWall}
                                    disabled={!hasPermission('edit deposits') || !deposit}
                                    className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                                        drawingMode === 'wall' 
                                            ? 'bg-red-600 text-white hover:bg-red-700' 
                                            : 'bg-gray-600 text-white hover:bg-gray-700'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                    {drawingMode === 'wall' ? 'Cancel Wall' : 'Add Wall'}
                                </button>
                                <button
                                    onClick={drawingMode === 'door' ? handleCancelDrawing : handleStartDrawingDoor}
                                    disabled={!hasPermission('edit deposits') || !deposit}
                                    className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                                        drawingMode === 'door' 
                                            ? 'bg-red-600 text-white hover:bg-red-700' 
                                            : 'bg-orange-600 text-white hover:bg-orange-700'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                                    </svg>
                                    {drawingMode === 'door' ? 'Cancel Door' : 'Add Door'}
                                </button>
                                <div className="flex items-center gap-2 border-l pl-4 ml-2">
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
                                        {Math.round(scale * 100)}%
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
                        </div>
                        <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 overflow-auto" style={{ maxHeight: '600px' }}>
                            <DepositMap
                                deposit={deposit}
                                shelves={shelves?.data || shelves || []}
                                walls={walls?.data || walls || []}
                                doors={doors?.data || doors || []}
                                scale={scale}
                                canvasRef={canvasRef}
                                selectedShelf={selectedShelf}
                                selectedWall={selectedWall}
                                selectedDoor={selectedDoor}
                                drawingMode={drawingMode}
                                wallStart={wallStart}
                                mousePosition={mousePosition}
                                allShelfProducts={allShelfProducts}
                                onCanvasClick={handleCanvasClick}
                                onMouseMove={handleMouseMove}
                                onShelfDragStart={handleShelfDragStart}
                                pointToLineDistance={pointToLineDistance}
                                metersToPixels={metersToPixels}
                                pixelsToMeters={pixelsToMeters}
                                createDoorMutation={createDoorMutation}
                            />
                        </div>
                        <p className="text-sm text-gray-500 mt-2 text-center">
                            {drawingMode === 'wall' && !wallStart && 'Click to set wall start point'}
                            {drawingMode === 'wall' && wallStart && 'Click to set wall end point'}
                            {drawingMode === 'door' && 'Click on a wall to place door'}
                            {!drawingMode && 'Drag shelves to reposition • Click to select • Use buttons to add items • Ctrl+Scroll to zoom'}
                        </p>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-white shadow-md rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            {selectedShelf ? 'Shelf Details' : selectedWall ? 'Wall Details' : selectedDoor ? 'Door Details' : drawingMode ? 'Drawing Mode' : 'Details'}
                        </h2>
                        {selectedWall ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedWall.name || ''}
                                        onChange={(e) => {
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder="Wall name (optional)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Start Position (meters)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            value={selectedWall.x_start}
                                            readOnly
                                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100"
                                            placeholder="X"
                                        />
                                        <input
                                            type="number"
                                            value={selectedWall.y_start}
                                            readOnly
                                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100"
                                            placeholder="Y"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        End Position (meters)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            value={selectedWall.x_end}
                                            readOnly
                                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100"
                                            placeholder="X"
                                        />
                                        <input
                                            type="number"
                                            value={selectedWall.y_end}
                                            readOnly
                                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100"
                                            placeholder="Y"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Thickness (meters)
                                    </label>
                                    <input
                                        type="number"
                                        value={selectedWall.thickness || 0.2}
                                        readOnly
                                        className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Length (meters)
                                    </label>
                                    <input
                                        type="number"
                                        value={Math.sqrt(
                                            Math.pow(selectedWall.x_end - selectedWall.x_start, 2) +
                                            Math.pow(selectedWall.y_end - selectedWall.y_start, 2)
                                        ).toFixed(2)}
                                        readOnly
                                        className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100"
                                    />
                                </div>
                                <button
                                    onClick={handleDeleteWall}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                    disabled={!hasPermission('edit deposits')}
                                >
                                    Delete Wall
                                </button>
                            </div>
                        ) : selectedDoor ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedDoor.name || ''}
                                        onChange={(e) => {
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder="Door name (optional)"
                                    />
                                </div>
                                {selectedDoor.wall_id && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Wall
                                        </label>
                                        <input
                                            type="text"
                                            value={walls.find(w => w.id === selectedDoor.wall_id)?.name || `Wall #${selectedDoor.wall_id}`}
                                            readOnly
                                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Position (meters)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            value={selectedDoor.x_position}
                                            readOnly
                                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100"
                                            placeholder="X"
                                        />
                                        <input
                                            type="number"
                                            value={selectedDoor.y_position}
                                            readOnly
                                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100"
                                            placeholder="Y"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Width (meters)
                                    </label>
                                    <input
                                        type="number"
                                        value={selectedDoor.width || 0.9}
                                        readOnly
                                        className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Orientation
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedDoor.orientation || 'horizontal'}
                                        readOnly
                                        className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 capitalize"
                                    />
                                </div>
                                <button
                                    onClick={handleDeleteDoor}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                    disabled={!hasPermission('edit deposits')}
                                >
                                    Delete Door
                                </button>
                            </div>
                        ) : selectedShelf ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedShelf.name}
                                        onChange={(e) => {
                                            if (drawingMode) return;
                                            updateShelfMutation.mutate({
                                                shelfId: selectedShelf.id,
                                                data: { name: e.target.value },
                                            });
                                        }}
                                        disabled={!!drawingMode}
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md ${drawingMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Position (meters)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            value={selectedShelf.x_position}
                                            onChange={(e) => {
                                                if (drawingMode) return;
                                                updateShelfMutation.mutate({
                                                    shelfId: selectedShelf.id,
                                                    data: { x_position: parseFloat(e.target.value) || 0 },
                                                });
                                            }}
                                            disabled={!!drawingMode}
                                            step="0.01"
                                            className={`w-full px-2 py-1 border border-gray-300 rounded ${drawingMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                            placeholder="X"
                                        />
                                        <input
                                            type="number"
                                            value={selectedShelf.y_position}
                                            onChange={(e) => {
                                                if (drawingMode) return;
                                                updateShelfMutation.mutate({
                                                    shelfId: selectedShelf.id,
                                                    data: { y_position: parseFloat(e.target.value) || 0 },
                                                });
                                            }}
                                            disabled={!!drawingMode}
                                            step="0.01"
                                            className={`w-full px-2 py-1 border border-gray-300 rounded ${drawingMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                            placeholder="Y"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Size (meters)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            value={selectedShelf.width}
                                            onChange={(e) => {
                                                if (drawingMode) return;
                                                updateShelfMutation.mutate({
                                                    shelfId: selectedShelf.id,
                                                    data: { width: parseFloat(e.target.value) || 0 },
                                                });
                                            }}
                                            disabled={!!drawingMode}
                                            step="0.01"
                                            className={`w-full px-2 py-1 border border-gray-300 rounded ${drawingMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                            placeholder="W"
                                        />
                                        <input
                                            type="number"
                                            value={selectedShelf.height}
                                            onChange={(e) => {
                                                if (drawingMode) return;
                                                updateShelfMutation.mutate({
                                                    shelfId: selectedShelf.id,
                                                    data: { height: parseFloat(e.target.value) || 0 },
                                                });
                                            }}
                                            disabled={!!drawingMode}
                                            step="0.01"
                                            className={`w-full px-2 py-1 border border-gray-300 rounded ${drawingMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                            placeholder="H"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Depth (meters)
                                    </label>
                                    <input
                                        type="number"
                                        value={selectedShelf.depth || ''}
                                        onChange={(e) => {
                                            if (drawingMode) return;
                                            updateShelfMutation.mutate({
                                                shelfId: selectedShelf.id,
                                                data: { depth: parseFloat(e.target.value) || null },
                                            });
                                        }}
                                        disabled={!!drawingMode}
                                        step="0.01"
                                        className={`w-full px-2 py-1 border border-gray-300 rounded ${drawingMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Capacity (m³)
                                    </label>
                                    <input
                                        type="number"
                                        value={selectedShelf.capacity || ''}
                                        readOnly
                                        className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100"
                                    />
                                </div>

                                <div className="border-t pt-4 mt-4">
                                    <h3 className="text-lg font-semibold mb-3">Products in Shelf</h3>
                                    <ShelfProductsList
                                        products={shelfProducts}
                                        isLoading={shelfProductsLoading}
                                        error={shelfProductsError}
                                    />
                                </div>

                                <button
                                    onClick={handleDeleteShelf}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                    disabled={!hasPermission('edit deposits') || !!drawingMode}
                                >
                                    Delete Shelf
                                </button>
                            </div>
                        ) : drawingMode ? (
                            <div className="space-y-4">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <p className="text-sm text-yellow-800 font-medium mb-2">
                                        {drawingMode === 'wall' && !wallStart && 'Click to set wall start point'}
                                        {drawingMode === 'wall' && wallStart && 'Click to set wall end point'}
                                        {drawingMode === 'door' && 'Click on a wall or border to place door'}
                                    </p>
                                    <button
                                        onClick={handleCancelDrawing}
                                        className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">
                                Click on a shelf, wall, or door to view and edit its details
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../utils/api';
import { usePermissions } from '../../hooks/usePermissions';

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

    const handleMouseMove = (e) => {
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
            const moveHandler = (e) => handleMouseMove(e);
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

    const canvasWidth = metersToPixels(deposit.width);
    const canvasHeight = metersToPixels(deposit.height);

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
                            <div
                                ref={canvasRef}
                                className="relative bg-white mx-auto"
                                style={{
                                    width: `${canvasWidth}px`,
                                    height: `${canvasHeight}px`,
                                    minHeight: `${Math.max(canvasHeight, 300)}px`,
                                }}
                                onClick={handleCanvasClick}
                                onMouseMove={(e) => {
                                    const rect = canvasRef.current.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const y = e.clientY - rect.top;
                                    
                                    if (drawingMode === 'wall' && wallStart) {
                                        setMousePosition({ x, y });
                                    } else if (drawingMode === 'door') {
                                        setMousePosition({ x, y });
                                    }
                                }}
                            >
                                <div
                                    className="absolute border-2 border-blue-500"
                                    style={{
                                        width: `${canvasWidth}px`,
                                        height: `${canvasHeight}px`,
                                        left: 0,
                                        top: 0,
                                    }}
                                />

                                {walls.map((wall) => {
                                    const wallXStart = parseFloat(wall.x_start);
                                    const wallYStart = parseFloat(wall.y_start);
                                    const wallXEnd = parseFloat(wall.x_end);
                                    const wallYEnd = parseFloat(wall.y_end);
                                    
                                    const x1 = metersToPixels(wallXStart);
                                    const y1 = metersToPixels(wallYStart);
                                    const x2 = metersToPixels(wallXEnd);
                                    const y2 = metersToPixels(wallYEnd);
                                    const isSelected = selectedWall?.id === wall.id;
                                    const thickness = metersToPixels(parseFloat(wall.thickness) || 0.2);
                                    
                                    const isHovered = drawingMode === 'door' && (() => {
                                        const detectionThreshold = Math.max(25, 25 / scale);
                                        const distance = pointToLineDistance(mousePosition.x, mousePosition.y, x1, y1, x2, y2);
                                        return distance < detectionThreshold;
                                    })();

                                    const clickableWidth = Math.max(30, 30 / scale);

                                    return (
                                        <React.Fragment key={wall.id}>
                                            <svg
                                                className="absolute pointer-events-none"
                                                style={{
                                                    width: `${canvasWidth}px`,
                                                    height: `${canvasHeight}px`,
                                                    left: 0,
                                                    top: 0,
                                                }}
                                            >
                                                <line
                                                    x1={x1}
                                                    y1={y1}
                                                    x2={x2}
                                                    y2={y2}
                                                    stroke={
                                                        isSelected ? '#2563eb' : 
                                                        isHovered && drawingMode === 'door' ? '#f59e0b' : 
                                                        '#6b7280'
                                                    }
                                                    strokeWidth={Math.max(thickness, isHovered && drawingMode === 'door' ? 8 : 4)}
                                                />
                                            </svg>
                                            {drawingMode === 'door' && (
                                                <svg
                                                    className="absolute pointer-events-auto"
                                                    style={{
                                                        width: `${canvasWidth}px`,
                                                        height: `${canvasHeight}px`,
                                                        left: 0,
                                                        top: 0,
                                                        zIndex: 40, 
                                                    }}
                                                >
                                                    <line
                                                        x1={x1}
                                                        y1={y1}
                                                        x2={x2}
                                                        y2={y2}
                                                        stroke="transparent"
                                                        strokeWidth={clickableWidth}
                                                        className="cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            
                                                            const xStart = parseFloat(wall.x_start);
                                                            const yStart = parseFloat(wall.y_start);
                                                            const xEnd = parseFloat(wall.x_end);
                                                            const yEnd = parseFloat(wall.y_end);
                                                            
                                                            const rect = canvasRef.current.getBoundingClientRect();
                                                            const clickX = e.clientX - rect.left;
                                                            const clickY = e.clientY - rect.top;
                                                            const clickXMeters = pixelsToMeters(clickX);
                                                            const clickYMeters = pixelsToMeters(clickY);
                                                            
                                                            const dx = xEnd - xStart;
                                                            const dy = yEnd - yStart;
                                                            const wallLength = Math.sqrt(dx * dx + dy * dy);

                                                            if (wallLength === 0) {
                                                                toast.error('Invalid wall');
                                                                return;
                                                            }

                                                            const t = Math.max(0, Math.min(1, 
                                                                ((clickXMeters - xStart) * dx + (clickYMeters - yStart) * dy) / (wallLength * wallLength)
                                                            ));

                                                            const doorX = parseFloat((xStart + t * dx).toFixed(2));
                                                            const doorY = parseFloat((yStart + t * dy).toFixed(2));

                                                            const isHorizontal = Math.abs(dy) < Math.abs(dx);
                                                            const orientation = isHorizontal ? 'horizontal' : 'vertical';

                                                            const doorData = {
                                                                wall_id: wall.id,
                                                                x_position: doorX,
                                                                y_position: doorY,
                                                                width: 0.9,
                                                                orientation: orientation,
                                                            };

                                                            createDoorMutation.mutate(doorData);
                                                        }}
                                                    />
                                                </svg>
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                {drawingMode === 'wall' && wallStart && (
                                    <svg
                                        className="absolute pointer-events-none"
                                        style={{
                                            width: `${canvasWidth}px`,
                                            height: `${canvasHeight}px`,
                                            left: 0,
                                            top: 0,
                                        }}
                                    >
                                        <line
                                            x1={metersToPixels(wallStart.x)}
                                            y1={metersToPixels(wallStart.y)}
                                            x2={mousePosition.x}
                                            y2={mousePosition.y}
                                            stroke="#ef4444"
                                            strokeWidth={Math.max(metersToPixels(0.2), 4)}
                                            strokeDasharray="5,5"
                                            opacity="0.7"
                                        />
                                    </svg>
                                )}

                                {drawingMode === 'door' && (
                                    <svg
                                        className="absolute pointer-events-auto z-30"
                                        style={{
                                            width: `${canvasWidth}px`,
                                            height: `${canvasHeight}px`,
                                            left: 0,
                                            top: 0,
                                        }}
                                    >
                                        <line
                                            x1={0}
                                            y1={0}
                                            x2={canvasWidth}
                                            y2={0}
                                            stroke="transparent"
                                            strokeWidth={Math.max(30, 30 / scale)}
                                            className="cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                const rect = canvasRef.current.getBoundingClientRect();
                                                const clickX = e.clientX - rect.left;
                                                const clickXMeters = pixelsToMeters(clickX);
                                                const doorData = {
                                                    x_position: Math.max(0, Math.min(clickXMeters, deposit.width)),
                                                    y_position: 0,
                                                    width: 0.9,
                                                    orientation: 'horizontal',
                                                };
                                                createDoorMutation.mutate(doorData);
                                            }}
                                        />
                                        <line
                                            x1={0}
                                            y1={0}
                                            x2={canvasWidth}
                                            y2={0}
                                            stroke="#f59e0b"
                                            strokeWidth={6}
                                            opacity={(() => {
                                                const distance = Math.abs(mousePosition.y - 0);
                                                return distance < 25 ? 0.8 : 0.3;
                                            })()}
                                            pointerEvents="none"
                                        />
                                        <line
                                            x1={canvasWidth}
                                            y1={0}
                                            x2={canvasWidth}
                                            y2={canvasHeight}
                                            stroke="transparent"
                                            strokeWidth={Math.max(30, 30 / scale)}
                                            className="cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                const rect = canvasRef.current.getBoundingClientRect();
                                                const clickY = e.clientY - rect.top;
                                                const clickYMeters = pixelsToMeters(clickY);
                                                const doorData = {
                                                    x_position: deposit.width,
                                                    y_position: Math.max(0, Math.min(clickYMeters, deposit.height)),
                                                    width: 0.9,
                                                    orientation: 'vertical',
                                                };
                                                createDoorMutation.mutate(doorData);
                                            }}
                                        />
                                        <line
                                            x1={canvasWidth}
                                            y1={0}
                                            x2={canvasWidth}
                                            y2={canvasHeight}
                                            stroke="#f59e0b"
                                            strokeWidth={6}
                                            opacity={(() => {
                                                const distance = Math.abs(mousePosition.x - canvasWidth);
                                                return distance < 25 ? 0.8 : 0.3;
                                            })()}
                                            pointerEvents="none"
                                        />
                                        <line
                                            x1={canvasWidth}
                                            y1={canvasHeight}
                                            x2={0}
                                            y2={canvasHeight}
                                            stroke="transparent"
                                            strokeWidth={Math.max(30, 30 / scale)}
                                            className="cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                const rect = canvasRef.current.getBoundingClientRect();
                                                const clickX = e.clientX - rect.left;
                                                const clickXMeters = pixelsToMeters(clickX);
                                                const doorData = {
                                                    x_position: Math.max(0, Math.min(clickXMeters, deposit.width)),
                                                    y_position: deposit.height,
                                                    width: 0.9,
                                                    orientation: 'horizontal',
                                                };
                                                createDoorMutation.mutate(doorData);
                                            }}
                                        />
                                        <line
                                            x1={canvasWidth}
                                            y1={canvasHeight}
                                            x2={0}
                                            y2={canvasHeight}
                                            stroke="#f59e0b"
                                            strokeWidth={6}
                                            opacity={(() => {
                                                const distance = Math.abs(mousePosition.y - canvasHeight);
                                                return distance < 25 ? 0.8 : 0.3;
                                            })()}
                                            pointerEvents="none"
                                        />
                                        <line
                                            x1={0}
                                            y1={canvasHeight}
                                            x2={0}
                                            y2={0}
                                            stroke="transparent"
                                            strokeWidth={Math.max(30, 30 / scale)}
                                            className="cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                const rect = canvasRef.current.getBoundingClientRect();
                                                const clickY = e.clientY - rect.top;
                                                const clickYMeters = pixelsToMeters(clickY);
                                                const doorData = {
                                                    x_position: 0,
                                                    y_position: Math.max(0, Math.min(clickYMeters, deposit.height)),
                                                    width: 0.9,
                                                    orientation: 'vertical',
                                                };
                                                createDoorMutation.mutate(doorData);
                                            }}
                                        />
                                        <line
                                            x1={0}
                                            y1={canvasHeight}
                                            x2={0}
                                            y2={0}
                                            stroke="#f59e0b"
                                            strokeWidth={6}
                                            opacity={(() => {
                                                const distance = Math.abs(mousePosition.x - 0);
                                                return distance < 25 ? 0.8 : 0.3;
                                            })()}
                                            pointerEvents="none"
                                        />
                                    </svg>
                                )}

                                {drawingMode === 'door' && (() => {
                                    const borderWalls = [
                                        { id: 'border-top', x_start: 0, y_start: 0, x_end: deposit.width, y_end: 0 },
                                        { id: 'border-right', x_start: deposit.width, y_start: 0, x_end: deposit.width, y_end: deposit.height },
                                        { id: 'border-bottom', x_start: deposit.width, y_start: deposit.height, x_end: 0, y_end: deposit.height },
                                        { id: 'border-left', x_start: 0, y_start: deposit.height, x_end: 0, y_end: 0 },
                                    ];

                                    const detectionThreshold = Math.max(20, 20 / scale);
                                    
                                    let hoveredWall = null;
                                    let minDistance = Infinity;
                                    
                                    walls.forEach(wall => {
                                        if (!wall || typeof wall.x_start === 'undefined') return;
                                        const x1 = metersToPixels(wall.x_start);
                                        const y1 = metersToPixels(wall.y_start);
                                        const x2 = metersToPixels(wall.x_end);
                                        const y2 = metersToPixels(wall.y_end);
                                        const distance = pointToLineDistance(mousePosition.x, mousePosition.y, x1, y1, x2, y2);
                                        if (distance < detectionThreshold && distance < minDistance) {
                                            minDistance = distance;
                                            hoveredWall = wall;
                                        }
                                    });
                                    
                                    if (!hoveredWall) {
                                        minDistance = Infinity;
                                        borderWalls.forEach(wall => {
                                            const x1 = metersToPixels(wall.x_start);
                                            const y1 = metersToPixels(wall.y_start);
                                            const x2 = metersToPixels(wall.x_end);
                                            const y2 = metersToPixels(wall.y_end);
                                            const distance = pointToLineDistance(mousePosition.x, mousePosition.y, x1, y1, x2, y2);
                                            if (distance < detectionThreshold && distance < minDistance) {
                                                minDistance = distance;
                                                hoveredWall = wall;
                                            }
                                        });
                                    }

                                    if (hoveredWall) {
                                        const wallLength = Math.sqrt(
                                            Math.pow(hoveredWall.x_end - hoveredWall.x_start, 2) +
                                            Math.pow(hoveredWall.y_end - hoveredWall.y_start, 2)
                                        );
                                        
                                        if (wallLength > 0) {
                                            const dx = hoveredWall.x_end - hoveredWall.x_start;
                                            const dy = hoveredWall.y_end - hoveredWall.y_start;
                                            const mouseXMeters = pixelsToMeters(mousePosition.x);
                                            const mouseYMeters = pixelsToMeters(mousePosition.y);
                                            const t = Math.max(0, Math.min(1, 
                                                ((mouseXMeters - hoveredWall.x_start) * dx + (mouseYMeters - hoveredWall.y_start) * dy) / (wallLength * wallLength)
                                            ));
                                            const doorX = hoveredWall.x_start + t * dx;
                                            const doorY = hoveredWall.y_start + t * dy;
                                            const isHorizontal = Math.abs(dy) < Math.abs(dx);
                                            const doorW = isHorizontal ? metersToPixels(0.9) : 12;
                                            const doorH = isHorizontal ? 12 : metersToPixels(0.9);

                                            return (
                                                <div
                                                    className="absolute border-2 border-orange-500 bg-orange-200 opacity-70 pointer-events-none z-30"
                                                    style={{
                                                        left: `${metersToPixels(doorX) - (isHorizontal ? doorW / 2 : 6)}px`,
                                                        top: `${metersToPixels(doorY) - (isHorizontal ? 6 : doorH / 2)}px`,
                                                        width: `${doorW}px`,
                                                        height: `${doorH}px`,
                                                    }}
                                                />
                                            );
                                        }
                                    }
                                    return null;
                                })()}

                                {doors.map((door) => {
                                    const doorX = metersToPixels(door.x_position);
                                    const doorY = metersToPixels(door.y_position);
                                    const doorW = door.orientation === 'horizontal' ? metersToPixels(door.width) : 12;
                                    const doorH = door.orientation === 'vertical' ? metersToPixels(door.width) : 12;
                                    const isSelected = selectedDoor?.id === door.id;
                                    const isDisabled = !!drawingMode;

                                    return (
                                        <div
                                            key={door.id}
                                            className={`absolute border-2 ${
                                                isDisabled
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : isSelected
                                                    ? 'bg-orange-300 border-orange-600 shadow-lg cursor-pointer'
                                                    : 'bg-orange-200 border-orange-500 hover:bg-orange-300 cursor-pointer'
                                            }`}
                                            style={{
                                                left: `${doorX - (door.orientation === 'horizontal' ? doorW / 2 : 6)}px`,
                                                top: `${doorY - (door.orientation === 'vertical' ? doorH / 2 : 6)}px`,
                                                width: `${doorW}px`,
                                                height: `${doorH}px`,
                                                zIndex: 20,
                                                pointerEvents: drawingMode === 'door' ? 'none' : 'auto', 
                                            }}
                                            onClick={(e) => {
                                                if (isDisabled) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    return;
                                                }
                                                e.stopPropagation();
                                                setSelectedDoor(door);
                                                setSelectedShelf(null);
                                                setSelectedWall(null);
                                            }}
                                        >
                                            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700 pointer-events-none">
                                                {door.name || '🚪'}
                                            </div>
                                        </div>
                                    );
                                })}

                                {shelves.map((shelf) => {
                                    const displayShelf = selectedShelf?.id === shelf.id ? selectedShelf : shelf;
                                    const shelfX = metersToPixels(displayShelf.x_position);
                                    const shelfY = metersToPixels(displayShelf.y_position);
                                    const shelfW = metersToPixels(displayShelf.width);
                                    const shelfH = metersToPixels(displayShelf.height);
                                    const isSelected = selectedShelf?.id === shelf.id;
                                    const isDisabled = !!drawingMode;

                                    return (
                                        <div
                                            key={shelf.id}
                                            className={`absolute border-2 transition-all ${
                                                isDisabled
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : isSelected
                                                    ? 'bg-blue-200 border-blue-600 shadow-lg cursor-move'
                                                    : 'bg-yellow-200 border-yellow-500 hover:bg-yellow-300 cursor-move'
                                            }`}
                                            style={{
                                                left: `${shelfX}px`,
                                                top: `${shelfY}px`,
                                                width: `${shelfW}px`,
                                                height: `${shelfH}px`,
                                                zIndex: 10,
                                                pointerEvents: drawingMode === 'door' ? 'none' : 'auto',
                                            }}
                                            onMouseDown={(e) => handleShelfDragStart(e, shelf)}
                                            onClick={(e) => {
                                                if (isDisabled) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    return;
                                                }
                                                e.stopPropagation();
                                                setSelectedShelf(shelf);
                                                setSelectedWall(null);
                                                setSelectedDoor(null);
                                            }}
                                        >
                                            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700 pointer-events-none">
                                                {displayShelf.name}
                                            </div>
                                        </div>
                                    );
                                })}

                                <svg 
                                    className="absolute pointer-events-none" 
                                    style={{ 
                                        width: `${canvasWidth}px`, 
                                        height: `${canvasHeight}px`,
                                        left: 0,
                                        top: 0,
                                    }}
                                    viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                                    preserveAspectRatio="none"
                                >
                                    {Array.from({ length: Math.ceil(deposit.width) + 1 }).map((_, i) => (
                                        <line
                                            key={`v-${i}`}
                                            x1={metersToPixels(i)}
                                            y1={0}
                                            x2={metersToPixels(i)}
                                            y2={canvasHeight}
                                            stroke="#e5e7eb"
                                            strokeWidth="1"
                                        />
                                    ))}
                                    {Array.from({ length: Math.ceil(deposit.height) + 1 }).map((_, i) => (
                                        <line
                                            key={`h-${i}`}
                                            x1={0}
                                            y1={metersToPixels(i)}
                                            x2={canvasWidth}
                                            y2={metersToPixels(i)}
                                            stroke="#e5e7eb"
                                            strokeWidth="1"
                                        />
                                    ))}
                                </svg>
                            </div>
                            <p className="text-sm text-gray-500 mt-2 text-center">
                                {drawingMode === 'wall' && !wallStart && 'Click to set wall start point'}
                                {drawingMode === 'wall' && wallStart && 'Click to set wall end point'}
                                {drawingMode === 'door' && 'Click on a wall to place door'}
                                {!drawingMode && 'Drag shelves to reposition • Click to select • Use buttons to add items • Ctrl+Scroll to zoom'}
                            </p>
                        </div>
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


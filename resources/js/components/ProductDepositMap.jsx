import React from 'react';

export default function ProductDepositMap({
    depositDetails,
    shelves,
    walls,
    doors,
    productShelfId,
    scale = 1,
    containerRef
}) {
    if (!depositDetails) return null;

    const metersToPixels = (meters) => meters * 50 * scale;

    return (
        <div 
            ref={containerRef}
            className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 overflow-auto flex-1"
            style={{ maxHeight: 'calc(90vh - 200px)' }}
        >
            <div 
                className="relative bg-white mx-auto border-2 border-blue-500"
                style={{
                    width: `${metersToPixels(depositDetails.width)}px`,
                    height: `${metersToPixels(depositDetails.height)}px`,
                    minHeight: `${Math.max(metersToPixels(depositDetails.height), 300)}px`,
                }}
            >
                <svg 
                    className="absolute pointer-events-none" 
                    style={{ 
                        width: `${metersToPixels(depositDetails.width)}px`, 
                        height: `${metersToPixels(depositDetails.height)}px`,
                        left: 0,
                        top: 0,
                    }}
                >
                    {Array.from({ length: Math.ceil(depositDetails.width) + 1 }).map((_, i) => (
                        <line
                            key={`v-${i}`}
                            x1={metersToPixels(i)}
                            y1={0}
                            x2={metersToPixels(i)}
                            y2={metersToPixels(depositDetails.height)}
                            stroke="#e5e7eb"
                            strokeWidth="1"
                        />
                    ))}
                    {Array.from({ length: Math.ceil(depositDetails.height) + 1 }).map((_, i) => (
                        <line
                            key={`h-${i}`}
                            x1={0}
                            y1={metersToPixels(i)}
                            x2={metersToPixels(depositDetails.width)}
                            y2={metersToPixels(i)}
                            stroke="#e5e7eb"
                            strokeWidth="1"
                        />
                    ))}
                </svg>

                {walls && walls.map((wall) => {
                    const wallXStart = parseFloat(wall.x_start);
                    const wallYStart = parseFloat(wall.y_start);
                    const wallXEnd = parseFloat(wall.x_end);
                    const wallYEnd = parseFloat(wall.y_end);
                    
                    const x1 = metersToPixels(wallXStart);
                    const y1 = metersToPixels(wallYStart);
                    const x2 = metersToPixels(wallXEnd);
                    const y2 = metersToPixels(wallYEnd);
                    const thickness = metersToPixels(parseFloat(wall.thickness) || 0.2);

                    return (
                        <svg
                            key={wall.id}
                            className="absolute pointer-events-none"
                            style={{
                                width: `${metersToPixels(depositDetails.width)}px`,
                                height: `${metersToPixels(depositDetails.height)}px`,
                                left: 0,
                                top: 0,
                            }}
                        >
                            <line
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke="#6b7280"
                                strokeWidth={Math.max(thickness, 4)}
                            />
                        </svg>
                    );
                })}

                {doors && doors.map((door) => {
                    const doorX = metersToPixels(door.x_position);
                    const doorY = metersToPixels(door.y_position);
                    const doorW = door.orientation === 'horizontal' ? metersToPixels(door.width) : 12;
                    const doorH = door.orientation === 'vertical' ? metersToPixels(door.width) : 12;

                    return (
                        <div
                            key={door.id}
                            className="absolute border-2 bg-orange-200 border-orange-500"
                            style={{
                                left: `${doorX - (door.orientation === 'horizontal' ? doorW / 2 : 6)}px`,
                                top: `${doorY - (door.orientation === 'vertical' ? doorH / 2 : 6)}px`,
                                width: `${doorW}px`,
                                height: `${doorH}px`,
                                zIndex: 20,
                            }}
                        >
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700 pointer-events-none">
                                {door.name || '🚪'}
                            </div>
                        </div>
                    );
                })}

                {shelves && shelves.map((shelf) => {
                    const isProductShelf = shelf.id === productShelfId;
                    return (
                        <div
                            key={shelf.id}
                            className={`absolute border-2 ${
                                isProductShelf
                                    ? 'bg-green-300 border-green-600 shadow-lg z-30 ring-4 ring-green-400'
                                    : 'bg-yellow-200 border-yellow-500 z-10'
                            }`}
                            style={{
                                left: `${metersToPixels(shelf.x_position)}px`,
                                top: `${metersToPixels(shelf.y_position)}px`,
                                width: `${metersToPixels(shelf.width)}px`,
                                height: `${metersToPixels(shelf.height)}px`,
                            }}
                        >
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-semibold text-gray-700 pointer-events-none p-1">
                                <div className="truncate w-full text-center">{shelf.name}</div>
                                {isProductShelf && (
                                    <div className="text-xs text-green-800 font-bold mt-1 animate-pulse">
                                        ⭐ Product Location
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


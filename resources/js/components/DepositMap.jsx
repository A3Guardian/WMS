import React from "react";

export default function DepositMap({
    deposit,
    shelves,
    walls,
    doors,
    scale = 1,
    canvasRef,
    selectedShelf,
    selectedWall,
    selectedDoor,
    drawingMode,
    wallStart,
    mousePosition,
    draggingWallEndpoint,
    onWallEndpointDragStart,
    draggingDoorResize,
    onDoorResizeStart,
    onDoorSelect,
    onDoorDragStart,
    allShelfProducts = [],
    onCanvasClick,
    onMouseMove,
    onShelfDragStart,
    pointToLineDistance,
    metersToPixels,
    pixelsToMeters,
    createDoorMutation,
}) {
    if (!deposit) return null;

    const canvasWidth = metersToPixels(deposit.width);
    const canvasHeight = metersToPixels(deposit.height);

    const wallsList = walls?.length >= 0 ? walls : [];
    if (
        typeof window !== "undefined" &&
        selectedWall?.id &&
        wallsList.length > 0
    ) {
        const drawnWall = wallsList.find((w) => w.id === selectedWall.id);
        if (drawnWall) {
            const mismatch =
                String(drawnWall.x_end) !== String(selectedWall.x_end) ||
                String(drawnWall.y_end) !== String(selectedWall.y_end) ||
                String(drawnWall.x_start) !== String(selectedWall.x_start) ||
                String(drawnWall.y_start) !== String(selectedWall.y_start);
            if (mismatch) {
                console.log(
                    "[DepositMap] MISMATCH: list wall vs selectedWall",
                    {
                        fromList: {
                            x_start: drawnWall.x_start,
                            y_start: drawnWall.y_start,
                            x_end: drawnWall.x_end,
                            y_end: drawnWall.y_end,
                        },
                        selectedWall: {
                            x_start: selectedWall.x_start,
                            y_start: selectedWall.y_start,
                            x_end: selectedWall.x_end,
                            y_end: selectedWall.y_end,
                        },
                    },
                );
            }
        }
    }

    return (
        <div
            ref={canvasRef}
            className="relative bg-white mx-auto"
            style={{
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`,
                minHeight: `${Math.max(canvasHeight, 300)}px`,
            }}
            onClick={onCanvasClick}
            onMouseMove={onMouseMove}
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
                {Array.from({ length: Math.ceil(deposit.width) + 1 }).map(
                    (_, i) => (
                        <line
                            key={`v-${i}`}
                            x1={metersToPixels(i)}
                            y1={0}
                            x2={metersToPixels(i)}
                            y2={canvasHeight}
                            stroke="#e5e7eb"
                            strokeWidth="1"
                        />
                    ),
                )}
                {Array.from({ length: Math.ceil(deposit.height) + 1 }).map(
                    (_, i) => (
                        <line
                            key={`h-${i}`}
                            x1={0}
                            y1={metersToPixels(i)}
                            x2={canvasWidth}
                            y2={metersToPixels(i)}
                            stroke="#e5e7eb"
                            strokeWidth="1"
                        />
                    ),
                )}
            </svg>

            {walls &&
                walls.map((wall) => {
                    let wallXStart = parseFloat(wall.x_start);
                    let wallYStart = parseFloat(wall.y_start);
                    let wallXEnd = parseFloat(wall.x_end);
                    let wallYEnd = parseFloat(wall.y_end);
                    if (
                        draggingWallEndpoint &&
                        draggingWallEndpoint.wall?.id === wall.id
                    ) {
                        if (draggingWallEndpoint.which === "start") {
                            wallXStart = draggingWallEndpoint.x;
                            wallYStart = draggingWallEndpoint.y;
                        } else {
                            wallXEnd = draggingWallEndpoint.x;
                            wallYEnd = draggingWallEndpoint.y;
                        }
                    }

                    const x1 = metersToPixels(wallXStart);
                    const y1 = metersToPixels(wallYStart);
                    const x2 = metersToPixels(wallXEnd);
                    const y2 = metersToPixels(wallYEnd);
                    const isSelected = selectedWall?.id === wall.id;
                    const baseThicknessMeters =
                        parseFloat(wall.thickness) || 0.1;
                    const wallThicknessPx = Math.max(
                        metersToPixels(baseThicknessMeters),
                        2,
                    );

                    const isHovered =
                        drawingMode === "door" &&
                        (() => {
                            const detectionThreshold = Math.max(25, 25 / scale);
                            const distance = pointToLineDistance(
                                mousePosition.x,
                                mousePosition.y,
                                x1,
                                y1,
                                x2,
                                y2,
                            );
                            return distance < detectionThreshold;
                        })();

                    const clickableWidth = Math.max(30, 30 / scale);
                    const showHandles =
                        isSelected && !drawingMode && onWallEndpointDragStart;
                    const handleSize = 12;

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
                                        isSelected
                                            ? "#2563eb"
                                            : isHovered &&
                                                drawingMode === "door"
                                              ? "#f59e0b"
                                              : "#6b7280"
                                    }
                                    strokeWidth={
                                        isHovered && drawingMode === "door"
                                            ? Math.max(wallThicknessPx, 6)
                                            : wallThicknessPx
                                    }
                                    strokeLinecap="round"
                                />
                            </svg>
                            {showHandles && (
                                <>
                                    <div
                                        className="absolute rounded-full bg-blue-600 border-2 border-white shadow cursor-grab active:cursor-grabbing pointer-events-auto z-50 hover:bg-blue-500"
                                        style={{
                                            width: `${handleSize * 2}px`,
                                            height: `${handleSize * 2}px`,
                                            left: `${x1}px`,
                                            top: `${y1}px`,
                                            transform: "translate(-50%, -50%)",
                                        }}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            onWallEndpointDragStart(
                                                wall,
                                                "start",
                                            );
                                        }}
                                        title="Drag to resize wall"
                                    />
                                    <div
                                        className="absolute rounded-full bg-blue-600 border-2 border-white shadow cursor-grab active:cursor-grabbing pointer-events-auto z-50 hover:bg-blue-500"
                                        style={{
                                            width: `${handleSize * 2}px`,
                                            height: `${handleSize * 2}px`,
                                            left: `${x2}px`,
                                            top: `${y2}px`,
                                            transform: "translate(-50%, -50%)",
                                        }}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            onWallEndpointDragStart(
                                                wall,
                                                "end",
                                            );
                                        }}
                                        title="Drag to resize wall"
                                    />
                                </>
                            )}
                            {drawingMode === "door" && (
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

                                            const xStart = parseFloat(
                                                wall.x_start,
                                            );
                                            const yStart = parseFloat(
                                                wall.y_start,
                                            );
                                            const xEnd = parseFloat(wall.x_end);
                                            const yEnd = parseFloat(wall.y_end);

                                            const rect =
                                                canvasRef.current.getBoundingClientRect();
                                            const clickX =
                                                e.clientX - rect.left;
                                            const clickY = e.clientY - rect.top;
                                            const clickXMeters =
                                                pixelsToMeters(clickX);
                                            const clickYMeters =
                                                pixelsToMeters(clickY);

                                            const dx = xEnd - xStart;
                                            const dy = yEnd - yStart;
                                            const wallLength = Math.sqrt(
                                                dx * dx + dy * dy,
                                            );

                                            if (wallLength === 0) {
                                                return;
                                            }

                                            const t = Math.max(
                                                0,
                                                Math.min(
                                                    1,
                                                    ((clickXMeters - xStart) *
                                                        dx +
                                                        (clickYMeters -
                                                            yStart) *
                                                            dy) /
                                                        (wallLength *
                                                            wallLength),
                                                ),
                                            );

                                            const doorX = parseFloat(
                                                (xStart + t * dx).toFixed(2),
                                            );
                                            const doorY = parseFloat(
                                                (yStart + t * dy).toFixed(2),
                                            );

                                            const isHorizontal =
                                                Math.abs(dy) < Math.abs(dx);
                                            const orientation = isHorizontal
                                                ? "horizontal"
                                                : "vertical";

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

            {drawingMode === "wall" && wallStart && (
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

            {drawingMode === "door" && (
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
                            const rect =
                                canvasRef.current.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const clickXMeters = pixelsToMeters(clickX);
                            const doorData = {
                                x_position: Math.max(
                                    0,
                                    Math.min(clickXMeters, deposit.width),
                                ),
                                y_position: 0,
                                width: 0.9,
                                orientation: "horizontal",
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
                            const rect =
                                canvasRef.current.getBoundingClientRect();
                            const clickY = e.clientY - rect.top;
                            const clickYMeters = pixelsToMeters(clickY);
                            const doorData = {
                                x_position: deposit.width,
                                y_position: Math.max(
                                    0,
                                    Math.min(clickYMeters, deposit.height),
                                ),
                                width: 0.9,
                                orientation: "vertical",
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
                            const distance = Math.abs(
                                mousePosition.x - canvasWidth,
                            );
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
                            const rect =
                                canvasRef.current.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const clickXMeters = pixelsToMeters(clickX);
                            const doorData = {
                                x_position: Math.max(
                                    0,
                                    Math.min(clickXMeters, deposit.width),
                                ),
                                y_position: deposit.height,
                                width: 0.9,
                                orientation: "horizontal",
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
                            const distance = Math.abs(
                                mousePosition.y - canvasHeight,
                            );
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
                            const rect =
                                canvasRef.current.getBoundingClientRect();
                            const clickY = e.clientY - rect.top;
                            const clickYMeters = pixelsToMeters(clickY);
                            const doorData = {
                                x_position: 0,
                                y_position: Math.max(
                                    0,
                                    Math.min(clickYMeters, deposit.height),
                                ),
                                width: 0.9,
                                orientation: "vertical",
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

            {drawingMode === "door" &&
                (() => {
                    const borderWalls = [
                        {
                            id: "border-top",
                            x_start: 0,
                            y_start: 0,
                            x_end: deposit.width,
                            y_end: 0,
                        },
                        {
                            id: "border-right",
                            x_start: deposit.width,
                            y_start: 0,
                            x_end: deposit.width,
                            y_end: deposit.height,
                        },
                        {
                            id: "border-bottom",
                            x_start: deposit.width,
                            y_start: deposit.height,
                            x_end: 0,
                            y_end: deposit.height,
                        },
                        {
                            id: "border-left",
                            x_start: 0,
                            y_start: deposit.height,
                            x_end: 0,
                            y_end: 0,
                        },
                    ];

                    const detectionThreshold = Math.max(20, 20 / scale);

                    let hoveredWall = null;
                    let minDistance = Infinity;

                    walls.forEach((wall) => {
                        if (!wall || typeof wall.x_start === "undefined")
                            return;
                        const x1 = metersToPixels(wall.x_start);
                        const y1 = metersToPixels(wall.y_start);
                        const x2 = metersToPixels(wall.x_end);
                        const y2 = metersToPixels(wall.y_end);
                        const distance = pointToLineDistance(
                            mousePosition.x,
                            mousePosition.y,
                            x1,
                            y1,
                            x2,
                            y2,
                        );
                        if (
                            distance < detectionThreshold &&
                            distance < minDistance
                        ) {
                            minDistance = distance;
                            hoveredWall = wall;
                        }
                    });

                    if (!hoveredWall) {
                        minDistance = Infinity;
                        borderWalls.forEach((wall) => {
                            const x1 = metersToPixels(wall.x_start);
                            const y1 = metersToPixels(wall.y_start);
                            const x2 = metersToPixels(wall.x_end);
                            const y2 = metersToPixels(wall.y_end);
                            const distance = pointToLineDistance(
                                mousePosition.x,
                                mousePosition.y,
                                x1,
                                y1,
                                x2,
                                y2,
                            );
                            if (
                                distance < detectionThreshold &&
                                distance < minDistance
                            ) {
                                minDistance = distance;
                                hoveredWall = wall;
                            }
                        });
                    }

                    if (hoveredWall) {
                        const wx1 = parseFloat(hoveredWall.x_start);
                        const wy1 = parseFloat(hoveredWall.y_start);
                        const wx2 = parseFloat(hoveredWall.x_end);
                        const wy2 = parseFloat(hoveredWall.y_end);

                        const wallLength = Math.sqrt(
                            Math.pow(wx2 - wx1, 2) + Math.pow(wy2 - wy1, 2),
                        );

                        if (wallLength > 0) {
                            const dx = wx2 - wx1;
                            const dy = wy2 - wy1;
                            const mouseXMeters = pixelsToMeters(
                                mousePosition.x,
                            );
                            const mouseYMeters = pixelsToMeters(
                                mousePosition.y,
                            );
                            const tProj =
                                ((mouseXMeters - wx1) * dx +
                                    (mouseYMeters - wy1) * dy) /
                                (wallLength * wallLength);
                            const tClamped = Math.max(0, Math.min(1, tProj));
                            const projX = wx1 + tClamped * dx;
                            const projY = wy1 + tClamped * dy;
                            const isHorizontal = Math.abs(dy) < Math.abs(dx);

                            const doorX = projX;
                            const doorY = projY;

                            const doorW = isHorizontal
                                ? metersToPixels(0.9)
                                : 12;
                            const doorH = isHorizontal
                                ? 12
                                : metersToPixels(0.9);

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

            {doors &&
                doors.map((door) => {
                    let displayDoor = door;
                    if (selectedDoor?.id === door.id) {
                        displayDoor = { ...displayDoor, ...selectedDoor };
                    }

                    const isSelected = selectedDoor?.id === door.id;
                    const isDisabled = !!drawingMode;
                    const isHorizontal =
                        (displayDoor.orientation || "horizontal") ===
                        "horizontal";

                    const baseX = parseFloat(displayDoor.x_position);
                    const baseY = parseFloat(displayDoor.y_position);
                    const baseWidth = parseFloat(displayDoor.width ?? 0.9);

                    let doorCenterX = baseX;
                    let doorCenterY = baseY;
                    let doorWidthMeters = baseWidth;
                    if (
                        draggingDoorResize &&
                        draggingDoorResize.door?.id === door.id
                    ) {
                        const currentW = baseWidth;
                        const half = currentW / 2;
                        if (isHorizontal) {
                            let startEdge = baseX - half;
                            let endEdge = baseX + half;
                            if (draggingDoorResize.which === "start")
                                startEdge = draggingDoorResize.x;
                            else endEdge = draggingDoorResize.x;
                            if (endEdge < startEdge)
                                [startEdge, endEdge] = [endEdge, startEdge];
                            doorWidthMeters = Math.max(
                                0.9,
                                endEdge - startEdge,
                            );
                            doorCenterX = (startEdge + endEdge) / 2;
                        } else {
                            let startEdge = baseY - half;
                            let endEdge = baseY + half;
                            if (draggingDoorResize.which === "start")
                                startEdge = draggingDoorResize.y;
                            else endEdge = draggingDoorResize.y;
                            if (endEdge < startEdge)
                                [startEdge, endEdge] = [endEdge, startEdge];
                            doorWidthMeters = Math.max(
                                0.9,
                                endEdge - startEdge,
                            );
                            doorCenterY = (startEdge + endEdge) / 2;
                        }
                    }

                    const doorX = metersToPixels(doorCenterX);
                    const doorY = metersToPixels(doorCenterY);
                    const doorW = isHorizontal
                        ? metersToPixels(doorWidthMeters)
                        : 12;
                    const doorH = !isHorizontal
                        ? metersToPixels(doorWidthMeters)
                        : 12;
                    const handleSize = 10;
                    const showHandles =
                        isSelected && !drawingMode && onDoorResizeStart;

                    return (
                        <div
                            key={door.id}
                            className={`absolute border-2 ${
                                isDisabled
                                    ? "opacity-50 cursor-not-allowed"
                                    : isSelected
                                      ? "bg-orange-100 border-orange-600 shadow-lg cursor-pointer"
                                      : "bg-orange-50 border-orange-400 hover:bg-orange-100 cursor-pointer"
                            }`}
                            style={{
                                left: `${doorX - (isHorizontal ? doorW / 2 : 6)}px`,
                                top: `${doorY - (!isHorizontal ? doorH / 2 : 6)}px`,
                                width: `${doorW}px`,
                                height: `${doorH}px`,
                                zIndex: 20,
                                pointerEvents:
                                    drawingMode === "door" ? "none" : "auto",
                            }}
                            onMouseDown={(e) => {
                                if (!onDoorDragStart || isDisabled) return;
                                if (e.button !== 0) return;
                                e.stopPropagation();
                                e.preventDefault();
                                onDoorDragStart(e, door);
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (isDisabled) {
                                    return;
                                }
                                if (onDoorSelect) {
                                    onDoorSelect(door);
                                }
                            }}
                        >
                            {/* technical-style door symbol */}
                            <div className="absolute inset-[2px] pointer-events-none flex flex-col text-[10px] text-orange-800">
                                <svg
                                    className="flex-1 w-full h-full"
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                >
                                    {isHorizontal ? (
                                        <>
                                            <line
                                                x1="0"
                                                y1="50"
                                                x2="100"
                                                y2="50"
                                                stroke="#ea580c"
                                                strokeWidth="6"
                                            />
                                            <polyline
                                                points="0,50 25,20 50,80 75,20 100,50"
                                                fill="none"
                                                stroke="#fb923c"
                                                strokeWidth="4"
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <line
                                                x1="50"
                                                y1="0"
                                                x2="50"
                                                y2="100"
                                                stroke="#ea580c"
                                                strokeWidth="6"
                                            />
                                            <polyline
                                                points="50,0 20,25 80,50 20,75 50,100"
                                                fill="none"
                                                stroke="#fb923c"
                                                strokeWidth="4"
                                            />
                                        </>
                                    )}
                                </svg>
                                {door.name && (
                                    <div className="px-1 pb-0.5 text-center truncate">
                                        {door.name}
                                    </div>
                                )}
                            </div>
                            {showHandles && (
                                <>
                                    <div
                                        className="absolute rounded-full bg-orange-600 border-2 border-white shadow cursor-grab active:cursor-grabbing"
                                        style={{
                                            width: `${handleSize * 2}px`,
                                            height: `${handleSize * 2}px`,
                                            left: isHorizontal ? "0px" : "50%",
                                            top: isHorizontal ? "50%" : "0px",
                                            transform: isHorizontal
                                                ? "translate(-50%, -50%)"
                                                : "translate(-50%, -50%)",
                                        }}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            onDoorResizeStart(door, "start");
                                        }}
                                        title="Drag to resize door"
                                    />
                                    <div
                                        className="absolute rounded-full bg-orange-600 border-2 border-white shadow cursor-grab active:cursor-grabbing"
                                        style={{
                                            width: `${handleSize * 2}px`,
                                            height: `${handleSize * 2}px`,
                                            left: isHorizontal ? "100%" : "50%",
                                            top: isHorizontal ? "50%" : "100%",
                                            transform: "translate(-50%, -50%)",
                                        }}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            onDoorResizeStart(door, "end");
                                        }}
                                        title="Drag to resize door"
                                    />
                                </>
                            )}
                        </div>
                    );
                })}

            {shelves &&
                shelves.map((shelf) => {
                    const displayShelf =
                        selectedShelf?.id === shelf.id ? selectedShelf : shelf;
                    const shelfX = metersToPixels(displayShelf.x_position);
                    const shelfY = metersToPixels(displayShelf.y_position);
                    const shelfW = metersToPixels(displayShelf.width);
                    const shelfH = metersToPixels(displayShelf.height);
                    const SHELF_INSET = 4;
                    const isSelected = selectedShelf?.id === shelf.id;
                    const isDisabled = !!drawingMode;
                    const productsInShelf = allShelfProducts.filter(
                        (p) => p.shelf_id === shelf.id,
                    );

                    return (
                        <div
                            key={shelf.id}
                            className="absolute cursor-move"
                            style={{
                                left: `${shelfX}px`,
                                top: `${shelfY}px`,
                                width: `${shelfW}px`,
                                height: `${shelfH}px`,
                                zIndex: 10,
                                pointerEvents:
                                    drawingMode === "door" ? "none" : "auto",
                            }}
                            onMouseDown={(e) => onShelfDragStart(e, shelf)}
                            onClick={(e) => {
                                if (isDisabled) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    return;
                                }
                                e.stopPropagation();
                                onCanvasClick(e);
                            }}
                        >
                            <div
                                className={`absolute border-2 transition-all ${
                                    isDisabled
                                        ? "opacity-50 cursor-not-allowed"
                                        : isSelected
                                          ? "bg-blue-200 border-blue-600 shadow-lg"
                                          : "bg-yellow-200 border-yellow-500 hover:bg-yellow-300"
                                }`}
                                style={{
                                    left: `${SHELF_INSET}px`,
                                    top: `${SHELF_INSET}px`,
                                    width: `calc(100% - ${SHELF_INSET * 2}px)`,
                                    height: `calc(100% - ${SHELF_INSET * 2}px)`,
                                }}
                            >
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-semibold text-gray-700 pointer-events-none p-1">
                                    <div className="truncate w-full text-center">
                                        {displayShelf.name}
                                    </div>
                                    {productsInShelf.length > 0 && (
                                        <div className="text-xs text-green-700 font-bold mt-1">
                                            {productsInShelf.length} product
                                            {productsInShelf.length !== 1
                                                ? "s"
                                                : ""}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
        </div>
    );
}

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import api from "../../utils/api";
import { usePermissions } from "../../hooks/usePermissions";
import DepositMap from "../../components/DepositMap";
import ShelfProductsList from "./ShelfProductsList";

export default function DepositConfigurator() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const canvasRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [baseScale, setBaseScale] = useState(1);
    const [selectedShelf, setSelectedShelf] = useState(null);
    const [selectedWall, setSelectedWall] = useState(null);
    const [selectedDoor, setSelectedDoor] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [shelfDragOrigin, setShelfDragOrigin] = useState(null); // { id, x, y } in meters
    const [newShelfSize, setNewShelfSize] = useState({ width: 1, height: 1 });
    const [drawingMode, setDrawingMode] = useState(null); // 'wall', 'door', or null
    const [wallStart, setWallStart] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [draggingWallEndpoint, setDraggingWallEndpoint] = useState(null); // { wall, which: 'start'|'end', x, y } in meters
    const draggingWallEndpointRef = useRef(null);
    const [wallForm, setWallForm] = useState({ name: "", thickness: "" });

    useEffect(() => {
        draggingWallEndpointRef.current = draggingWallEndpoint;
    }, [draggingWallEndpoint]);

    useEffect(() => {
        if (selectedWall) {
            setWallForm({
                name: selectedWall.name || "",
                thickness:
                    selectedWall.thickness !== undefined &&
                    selectedWall.thickness !== null
                        ? String(selectedWall.thickness)
                        : "0.2",
            });
        } else {
            setWallForm({ name: "", thickness: "" });
        }
    }, [selectedWall]);

    const GRID_STEP = 1;
    const snapToGrid = (val, max) => {
        const step = GRID_STEP;
        const snapped = Math.round(val / step) * step;
        return Math.max(0, Math.min(max, snapped));
    };

    const { data: deposit, isLoading: depositLoading } = useQuery({
        queryKey: ["deposit", id],
        queryFn: async () => {
            const response = await api.get(`/deposits/${id}`);
            return response.data;
        },
    });

    const { data: shelves = [], isLoading: shelvesLoading } = useQuery({
        queryKey: ["shelves", id],
        queryFn: async () => {
            const response = await api.get(`/deposits/${id}/shelves`);
            return response.data;
        },
        enabled: !!id,
    });

    const { data: walls = [], isLoading: wallsLoading } = useQuery({
        queryKey: ["walls", id],
        queryFn: async () => {
            const response = await api.get(`/deposits/${id}/walls`);
            return response.data;
        },
        enabled: !!id,
    });

    const { data: doors = [], isLoading: doorsLoading } = useQuery({
        queryKey: ["doors", id],
        queryFn: async () => {
            const response = await api.get(`/deposits/${id}/doors`);
            return response.data;
        },
        enabled: !!id,
    });

    const {
        data: shelfProducts = [],
        isLoading: shelfProductsLoading,
        error: shelfProductsError,
    } = useQuery({
        queryKey: ["shelf-products", id, selectedShelf?.id],
        queryFn: async () => {
            if (!selectedShelf?.id || !id) return [];
            try {
                const response = await api.get(
                    `/deposits/${id}/shelves/${selectedShelf.id}/products`,
                );
                return response.data || [];
            } catch (error) {
                console.error("Error fetching shelf products:", error);
                toast.error(t("deposits.configurator.toast.loadProductsFailed"), {
                    description:
                        error.response?.data?.message || t("common.genericError"),
                });
                return [];
            }
        },
        enabled: !!selectedShelf?.id && !!id,
    });

    const { data: allShelfProducts = [] } = useQuery({
        queryKey: ["all-shelf-products", id],
        queryFn: async () => {
            if (!id) return [];
            const response = await api.get("/products", {
                params: { deposit_id: id, per_page: 1000 },
            });
            return response.data?.data || response.data || [];
        },
        enabled: !!id,
    });

    const createShelfMutation = useMutation({
        mutationFn: async (shelfData) => {
            const response = await api.post(
                `/deposits/${id}/shelves`,
                shelfData,
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shelves", id] });
            toast.success(t("deposits.configurator.toast.shelfCreated"));
            setDrawingMode(null);
        },
        onError: (error) => {
            toast.error(t("deposits.configurator.toast.shelfCreateFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const updateShelfMutation = useMutation({
        mutationFn: async ({ shelfId, data }) => {
            const response = await api.put(
                `/deposits/${id}/shelves/${shelfId}`,
                data,
            );
            return response.data;
        },
        onSuccess: (updatedShelf) => {
            queryClient.setQueryData(["shelves", id], (oldShelves) => {
                return oldShelves.map((shelf) =>
                    shelf.id === updatedShelf.id ? updatedShelf : shelf,
                );
            });
            setSelectedShelf(updatedShelf);
        },
        onError: (error) => {
            toast.error(t("deposits.configurator.toast.shelfUpdateFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
            queryClient.invalidateQueries({ queryKey: ["shelves", id] });
        },
    });

    const deleteShelfMutation = useMutation({
        mutationFn: async (shelfId) => {
            await api.delete(`/deposits/${id}/shelves/${shelfId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shelves", id] });
            setSelectedShelf(null);
            toast.success(t("deposits.configurator.toast.shelfDeleted"));
        },
        onError: (error) => {
            toast.error(t("deposits.configurator.toast.shelfDeleteFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const createWallMutation = useMutation({
        mutationFn: async (wallData) => {
            const response = await api.post(`/deposits/${id}/walls`, wallData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["walls", id] });
            toast.success(t("deposits.configurator.toast.wallCreated"));
            setDrawingMode(null);
            setWallStart(null);
            setSelectedShelf(null);
            setSelectedWall(null);
            setSelectedDoor(null);
        },
        onError: (error) => {
            toast.error(t("deposits.configurator.toast.wallCreateFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const deleteWallMutation = useMutation({
        mutationFn: async (wallId) => {
            await api.delete(`/deposits/${id}/walls/${wallId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["walls", id] });
            setSelectedWall(null);
            toast.success(t("deposits.configurator.toast.wallDeleted"));
        },
        onError: (error) => {
            toast.error(t("deposits.configurator.toast.wallDeleteFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const updateWallMutation = useMutation({
        mutationFn: async ({ wallId, data }) => {
            console.log("[Wall update] Request:", {
                depositId: id,
                wallId,
                payload: data,
                url: `/deposits/${id}/walls/${wallId}`,
            });
            const response = await api.put(
                `/deposits/${id}/walls/${wallId}`,
                data,
            );
            console.log("[Wall update] Response:", {
                status: response.status,
                data: response.data,
                coords: response.data
                    ? {
                          x_start: response.data.x_start,
                          y_start: response.data.y_start,
                          x_end: response.data.x_end,
                          y_end: response.data.y_end,
                      }
                    : null,
            });
            return response.data;
        },
        onSuccess: (updatedWall) => {
            console.log("[Wall update] onSuccess:", {
                updatedWallId: updatedWall?.id,
                updatedWallCoords: updatedWall
                    ? {
                          x_start: updatedWall.x_start,
                          y_start: updatedWall.y_start,
                          x_end: updatedWall.x_end,
                          y_end: updatedWall.y_end,
                      }
                    : null,
            });
            queryClient.setQueryData(["walls", id], (old) => {
                const isArray = Array.isArray(old);
                const list = isArray ? old : (old?.data ?? []);
                console.log("[Wall update] setQueryData: old cache", {
                    isArray,
                    listLength: list.length,
                    oldWallIds: list.map((w) => w.id),
                });
                const next = list.map((w) =>
                    w.id === updatedWall.id ? { ...w, ...updatedWall } : w,
                );
                const updatedInList = next.find((w) => w.id === updatedWall.id);
                console.log("[Wall update] setQueryData: after merge", {
                    updatedInListCoords: updatedInList
                        ? {
                              x_start: updatedInList.x_start,
                              y_start: updatedInList.y_start,
                              x_end: updatedInList.x_end,
                              y_end: updatedInList.y_end,
                          }
                        : null,
                });
                return isArray ? next : { ...old, data: next };
            });
            setSelectedWall(updatedWall);
            setDraggingWallEndpoint(null);
            toast.success(t("deposits.configurator.toast.wallUpdated"));
            queryClient.invalidateQueries({ queryKey: ["walls", id] });
            console.log(
                "[Wall update] invalidateQueries called for [walls, id]",
            );
        },
        onError: (error) => {
            toast.error(t("deposits.configurator.toast.wallUpdateFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
            setDraggingWallEndpoint(null);
        },
    });

    const createDoorMutation = useMutation({
        mutationFn: async (doorData) => {
            const response = await api.post(`/deposits/${id}/doors`, doorData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["doors", id] });
            toast.success(t("deposits.configurator.toast.doorCreated"));
            setDrawingMode(null);
            setSelectedShelf(null);
            setSelectedWall(null);
            setSelectedDoor(null);
        },
        onError: (error) => {
            toast.error(t("deposits.configurator.toast.doorCreateFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const updateDoorMutation = useMutation({
        mutationFn: async ({ doorId, data }) => {
            const response = await api.put(
                `/deposits/${id}/doors/${doorId}`,
                data,
            );
            return response.data;
        },
        onSuccess: (updatedDoor) => {
            queryClient.setQueryData(["doors", id], (old) => {
                const isArray = Array.isArray(old);
                const list = isArray ? old : (old?.data ?? []);
                const next = list.map((d) =>
                    d.id === updatedDoor.id ? { ...d, ...updatedDoor } : d,
                );
                return isArray ? next : { ...old, data: next };
            });
            setSelectedDoor(updatedDoor);
            toast.success(t("deposits.configurator.toast.doorUpdated"));
            queryClient.invalidateQueries({ queryKey: ["doors", id] });
        },
        onError: (error) => {
            toast.error(t("deposits.configurator.toast.doorUpdateFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const deleteDoorMutation = useMutation({
        mutationFn: async (doorId) => {
            await api.delete(`/deposits/${id}/doors/${doorId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["doors", id] });
            setSelectedDoor(null);
            toast.success(t("deposits.configurator.toast.doorDeleted"));
        },
        onError: (error) => {
            toast.error(t("deposits.configurator.toast.doorDeleteFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
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
        setScale((prev) => Math.min(prev * 1.2, 5));
    };

    const handleZoomOut = () => {
        setScale((prev) => Math.max(prev / 1.2, 0.1));
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
                setScale((prev) => {
                    const newScale = prev * delta;
                    return Math.max(0.1, Math.min(5, newScale));
                });
            }
        };

        canvas.addEventListener("wheel", handleWheel, { passive: false });

        return () => {
            canvas.removeEventListener("wheel", handleWheel);
        };
    }, []);

    const metersToPixels = (meters) => meters * 50 * scale;

    const pixelsToMeters = (pixels) => pixels / (50 * scale);

    const [draggingDoorResize, setDraggingDoorResize] = useState(null);
    const draggingDoorResizeRef = useRef(null);
    const [draggingDoor, setDraggingDoor] = useState(null);
    const draggingDoorRef = useRef(null);

    useEffect(() => {
        draggingDoorResizeRef.current = draggingDoorResize;
    }, [draggingDoorResize]);

    useEffect(() => {
        draggingDoorRef.current = draggingDoor;
    }, [draggingDoor]);

    const snapDoorPointOnWall = ({ wall, xMeters, yMeters }) => {
        const xStart = parseFloat(wall.x_start);
        const yStart = parseFloat(wall.y_start);
        const xEnd = parseFloat(wall.x_end);
        const yEnd = parseFloat(wall.y_end);

        const dx = xEnd - xStart;
        const dy = yEnd - yStart;
        const wallLength = Math.sqrt(dx * dx + dy * dy);
        if (wallLength === 0) return null;

        const tRaw =
            ((xMeters - xStart) * dx + (yMeters - yStart) * dy) /
            (wallLength * wallLength);
        const t0 = Math.max(0, Math.min(1, tRaw));
        const px = xStart + t0 * dx;
        const py = yStart + t0 * dy;

        const isHorizontal = Math.abs(dy) < Math.abs(dx);
        const orientation = isHorizontal ? "horizontal" : "vertical";

        if (isHorizontal) {
            const snappedX = snapToGrid(px, deposit.width);
            const t = Math.abs(dx) < 1e-9 ? 0 : (snappedX - xStart) / dx;
            const tc = Math.max(0, Math.min(1, t));
            return {
                x_position: parseFloat((xStart + tc * dx).toFixed(2)),
                y_position: parseFloat((yStart + tc * dy).toFixed(2)),
                orientation,
            };
        }

        const snappedY = snapToGrid(py, deposit.height);
        const t = Math.abs(dy) < 1e-9 ? 0 : (snappedY - yStart) / dy;
        const tc = Math.max(0, Math.min(1, t));
        return {
            x_position: parseFloat((xStart + tc * dx).toFixed(2)),
            y_position: parseFloat((yStart + tc * dy).toFixed(2)),
            orientation,
        };
    };

    const handleCanvasClick = (e) => {
        if (isDragging) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const xMeters = pixelsToMeters(x);
        const yMeters = pixelsToMeters(y);

        if (drawingMode === "wall") {
            const snappedX = deposit
                ? snapToGrid(xMeters, deposit.width)
                : xMeters;
            const snappedY = deposit
                ? snapToGrid(yMeters, deposit.height)
                : yMeters;
            if (!wallStart) {
                setWallStart({ x: snappedX, y: snappedY });
                toast.info(t("deposits.configurator.hints.wallClickAgain"));
            } else {
                createWallMutation.mutate({
                    x_start: wallStart.x,
                    y_start: wallStart.y,
                    x_end: snappedX,
                    y_end: snappedY,
                    thickness: 0.2,
                });
            }
            return;
        }

        if (drawingMode === "door") {
            const borderWalls = [
                {
                    id: "border-top",
                    x_start: 0,
                    y_start: 0,
                    x_end: deposit.width,
                    y_end: 0,
                }, // Top
                {
                    id: "border-right",
                    x_start: deposit.width,
                    y_start: 0,
                    x_end: deposit.width,
                    y_end: deposit.height,
                }, // Right
                {
                    id: "border-bottom",
                    x_start: deposit.width,
                    y_start: deposit.height,
                    x_end: 0,
                    y_end: deposit.height,
                }, // Bottom
                {
                    id: "border-left",
                    x_start: 0,
                    y_start: deposit.height,
                    x_end: 0,
                    y_end: 0,
                }, // Left
            ];

            const detectionThreshold = Math.max(20, 20 / scale);

            let clickedWall = null;
            let minDistance = Infinity;

            walls.forEach((wall) => {
                if (!wall || typeof wall.x_start === "undefined") return;

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
                borderWalls.forEach((wall) => {
                    const x1 = metersToPixels(wall.x_start);
                    const y1 = metersToPixels(wall.y_start);
                    const x2 = metersToPixels(wall.x_end);
                    const y2 = metersToPixels(wall.y_end);

                    const distance = pointToLineDistance(x, y, x1, y1, x2, y2);
                    if (
                        distance < detectionThreshold &&
                        distance < minDistance
                    ) {
                        minDistance = distance;
                        clickedWall = wall;
                    }
                });
            }

            if (!clickedWall) {
                console.log("Door placement failed:", {
                    clickPos: { x, y },
                    xMeters,
                    yMeters,
                    wallsCount: walls.length,
                    detectionThreshold,
                    scale,
                });
                toast.error(t("deposits.configurator.errors.clickWallForDoor"));
                return;
            }

            const snapped = snapDoorPointOnWall({
                wall: clickedWall,
                xMeters,
                yMeters,
            });
            if (!snapped) {
                toast.error(t("deposits.configurator.errors.invalidWall"));
                return;
            }

            const doorData = {
                ...snapped,
                width: 0.9,
            };

            const isBorderWall =
                typeof clickedWall.id === "string" &&
                clickedWall.id.startsWith("border-");
            if (clickedWall.id && !isBorderWall) {
                doorData.wall_id = clickedWall.id;
            }

            createDoorMutation.mutate(doorData);
            return;
        }

        if (drawingMode) {
            if (drawingMode === "door") {
                return;
            } else if (drawingMode === "wall") {
                return;
            }
            return;
        }

        const clickedShelf = shelves.find((shelf) => {
            const shelfX = metersToPixels(shelf.x_position);
            const shelfY = metersToPixels(shelf.y_position);
            const shelfW = metersToPixels(shelf.width);
            const shelfH = metersToPixels(shelf.height);

            return (
                x >= shelfX &&
                x <= shelfX + shelfW &&
                y >= shelfY &&
                y <= shelfY + shelfH
            );
        });

        if (clickedShelf) {
            setSelectedShelf(clickedShelf);
            setSelectedWall(null);
            setSelectedDoor(null);
            return;
        }

        const clickedWall = walls.find((wall) => {
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

        const clickedDoor = doors.find((door) => {
            const doorX = metersToPixels(door.x_position);
            const doorY = metersToPixels(door.y_position);
            const doorW =
                door.orientation === "horizontal"
                    ? metersToPixels(door.width)
                    : 10;
            const doorH =
                door.orientation === "vertical"
                    ? metersToPixels(door.width)
                    : 10;

            return (
                x >= doorX - 5 &&
                x <= doorX + doorW + 5 &&
                y >= doorY - 5 &&
                y <= doorY + doorH + 5
            );
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

        if (drawingMode === "wall" && wallStart && deposit) {
            const snappedX = snapToGrid(pixelsToMeters(x), deposit.width);
            const snappedY = snapToGrid(pixelsToMeters(y), deposit.height);
            setMousePosition({
                x: metersToPixels(snappedX),
                y: metersToPixels(snappedY),
            });
        } else if (drawingMode === "door") {
            setMousePosition({ x, y });
        } else if (draggingWallEndpoint && deposit) {
            const xMeters = snapToGrid(pixelsToMeters(x), deposit.width);
            const yMeters = snapToGrid(pixelsToMeters(y), deposit.height);
            setDraggingWallEndpoint((prev) =>
                prev ? { ...prev, x: xMeters, y: yMeters } : null,
            );
        } else if (draggingDoor && deposit) {
            const xMeters = pixelsToMeters(x);
            const yMeters = pixelsToMeters(y);
            const snapped = snapDoorPointOnWall({
                wall: draggingDoor.wall,
                xMeters,
                yMeters,
            });
            if (!snapped) return;

            setDraggingDoor((prev) =>
                prev
                    ? {
                          ...prev,
                          x: snapped.x_position,
                          y: snapped.y_position,
                      }
                    : null,
            );

            setSelectedDoor((prev) =>
                prev && prev.id === draggingDoor.door.id
                    ? {
                          ...prev,
                          x_position: snapped.x_position,
                          y_position: snapped.y_position,
                      }
                    : prev,
            );
        } else if (draggingDoorResize && deposit) {
            const xMeters = snapToGrid(pixelsToMeters(x), deposit.width);
            const yMeters = snapToGrid(pixelsToMeters(y), deposit.height);
            setDraggingDoorResize((prev) =>
                prev ? { ...prev, x: xMeters, y: yMeters } : null,
            );
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
        if (!deposit || !hasPermission("edit deposits")) return;

        let xPos = 0;
        let yPos = 0;

        const positionOccupied = (x, y, width, height) => {
            return shelves.some((shelf) => {
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
        for (
            let y = 0;
            y <= deposit.height - newShelfSize.height && !found;
            y += 0.5
        ) {
            for (
                let x = 0;
                x <= deposit.width - newShelfSize.width && !found;
                x += 0.5
            ) {
                if (
                    !positionOccupied(
                        x,
                        y,
                        newShelfSize.width,
                        newShelfSize.height,
                    )
                ) {
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
            name: t("deposits.configurator.shelfDefaultName", {
                number: shelves.length + 1,
            }),
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
        setShelfDragOrigin({
            id: shelf.id,
            x: shelf.x_position,
            y: shelf.y_position,
        });
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

        const snappedX = snapToGrid(Math.min(xMeters, maxX), maxX);
        const snappedY = snapToGrid(Math.min(yMeters, maxY), maxY);

        setSelectedShelf({
            ...selectedShelf,
            x_position: snappedX,
            y_position: snappedY,
        });
    };

    const handleMouseUp = () => {
        if (isDragging && selectedShelf) {
            const finalShelf = { ...selectedShelf };
            const origin =
                shelfDragOrigin && shelfDragOrigin.id === finalShelf.id
                    ? shelfDragOrigin
                    : null;

            const moved =
                !origin ||
                Math.abs(finalShelf.x_position - origin.x) > 1e-3 ||
                Math.abs(finalShelf.y_position - origin.y) > 1e-3;

            if (moved) {
                updateShelfMutation.mutate(
                    {
                        shelfId: finalShelf.id,
                        data: {
                            x_position: finalShelf.x_position,
                            y_position: finalShelf.y_position,
                        },
                    },
                    {
                        onSuccess: () => {
                            toast.success("Shelf position updated");
                        },
                    },
                );
            }
        }
        setIsDragging(false);
        setShelfDragOrigin(null);
    };

    useEffect(() => {
        if (isDragging) {
            const moveHandler = (e) => handleShelfDragMove(e);
            const upHandler = () => handleMouseUp();

            window.addEventListener("mousemove", moveHandler);
            window.addEventListener("mouseup", upHandler);
            return () => {
                window.removeEventListener("mousemove", moveHandler);
                window.removeEventListener("mouseup", upHandler);
            };
        }
    }, [isDragging, selectedShelf, dragStart, deposit]);

    const handleWallEndpointDragStart = (wall, which) => {
        if (!hasPermission("edit deposits")) return;
        setDraggingWallEndpoint({
            wall,
            which,
            x:
                which === "start"
                    ? parseFloat(wall.x_start)
                    : parseFloat(wall.x_end),
            y:
                which === "start"
                    ? parseFloat(wall.y_start)
                    : parseFloat(wall.y_end),
        });
    };

    const handleWallEndpointDragEnd = () => {
        const ep = draggingWallEndpointRef.current;
        if (!ep) return;
        const { wall, which, x, y } = ep;
        const round = (v) => parseFloat(Number(v).toFixed(2));
        const data =
            which === "start"
                ? { x_start: round(x), y_start: round(y) }
                : { x_end: round(x), y_end: round(y) };
        console.log("[Wall dragEnd] Sending update:", {
            wallId: wall.id,
            which,
            dragEndCoords: { x, y },
            payload: data,
        });
        updateWallMutation.mutate({
            wallId: wall.id,
            data,
        });
        setDraggingWallEndpoint(null);
        draggingWallEndpointRef.current = null;
    };

    const handleSaveWallDetails = () => {
        if (!selectedWall || !hasPermission("edit deposits")) return;

        const payload = {
            name: wallForm.name || null,
        };

        const thicknessValue = parseFloat(wallForm.thickness);
        if (!Number.isNaN(thicknessValue) && thicknessValue > 0) {
            payload.thickness = thicknessValue;
        }

        updateWallMutation.mutate({
            wallId: selectedWall.id,
            data: payload,
        });
    };

    const handleDoorResizeStart = (door, which) => {
        if (!hasPermission("edit deposits")) return;
        setDraggingDoorResize({
            door,
            which,
            x: parseFloat(door.x_position),
            y: parseFloat(door.y_position),
        });
    };

    const handleDoorResizeEnd = () => {
        const dr = draggingDoorResizeRef.current;
        if (!dr) return;

        const { door, which, x, y } = dr;
        const doorX = parseFloat(door.x_position);
        const doorY = parseFloat(door.y_position);
        const currentW = parseFloat(door.width ?? 0.9);
        const isHorizontal =
            (door.orientation || "horizontal") === "horizontal";

        const half = currentW / 2;
        let startEdge, endEdge;
        if (isHorizontal) {
            startEdge = doorX - half;
            endEdge = doorX + half;
            const moved = x;
            if (which === "start") startEdge = moved;
            else endEdge = moved;
            // snap edges to grid
            startEdge = snapToGrid(startEdge, deposit.width);
            endEdge = snapToGrid(endEdge, deposit.width);
            if (endEdge < startEdge)
                [startEdge, endEdge] = [endEdge, startEdge];
            const newW = Math.max(
                0.9,
                parseFloat((endEdge - startEdge).toFixed(2)),
            );
            const newCenter = parseFloat(
                ((startEdge + endEdge) / 2).toFixed(2),
            );
            updateDoorMutation.mutate({
                doorId: door.id,
                data: { x_position: newCenter, width: newW, y_position: doorY },
            });
        } else {
            startEdge = doorY - half;
            endEdge = doorY + half;
            const moved = y;
            if (which === "start") startEdge = moved;
            else endEdge = moved;
            startEdge = snapToGrid(startEdge, deposit.height);
            endEdge = snapToGrid(endEdge, deposit.height);
            if (endEdge < startEdge)
                [startEdge, endEdge] = [endEdge, startEdge];
            const newW = Math.max(
                0.9,
                parseFloat((endEdge - startEdge).toFixed(2)),
            );
            const newCenter = parseFloat(
                ((startEdge + endEdge) / 2).toFixed(2),
            );
            updateDoorMutation.mutate({
                doorId: door.id,
                data: { y_position: newCenter, width: newW, x_position: doorX },
            });
        }

        setDraggingDoorResize(null);
        draggingDoorResizeRef.current = null;
    };

    const getWallForDoor = (door) => {
        const wallList = (walls?.data || walls || []).filter(
            (w) => w && typeof w.x_start !== "undefined",
        );
        if (door.wall_id) {
            const w = wallList.find((w) => w.id === door.wall_id);
            if (w) return w;
        }

        const orientation = door.orientation || "horizontal";
        const x = parseFloat(door.x_position);
        const y = parseFloat(door.y_position);

        if (orientation === "horizontal") {
            const distTop = Math.abs(y - 0);
            const distBottom = Math.abs(y - deposit.height);
            if (distTop <= distBottom) {
                return {
                    x_start: 0,
                    y_start: 0,
                    x_end: deposit.width,
                    y_end: 0,
                };
            }
            return {
                x_start: deposit.width,
                y_start: deposit.height,
                x_end: 0,
                y_end: deposit.height,
            };
        }

        const distLeft = Math.abs(x - 0);
        const distRight = Math.abs(x - deposit.width);
        if (distLeft <= distRight) {
            return {
                x_start: 0,
                y_start: deposit.height,
                x_end: 0,
                y_end: 0,
            };
        }
        return {
            x_start: deposit.width,
            y_start: 0,
            x_end: deposit.width,
            y_end: deposit.height,
        };
    };

    const handleDoorDragStart = (e, door) => {
        if (drawingMode || !hasPermission("edit deposits")) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        e.stopPropagation();
        const wall = getWallForDoor(door);
        setDraggingDoor({
            door,
            wall,
            x: parseFloat(door.x_position),
            y: parseFloat(door.y_position),
        });
    };

    useEffect(() => {
        if (!draggingWallEndpoint) return;
        const moveHandler = (e) => handleMouseMove(e);
        const upHandler = () => handleWallEndpointDragEnd();
        window.addEventListener("mousemove", moveHandler);
        window.addEventListener("mouseup", upHandler);
        return () => {
            window.removeEventListener("mousemove", moveHandler);
            window.removeEventListener("mouseup", upHandler);
        };
    }, [!!draggingWallEndpoint]);

    const handleDoorDragEnd = () => {
        const dr = draggingDoorRef.current;
        if (!dr) return;
        const { door, x, y } = dr;
        updateDoorMutation.mutate({
            doorId: door.id,
            data: {
                x_position: x,
                y_position: y,
            },
        });
        setDraggingDoor(null);
        draggingDoorRef.current = null;
    };

    useEffect(() => {
        if (!draggingDoor) return;
        const moveHandler = (e) => handleMouseMove(e);
        const upHandler = () => handleDoorDragEnd();
        window.addEventListener("mousemove", moveHandler);
        window.addEventListener("mouseup", upHandler);
        return () => {
            window.removeEventListener("mousemove", moveHandler);
            window.removeEventListener("mouseup", upHandler);
        };
    }, [!!draggingDoor]);

    useEffect(() => {
        if (!draggingDoorResize) return;
        const moveHandler = (e) => handleMouseMove(e);
        const upHandler = () => handleDoorResizeEnd();
        window.addEventListener("mousemove", moveHandler);
        window.addEventListener("mouseup", upHandler);
        return () => {
            window.removeEventListener("mousemove", moveHandler);
            window.removeEventListener("mouseup", upHandler);
        };
    }, [!!draggingDoorResize]);

    const handleDeleteShelf = () => {
        if (
            selectedShelf &&
            window.confirm(
                t("deposits.configurator.confirmDelete.shelf", {
                    name: selectedShelf.name,
                }),
            )
        ) {
            deleteShelfMutation.mutate(selectedShelf.id);
        }
    };

    const handleDeleteWall = () => {
        if (selectedWall && window.confirm(t("deposits.configurator.confirmDelete.wall"))) {
            deleteWallMutation.mutate(selectedWall.id);
        }
    };

    const handleDeleteDoor = () => {
        if (
            selectedDoor &&
            window.confirm(
                t("deposits.configurator.confirmDelete.door", {
                    name: selectedDoor.name || t("deposits.configurator.door.defaultName"),
                }),
            )
        ) {
            deleteDoorMutation.mutate(selectedDoor.id);
        }
    };

    const handleStartDrawingWall = () => {
        setDrawingMode("wall");
        setWallStart(null);
        setSelectedShelf(null);
        setSelectedWall(null);
        setSelectedDoor(null);
        setIsDragging(false);
    };

    const handleStartDrawingDoor = () => {
        setDrawingMode("door");
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
        return (
            <div className="text-center py-8 text-gray-600">
                {t("common.loading")}
            </div>
        );
    }

    if (!deposit) {
        return (
            <div className="text-red-500 p-4">
                {t("deposits.configurator.errors.notFound")}
            </div>
        );
    }

    if (!hasPermission("view deposits")) {
        return (
            <div className="text-red-500 p-4">
                {t("deposits.errors.noPermissionView")}
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-start gap-3 min-w-0 mb-6">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label={t("common.back")}
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                    <h1 className="text-3xl font-bold truncate">
                        {t("deposits.configurator.title")}
                    </h1>
                    <p className="text-gray-600 mt-1 truncate">
                        {deposit.name} - {deposit.width}m × {deposit.height}m
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <div className="bg-white shadow-md rounded-lg p-6">
                        <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
                            <h2 className="text-xl font-semibold">
                                {t("deposits.configurator.layoutTitle")}
                            </h2>
                            <div className="flex items-center gap-4 flex-wrap">
                                <label className="text-sm text-gray-700">
                                    {t("deposits.configurator.newShelfSize")}:
                                </label>
                                <input
                                    type="number"
                                    value={newShelfSize.width}
                                    onChange={(e) =>
                                        setNewShelfSize({
                                            ...newShelfSize,
                                            width:
                                                parseFloat(e.target.value) || 1,
                                        })
                                    }
                                    step="0.1"
                                    min="0.1"
                                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                                    placeholder="W"
                                />
                                <span>×</span>
                                <input
                                    type="number"
                                    value={newShelfSize.height}
                                    onChange={(e) =>
                                        setNewShelfSize({
                                            ...newShelfSize,
                                            height:
                                                parseFloat(e.target.value) || 1,
                                        })
                                    }
                                    step="0.1"
                                    min="0.1"
                                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                                    placeholder="H"
                                />
                                <span className="text-sm text-gray-500">
                                    {t("deposits.configurator.meters")}
                                </span>
                                <button
                                    onClick={handleAddShelf}
                                    disabled={
                                        !hasPermission("edit deposits") ||
                                        !deposit ||
                                        drawingMode
                                    }
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 4v16m8-8H4"
                                        />
                                    </svg>
                                    {t("deposits.configurator.actions.addShelf")}
                                </button>
                                <button
                                    onClick={
                                        drawingMode === "wall"
                                            ? handleCancelDrawing
                                            : handleStartDrawingWall
                                    }
                                    disabled={
                                        !hasPermission("edit deposits") ||
                                        !deposit
                                    }
                                    className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                                        drawingMode === "wall"
                                            ? "bg-red-600 text-white hover:bg-red-700"
                                            : "bg-gray-600 text-white hover:bg-gray-700"
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 6h16M4 12h16M4 18h16"
                                        />
                                    </svg>
                                    {drawingMode === "wall"
                                        ? t("deposits.configurator.actions.cancelWall")
                                        : t("deposits.configurator.actions.addWall")}
                                </button>
                                <button
                                    onClick={
                                        drawingMode === "door"
                                            ? handleCancelDrawing
                                            : handleStartDrawingDoor
                                    }
                                    disabled={
                                        !hasPermission("edit deposits") ||
                                        !deposit
                                    }
                                    className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                                        drawingMode === "door"
                                            ? "bg-red-600 text-white hover:bg-red-700"
                                            : "bg-orange-600 text-white hover:bg-orange-700"
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                                        />
                                    </svg>
                                    {drawingMode === "door"
                                        ? t("deposits.configurator.actions.cancelDoor")
                                        : t("deposits.configurator.actions.addDoor")}
                                </button>
                                <div className="flex items-center gap-2 border-l pl-4 ml-2">
                                    <span className="text-sm text-gray-700">
                                        {t("deposits.configurator.zoom")}:
                                    </span>
                                    <button
                                        onClick={handleZoomOut}
                                        className="p-2 bg-gray-200 hover:bg-gray-300 rounded-md"
                                        title={t("deposits.configurator.actions.zoomOut")}
                                    >
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                                            />
                                        </svg>
                                    </button>
                                    <span className="text-sm font-medium w-16 text-center">
                                        {Math.round(scale * 100)}%
                                    </span>
                                    <button
                                        onClick={handleZoomIn}
                                        className="p-2 bg-gray-200 hover:bg-gray-300 rounded-md"
                                        title={t("deposits.configurator.actions.zoomIn")}
                                    >
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                                            />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={handleZoomReset}
                                        className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
                                        title={t("deposits.configurator.actions.resetZoom")}
                                    >
                                        {t("deposits.configurator.actions.reset")}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div
                            className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 overflow-auto"
                            style={{ maxHeight: "600px" }}
                        >
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
                                draggingWallEndpoint={draggingWallEndpoint}
                                onWallEndpointDragStart={
                                    handleWallEndpointDragStart
                                }
                                draggingDoorResize={draggingDoorResize}
                                onDoorResizeStart={handleDoorResizeStart}
                                onDoorSelect={(door) => {
                                    setSelectedDoor(door);
                                    setSelectedShelf(null);
                                    setSelectedWall(null);
                                }}
                                onDoorDragStart={handleDoorDragStart}
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
                            {drawingMode === "wall" &&
                                !wallStart &&
                                t("deposits.configurator.hints.wallStart")}
                            {drawingMode === "wall" &&
                                wallStart &&
                                t("deposits.configurator.hints.wallEnd")}
                            {drawingMode === "door" &&
                                t("deposits.configurator.hints.doorPlace")}
                            {!drawingMode &&
                                t("deposits.configurator.hints.default")}
                        </p>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-white shadow-md rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            {selectedShelf
                                ? t("deposits.configurator.details.shelf")
                                : selectedWall
                                  ? t("deposits.configurator.details.wall")
                                  : selectedDoor
                                    ? t("deposits.configurator.details.door")
                                    : drawingMode
                                      ? t("deposits.configurator.details.drawingMode")
                                      : t("deposits.configurator.details.title")}
                        </h2>
                        {selectedWall ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("common.name")}
                                    </label>
                                    <input
                                        type="text"
                                        value={wallForm.name}
                                        onChange={(e) =>
                                            setWallForm((prev) => ({
                                                ...prev,
                                                name: e.target.value,
                                            }))
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder={t("deposits.configurator.placeholders.wallName")}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.configurator.wall.startPosition")}
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
                                        {t("deposits.configurator.wall.endPosition")}
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
                                        {t("deposits.configurator.wall.thickness")}
                                    </label>
                                    <input
                                        type="number"
                                        value={wallForm.thickness}
                                        onChange={(e) =>
                                            setWallForm((prev) => ({
                                                ...prev,
                                                thickness: e.target.value,
                                            }))
                                        }
                                        step="0.01"
                                        min="0.01"
                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.configurator.wall.length")}
                                    </label>
                                    <input
                                        type="number"
                                        value={Math.sqrt(
                                            Math.pow(
                                                selectedWall.x_end -
                                                    selectedWall.x_start,
                                                2,
                                            ) +
                                                Math.pow(
                                                    selectedWall.y_end -
                                                        selectedWall.y_start,
                                                    2,
                                                ),
                                        ).toFixed(2)}
                                        readOnly
                                        className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleDeleteWall}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                        disabled={
                                            !hasPermission("edit deposits")
                                        }
                                    >
                                        {t("common.delete")}
                                    </button>
                                    <button
                                        onClick={handleSaveWallDetails}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={
                                            !hasPermission("edit deposits")
                                        }
                                    >
                                        {t("common.save")}
                                    </button>
                                </div>
                            </div>
                        ) : selectedDoor ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("common.name")}
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedDoor.name || ""}
                                        onChange={(e) => {}}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder={t("deposits.configurator.placeholders.doorName")}
                                    />
                                </div>
                                {selectedDoor.wall_id && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t("deposits.configurator.door.wall")}
                                        </label>
                                        <input
                                            type="text"
                                            value={
                                                walls.find(
                                                    (w) =>
                                                        w.id ===
                                                        selectedDoor.wall_id,
                                                )?.name ||
                                                t("deposits.configurator.door.wallNumber", {
                                                    id: selectedDoor.wall_id,
                                                })
                                            }
                                            readOnly
                                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.configurator.door.position")}
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
                                        {t("deposits.configurator.door.width")}
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
                                        {t("deposits.configurator.door.orientation")}
                                    </label>
                                    <input
                                        type="text"
                                        value={
                                            selectedDoor.orientation ||
                                            "horizontal"
                                        }
                                        readOnly
                                        className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 capitalize"
                                    />
                                </div>
                                <button
                                    onClick={handleDeleteDoor}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                    disabled={!hasPermission("edit deposits")}
                                >
                                    {t("deposits.configurator.actions.deleteDoor")}
                                </button>
                            </div>
                        ) : selectedShelf ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("common.name")}
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
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md ${drawingMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.configurator.shelf.position")}
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            value={selectedShelf.x_position}
                                            onChange={(e) => {
                                                if (drawingMode) return;
                                                updateShelfMutation.mutate({
                                                    shelfId: selectedShelf.id,
                                                    data: {
                                                        x_position:
                                                            parseFloat(
                                                                e.target.value,
                                                            ) || 0,
                                                    },
                                                });
                                            }}
                                            disabled={!!drawingMode}
                                            step="0.01"
                                            className={`w-full px-2 py-1 border border-gray-300 rounded ${drawingMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                                            placeholder="X"
                                        />
                                        <input
                                            type="number"
                                            value={selectedShelf.y_position}
                                            onChange={(e) => {
                                                if (drawingMode) return;
                                                updateShelfMutation.mutate({
                                                    shelfId: selectedShelf.id,
                                                    data: {
                                                        y_position:
                                                            parseFloat(
                                                                e.target.value,
                                                            ) || 0,
                                                    },
                                                });
                                            }}
                                            disabled={!!drawingMode}
                                            step="0.01"
                                            className={`w-full px-2 py-1 border border-gray-300 rounded ${drawingMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                                            placeholder="Y"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.configurator.shelf.size")}
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            value={selectedShelf.width}
                                            onChange={(e) => {
                                                if (drawingMode) return;
                                                updateShelfMutation.mutate({
                                                    shelfId: selectedShelf.id,
                                                    data: {
                                                        width:
                                                            parseFloat(
                                                                e.target.value,
                                                            ) || 0,
                                                    },
                                                });
                                            }}
                                            disabled={!!drawingMode}
                                            step="0.01"
                                            className={`w-full px-2 py-1 border border-gray-300 rounded ${drawingMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                                            placeholder="W"
                                        />
                                        <input
                                            type="number"
                                            value={selectedShelf.height}
                                            onChange={(e) => {
                                                if (drawingMode) return;
                                                updateShelfMutation.mutate({
                                                    shelfId: selectedShelf.id,
                                                    data: {
                                                        height:
                                                            parseFloat(
                                                                e.target.value,
                                                            ) || 0,
                                                    },
                                                });
                                            }}
                                            disabled={!!drawingMode}
                                            step="0.01"
                                            className={`w-full px-2 py-1 border border-gray-300 rounded ${drawingMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                                            placeholder="H"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.configurator.shelf.depth")}
                                    </label>
                                    <input
                                        type="number"
                                        value={selectedShelf.depth || ""}
                                        onChange={(e) => {
                                            if (drawingMode) return;
                                            updateShelfMutation.mutate({
                                                shelfId: selectedShelf.id,
                                                data: {
                                                    depth:
                                                        parseFloat(
                                                            e.target.value,
                                                        ) || null,
                                                },
                                            });
                                        }}
                                        disabled={!!drawingMode}
                                        step="0.01"
                                        className={`w-full px-2 py-1 border border-gray-300 rounded ${drawingMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.configurator.shelf.capacity")}
                                    </label>
                                    <input
                                        type="number"
                                        value={selectedShelf.capacity || ""}
                                        readOnly
                                        className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100"
                                    />
                                </div>

                                <div className="border-t pt-4 mt-4">
                                    <h3 className="text-lg font-semibold mb-3">
                                        {t("deposits.configurator.shelf.productsTitle")}
                                    </h3>
                                    <ShelfProductsList
                                        products={shelfProducts}
                                        isLoading={shelfProductsLoading}
                                        error={shelfProductsError}
                                    />
                                </div>

                                <button
                                    onClick={handleDeleteShelf}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                    disabled={
                                        !hasPermission("edit deposits") ||
                                        !!drawingMode
                                    }
                                >
                                    {t("deposits.configurator.actions.deleteShelf")}
                                </button>
                            </div>
                        ) : drawingMode ? (
                            <div className="space-y-4">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <p className="text-sm text-yellow-800 font-medium mb-2">
                                        {drawingMode === "wall" &&
                                            !wallStart &&
                                            t("deposits.configurator.hints.wallStartPoint")}
                                        {drawingMode === "wall" &&
                                            wallStart &&
                                            t("deposits.configurator.hints.wallEndPoint")}
                                        {drawingMode === "door" &&
                                            t("deposits.configurator.hints.doorBorder")}
                                    </p>
                                    <button
                                        onClick={handleCancelDrawing}
                                        className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                    >
                                        {t("common.cancel")}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">
                                {t("deposits.configurator.hints.clickToView")}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import api from "../../utils/api";
import { formatCurrency, formatDate } from "../../utils/formatters";
import {
    TASK_STATUS_LABELS,
    TASK_STATUS_COLORS,
    TASK_STATUS,
} from "../../utils/constants";
import PageHeader from "../../components/PageHeader";
import { generateOrderInvoicePdf } from "../../utils/orderInvoicePdf";
import { usePermissions } from "../../hooks/usePermissions";
import SearchableSelect from "../../components/SearchableSelect";
import CustomerFormModal from "../customers/CustomerFormModal";
import {
    Building2,
    MapPin,
    FileText,
    User,
    Upload,
    Trash2,
    FilePlus,
    Eye,
    UserMinus,
    Pencil,
    Plus,
    Hash,
    ClipboardList,
    Calendar,
    Banknote,
    Package,
    StickyNote,
    Truck,
    ListTodo,
    CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";

const DOC_TYPES = ["awb", "invoice", "other"];

const ORDER_STATUS_OPTIONS = [
    { value: "pending", labelKey: "orders.status.pending" },
    { value: "processing", labelKey: "orders.status.processing" },
    { value: "completed", labelKey: "orders.status.completed" },
    { value: "cancelled", labelKey: "orders.status.cancelled" },
];

export default function OrderView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const { t } = useTranslation();
    const [docType, setDocType] = useState("other");
    const [customerModalOpen, setCustomerModalOpen] = useState(false);
    const [showCustomerSelect, setShowCustomerSelect] = useState(false);
    const [editItems, setEditItems] = useState([]);
    const [editTaxRate, setEditTaxRate] = useState("21");
    const [editShippingAmount, setEditShippingAmount] = useState("");
    const [includeShipping, setIncludeShipping] = useState(false);
    const [showAddTaskForm, setShowAddTaskForm] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDescription, setNewTaskDescription] = useState("");
    const [newTaskDueDate, setNewTaskDueDate] = useState("");
    const [newTaskAssignedToUserId, setNewTaskAssignedToUserId] = useState("");
    const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

    const { hasRole } = usePermissions();
    const isEmployee = hasRole("Employee");

    const {
        data: order,
        isLoading: loadingOrder,
        error: orderError,
    } = useQuery({
        queryKey: ["order", id],
        queryFn: async () => {
            const res = await api.get(`/orders/${id}`);
            return res.data;
        },
        enabled: !!id,
    });

    useEffect(() => {
        if (!order) return;
        if (!order.items || order.items.length === 0) {
            setEditItems([]);
        } else {
            setEditItems(
                order.items.map((it) => ({
                    product_id: String(it.product_id ?? it.product?.id ?? ""),
                    product: it.product,
                    quantity: String(it.quantity ?? ""),
                    price: String(it.price ?? ""),
                })),
            );
        }
        setEditTaxRate(
            order.tax_rate != null && order.tax_rate !== ""
                ? String(order.tax_rate)
                : "21",
        );
        const ship = order.shipping_amount;
        setEditShippingAmount(
            ship != null && Number(ship) > 0 ? String(ship) : "",
        );
        setIncludeShipping(ship != null && Number(ship) > 0);
    }, [order?.id, order?.items, order?.tax_rate, order?.shipping_amount]);

    const { data: employeesData } = useQuery({
        queryKey: ["employees", "list"],
        queryFn: async () => {
            const res = await api.get("/employees?per_page=100");
            return res.data;
        },
        enabled: showAddTaskForm,
    });

    const { data: invoiceSettings } = useQuery({
        queryKey: ["settings", "invoice-data"],
        queryFn: async () => {
            const res = await api.get("/settings/invoice-data");
            return res.data;
        },
        enabled: !!id && !isEmployee,
    });

    const createTaskMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post("/tasks", payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["order", id] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            toast.success(t("orders.toast.taskAdded"));
            setShowAddTaskForm(false);
            setNewTaskTitle("");
            setNewTaskDescription("");
            setNewTaskDueDate("");
            setNewTaskAssignedToUserId("");
        },
        onError: (e) => {
            toast.error(
                e.response?.data?.message || t("orders.toast.taskAddFailed"),
            );
        },
    });

    const updateTaskStatusMutation = useMutation({
        mutationFn: async ({ taskId, status }) => {
            const res = await api.put(`/tasks/${taskId}`, { status });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["order", id] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            toast.success(t("orders.toast.statusUpdated"));
        },
        onError: (e) => {
            toast.error(
                e.response?.data?.message || t("orders.toast.statusUpdateFailed"),
            );
        },
    });

    const deleteTaskMutation = useMutation({
        mutationFn: async (taskId) => {
            await api.delete(`/tasks/${taskId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["order", id] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            toast.success(t("orders.toast.taskDeleted"));
        },
        onError: (e) => {
            toast.error(
                e.response?.data?.message || t("orders.toast.taskDeleteFailed"),
            );
        },
    });

    const uploadDocMutation = useMutation({
        mutationFn: async ({ orderId, file, name, type }) => {
            const formData = new FormData();
            formData.append("file", file);
            if (name) formData.append("name", name);
            if (type) formData.append("type", type);
            const res = await api.post(
                `/orders/${orderId}/documents`,
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                },
            );
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["order", id] });
            toast.success(t("orders.toast.documentUploaded"));
            if (fileInputRef.current) fileInputRef.current.value = "";
        },
        onError: (e) => {
            toast.error(e.response?.data?.message || t("orders.toast.uploadFailed"));
        },
    });

    const deleteDocMutation = useMutation({
        mutationFn: async ({ orderId, documentId }) => {
            await api.delete(`/orders/${orderId}/documents/${documentId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["order", id] });
            toast.success(t("orders.toast.documentDeleted"));
        },
        onError: (e) => {
            toast.error(e.response?.data?.message || t("orders.toast.deleteFailedGeneric"));
        },
    });

    const handleGenerateInvoice = async () => {
        if (!order?.id) return;

        if (!customer) {
            toast.error(t("orders.invoice.selectCustomerFirst"));
            return;
        }

        if (!editItems.length) {
            toast.error(
                t("orders.invoice.addItemsFirst"),
            );
            return;
        }

        try {
            setIsGeneratingInvoice(true);

            const { file, fileName } = await generateOrderInvoicePdf({
                order,
                customer,
                items: editItems,
                taxRate: editTaxRate,
                shippingAmount: editShippingAmount,
                includeShipping,
                company: invoiceSettings?.company ?? {},
                logoUrl: invoiceSettings?.logo_url ?? null,
            });

            uploadDocMutation.mutate({
                orderId: order.id,
                file,
                name: fileName,
                type: "invoice",
            });

            toast.success(t("orders.invoice.generatedAndAttached"));
        } catch (e) {
            console.error(e);
            toast.error(t("orders.invoice.generateFailed"));
        } finally {
            setIsGeneratingInvoice(false);
        }
    };

    const updateOrderCustomerMutation = useMutation({
        mutationFn: async ({ orderId, customerId }) => {
            const res = await api.put(`/orders/${orderId}`, {
                customer_id: customerId || null,
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["order", id] });
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            toast.success(t("orders.toast.customerUpdated"));
            setShowCustomerSelect(false);
        },
        onError: (e) => {
            toast.error(
                e.response?.data?.message || t("orders.toast.customerUpdateFailed"),
            );
        },
    });

    const updateOrderStatusMutation = useMutation({
        mutationFn: async ({ orderId, status }) => {
            const res = await api.put(`/orders/${orderId}`, { status });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["order", id] });
            toast.success(t("orders.toast.statusUpdated"));
        },
        onError: (e) => {
            toast.error(
                e.response?.data?.message || t("orders.toast.statusUpdateFailed"),
            );
        },
    });

    const fetchCustomers = (params) =>
        api.get("/customers?" + params).then((r) => r.data);

    const fetchProducts = (params) =>
        api.get("/products?" + params).then((r) => r.data);

    const updateItemRow = (index, field, value) => {
        setEditItems((prev) => {
            const next = [...prev];
            if (!next[index]) return prev;
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const setItemProduct = (index, productId, product) => {
        setEditItems((prev) => {
            const next = [...prev];
            if (!next[index]) return prev;
            const price = product?.price != null ? String(product.price) : "";
            next[index] = {
                ...next[index],
                product_id: productId != null ? String(productId) : "",
                product,
                price,
            };
            return next;
        });
    };

    const addItemRow = () => {
        setEditItems((prev) => [
            ...prev,
            { product_id: "", product: null, quantity: "", price: "" },
        ]);
    };

    const removeItemRow = (index) => {
        setEditItems((prev) => prev.filter((_, i) => i !== index));
    };

    const saveItemsMutation = useMutation({
        mutationFn: async () => {
            const items = editItems
                .filter((row) => row.product_id && row.quantity && row.price)
                .map((row) => ({
                    product_id: Number(row.product_id),
                    quantity: Number(row.quantity),
                    price: Number(row.price),
                }));
            const payload = { items };
            const tax = parseFloat(editTaxRate);
            if (!Number.isNaN(tax)) payload.tax_rate = tax;
            const shipping = includeShipping
                ? parseFloat(editShippingAmount) || 0
                : 0;
            payload.shipping_amount = shipping;
            const res = await api.put(`/orders/${id}`, payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["order", id] });
            toast.success(t("orders.toast.itemsUpdated"));
        },
        onError: (e) => {
            toast.error(
                e.response?.data?.message || t("orders.toast.itemsUpdateFailed"),
            );
        },
    });

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file || !order?.id) return;
        uploadDocMutation.mutate({
            orderId: order.id,
            file,
            name: file.name,
            type: docType,
        });
    };

    const handleCustomerCreated = (newCustomer) => {
        if (newCustomer?.id && order?.id) {
            updateOrderCustomerMutation.mutate({
                orderId: order.id,
                customerId: newCustomer.id,
            });
        }
        setCustomerModalOpen(false);
    };
    const downloadBarcode = (svgContent, fileName) => {
        if (!svgContent) return;
        const blob = new Blob([svgContent], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (orderError) {
        return (
            <div className="p-4 bg-red-50 text-red-800 rounded">
                {t("orders.errors.loadOrderFailed")}: {orderError.message}
            </div>
        );
    }

    const customer = order?.customer;
    const employees = employeesData?.data ?? employeesData ?? [];

    return (
        <div>
            <PageHeader
                title={t("orders.view.title", {
                    order: order?.order_number || id,
                })}
                actions={
                    !isEmployee && order ? (
                        <button
                            type="button"
                            onClick={handleGenerateInvoice}
                            disabled={!order.id || isGeneratingInvoice}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <FilePlus className="w-4 h-4" />
                            {isGeneratingInvoice
                                ? t("orders.invoice.generating")
                                : t("orders.invoice.generate")}
                        </button>
                    ) : null
                }
            />

            {loadingOrder ? (
                <div className="text-gray-500">{t("common.loading")}</div>
            ) : (
                <div className="space-y-6">
                    {/* Order info */}
                    <div className="bg-white shadow-md rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-slate-600" />
                            {t("orders.view.orderDetails")}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                                    <Hash className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    {t("orders.table.orderNumber")}
                                </div>
                                <div className="text-gray-900 font-medium">
                                    {order?.order_number ?? t("common.dash")}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                                    <ClipboardList className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                    {t("orders.table.status")}
                                </div>
                                <div className="mt-1 max-w-[200px]">
                                    {isEmployee ? (
                                        <span className="text-gray-900">
                                            {t(`orders.status.${order?.status}`, {
                                                defaultValue:
                                                    order?.status ?? t("common.dash"),
                                            })}
                                        </span>
                                    ) : (
                                        <SearchableSelect
                                            value={order?.status ?? ""}
                                            onChange={(newStatus) => {
                                                if (newStatus && order?.id) {
                                                    updateOrderStatusMutation.mutate(
                                                        {
                                                            orderId: order.id,
                                                            status: newStatus,
                                                        },
                                                    );
                                                }
                                            }}
                                            options={ORDER_STATUS_OPTIONS.map((o) => ({
                                                value: o.value,
                                                label: t(o.labelKey),
                                            }))}
                                            placeholder={t("orders.table.status")}
                                            cacheKey="order-view-status"
                                            disabled={
                                                updateOrderStatusMutation.isPending
                                            }
                                            className="min-h-[38px] text-sm"
                                        />
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                                    <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    {t("orders.table.date")}
                                </div>
                                <div className="text-gray-900">
                                    {order?.created_at
                                        ? formatDate(order.created_at)
                                        : t("common.dash")}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                                    <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    {t("orders.table.total")}
                                </div>
                                <div className="text-gray-900 font-semibold">
                                    {formatCurrency(order?.total_amount)}
                                </div>
                            </div>
                        </div>
                        {order?.notes && (
                            <div className="mt-4 pt-4 border-t">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                                    <StickyNote className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    {t("orders.form.notes")}
                                </div>
                                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                                    {order.notes}
                                </p>
                            </div>
                        )}
                        {order?.barcode_svg && (
                            <div className="mt-4 pt-4 border-t text-center">
                                <div className="text-xs font-medium text-gray-500 mb-2">
                                    {t("orders.barcode.orderNumberLabel")}
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        downloadBarcode(
                                            order.barcode_svg,
                                            `barcode-order-${order.order_number || order.id}.svg`,
                                        )
                                    }
                                    className="border rounded-md p-3 inline-block bg-white hover:bg-gray-50"
                                    title={t("barcode.downloadHint")}
                                >
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: order.barcode_svg,
                                        }}
                                    />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Customer */}
                    <div className="bg-white shadow-md rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                            {t("orders.view.customer.title")}
                        </h2>
                        {isEmployee ? (
                            !customer ? (
                                <p className="text-sm text-gray-500">
                                    {t("orders.view.customer.none")}
                                </p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                                <User className="w-4 h-4 text-blue-500 shrink-0" />
                                                {t("orders.view.customer.contact")}
                                            </div>
                                            <div className="text-sm text-gray-900">
                                                {customer.company_name ||
                                                    customer.name}
                                            </div>
                                            {customer.contact_person && (
                                                <div className="text-xs text-gray-600 mt-1">
                                                    {t("orders.view.customer.contactPerson")}:{" "}
                                                    {customer.contact_person}
                                                </div>
                                            )}
                                            {customer.email && (
                                                <div className="text-xs text-gray-600">
                                                    {customer.email}
                                                </div>
                                            )}
                                            {customer.phone && (
                                                <div className="text-xs text-gray-600">
                                                    {t("orders.view.customer.phone")}: {customer.phone}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                                                    <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                                                    {t("orders.view.customer.billing")}
                                                </div>
                                                <div className="text-sm text-gray-900 whitespace-pre-line">
                                                    {customer.billing_address ||
                                                        t("common.dash")}
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {[
                                                        customer.billing_postcode,
                                                        customer.billing_city,
                                                        customer.billing_country,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(", ") || ""}
                                                </div>
                                                {customer.billing_phone && (
                                                    <div className="text-xs text-gray-600">
                                                        {t("orders.view.customer.phone")}:{" "}
                                                        {customer.billing_phone}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                                                    <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                                                    {t("orders.view.customer.shipping")}
                                                </div>
                                                <div className="text-sm text-gray-900 whitespace-pre-line">
                                                    {customer.shipping_address ||
                                                        t("common.dash")}
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {[
                                                        customer.shipping_postcode,
                                                        customer.shipping_city,
                                                        customer.shipping_country,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(", ") || ""}
                                                </div>
                                                {customer.shipping_phone && (
                                                    <div className="text-xs text-gray-600">
                                                        {t("orders.view.customer.phone")}:{" "}
                                                        {
                                                            customer.shipping_phone
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )
                        ) : !customer || showCustomerSelect ? (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                    {!customer
                                        ? t("orders.view.customer.associateOrCreate")
                                        : t("orders.view.customer.chooseOtherOrCreate")}
                                </p>
                                <div className="flex flex-wrap items-end gap-3">
                                    <div className="min-w-[220px] flex-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            {t("orders.view.customer.selectExisting")}
                                        </label>
                                        <SearchableSelect
                                            value={
                                                order?.customer_id
                                                    ? String(order.customer_id)
                                                    : ""
                                            }
                                            onChange={(customerId) => {
                                                updateOrderCustomerMutation.mutate(
                                                    {
                                                        orderId: order?.id,
                                                        customerId:
                                                            customerId || null,
                                                    },
                                                );
                                            }}
                                            fetchOptions={fetchCustomers}
                                            displayValue={(opt) =>
                                                opt?.company_name ||
                                                opt?.name ||
                                                opt?.email
                                            }
                                            placeholder={t("orders.view.customer.searchPlaceholder")}
                                            cacheKey="order-view-customers"
                                        />
                                    </div>
                                    <span className="text-gray-400 text-sm">
                                        {t("orders.view.customer.or")}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCustomerModalOpen(true)
                                        }
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        <Plus className="w-4 h-4" />
                                        {t("orders.view.customer.createNew")}
                                    </button>
                                    {customer && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowCustomerSelect(false)
                                            }
                                            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                                        >
                                            {t("common.cancel")}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div>
                                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                            <User className="w-4 h-4 text-blue-500 shrink-0" />
                                            Date contact
                                        </div>
                                        <div className="text-sm text-gray-900">
                                            {customer.company_name ||
                                                customer.name}
                                        </div>
                                        {customer.contact_person && (
                                            <div className="text-xs text-gray-600 mt-1">
                                                Contact:{" "}
                                                {customer.contact_person}
                                            </div>
                                        )}
                                        {customer.email && (
                                            <div className="text-xs text-gray-600">
                                                {customer.email}
                                            </div>
                                        )}
                                        {customer.phone && (
                                            <div className="text-xs text-gray-600">
                                                Tel: {customer.phone}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                                                <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                                                {t("orders.view.customer.billing")}
                                            </div>
                                            <div className="text-sm text-gray-900 whitespace-pre-line">
                                                {customer.billing_address ||
                                                    t("common.dash")}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                {[
                                                    customer.billing_postcode,
                                                    customer.billing_city,
                                                    customer.billing_country,
                                                ]
                                                    .filter(Boolean)
                                                    .join(", ") || ""}
                                            </div>
                                            {customer.billing_phone && (
                                                <div className="text-xs text-gray-600">
                                                    {t("orders.view.customer.phone")}:{" "}
                                                    {customer.billing_phone}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                                                <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                                                {t("orders.view.customer.shipping")}
                                            </div>
                                            <div className="text-sm text-gray-900 whitespace-pre-line">
                                                {customer.shipping_address ||
                                                    t("common.dash")}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                {[
                                                    customer.shipping_postcode,
                                                    customer.shipping_city,
                                                    customer.shipping_country,
                                                ]
                                                    .filter(Boolean)
                                                    .join(", ") || ""}
                                            </div>
                                            {customer.shipping_phone && (
                                                <div className="text-xs text-gray-600">
                                                    {t("orders.view.customer.phone")}:{" "}
                                                    {customer.shipping_phone}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowCustomerSelect(true)
                                        }
                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
                                    >
                                        <Pencil className="w-3.5 h-3.5 text-amber-600" />
                                        {t("orders.view.customer.change")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            updateOrderCustomerMutation.mutate({
                                                orderId: order?.id,
                                                customerId: null,
                                            })
                                        }
                                        disabled={
                                            updateOrderCustomerMutation.isPending
                                        }
                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 rounded-md text-red-700"
                                    >
                                        <UserMinus className="w-3.5 h-3.5 text-red-600" />
                                        {t("orders.view.customer.remove")}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Order items */}
                    <div className="bg-white shadow-md rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-500" />
                            {t("orders.view.items.title")}
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-gray-600">
                                        <th className="py-2 pr-4">
                                            {t("orders.view.items.product")}
                                        </th>
                                        <th className="py-2 pr-4 text-right w-28">
                                            {t("orders.view.items.quantity")}
                                        </th>
                                        <th className="py-2 pr-4 text-right w-32">
                                            {t("orders.view.items.price")}
                                        </th>
                                        <th className="py-2 pr-4 text-right w-28">
                                            {t("orders.view.items.lineTotal")}
                                        </th>
                                        <th className="py-2 pr-4 text-right w-24">
                                            {t("orders.view.items.vat")}
                                        </th>
                                        <th className="py-2 pr-4 text-right w-28">
                                            {t("orders.view.items.totalWithVat")}
                                        </th>
                                        {!isEmployee && (
                                            <th className="py-2 w-10" />
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {isEmployee
                                        ? (order?.items ?? []).map((item) => {
                                              const q =
                                                  Number(item.quantity) || 0;
                                              const p = Number(item.price) || 0;
                                              const lineTotal = q * p;
                                              const taxPct =
                                                  Number(order?.tax_rate) || 0;
                                              const lineVat =
                                                  (lineTotal * taxPct) / 100;
                                              const lineTotalWithVat =
                                                  lineTotal + lineVat;
                                              return (
                                                  <tr
                                                      key={item.id}
                                                      className="border-b border-gray-100"
                                                  >
                                                      <td className="py-2 pr-4">
                                                          {item.product?.name ??
                                                              item.product
                                                                  ?.sku ??
                                                              item.product_id}
                                                      </td>
                                                      <td className="py-2 pr-4 text-right">
                                                          {item.quantity}
                                                      </td>
                                                      <td className="py-2 pr-4 text-right">
                                                          {formatCurrency(p)}
                                                      </td>
                                                      <td className="py-2 pr-4 text-right font-medium">
                                                          {formatCurrency(
                                                              lineTotal,
                                                          )}
                                                      </td>
                                                      <td className="py-2 pr-4 text-right text-gray-600">
                                                          {taxPct > 0
                                                              ? formatCurrency(
                                                                    lineVat,
                                                                )
                                                              : "-"}
                                                      </td>
                                                      <td className="py-2 pr-4 text-right font-medium">
                                                          {taxPct > 0
                                                              ? formatCurrency(
                                                                    lineTotalWithVat,
                                                                )
                                                              : formatCurrency(
                                                                    lineTotal,
                                                                )}
                                                      </td>
                                                  </tr>
                                              );
                                          })
                                        : editItems.map((row, index) => {
                                              const q =
                                                  parseFloat(row.quantity) || 0;
                                              const p =
                                                  parseFloat(row.price) || 0;
                                              const lineTotal = q * p;
                                              const taxPct =
                                                  parseFloat(editTaxRate) || 0;
                                              const lineVat =
                                                  (lineTotal * taxPct) / 100;
                                              const lineTotalWithVat =
                                                  lineTotal + lineVat;
                                              return (
                                                  <tr
                                                      key={index}
                                                      className="border-b border-gray-100"
                                                  >
                                                      <td className="py-2 pr-4">
                                                          <SearchableSelect
                                                              value={
                                                                  row.product_id
                                                              }
                                                              onChange={(
                                                                  val,
                                                                  opt,
                                                              ) =>
                                                                  setItemProduct(
                                                                      index,
                                                                      val,
                                                                      opt,
                                                                  )
                                                              }
                                                              fetchOptions={
                                                                  fetchProducts
                                                              }
                                                              displayValue={(
                                                                  p,
                                                              ) =>
                                                                  p?.name ??
                                                                  p?.sku ??
                                                                  ""
                                                              }
                                                              searchParam="search"
                                                              placeholder={t(
                                                                  "orders.view.items.selectProduct",
                                                              )}
                                                              cacheKey="order-view-products"
                                                              className="min-w-[180px] text-sm"
                                                          />
                                                      </td>
                                                      <td className="py-2 pr-4 text-right">
                                                          <input
                                                              type="number"
                                                              min={0}
                                                              step={1}
                                                              value={
                                                                  row.quantity
                                                              }
                                                              onChange={(e) =>
                                                                  updateItemRow(
                                                                      index,
                                                                      "quantity",
                                                                      e.target
                                                                          .value,
                                                                  )
                                                              }
                                                              className="w-full text-right px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                          />
                                                      </td>
                                                      <td className="py-2 pr-4 text-right">
                                                          <span className="text-gray-700">
                                                              {row.price
                                                                  ? formatCurrency(
                                                                        parseFloat(
                                                                            row.price,
                                                                        ),
                                                                    )
                                                                  : "-"}
                                                          </span>
                                                      </td>
                                                      <td className="py-2 pr-4 text-right font-medium">
                                                          {formatCurrency(
                                                              lineTotal,
                                                          )}
                                                      </td>
                                                      <td className="py-2 pr-4 text-right text-gray-600">
                                                          {taxPct > 0
                                                              ? formatCurrency(
                                                                    lineVat,
                                                                )
                                                              : "-"}
                                                      </td>
                                                      <td className="py-2 pr-4 text-right font-medium">
                                                          {taxPct > 0
                                                              ? formatCurrency(
                                                                    lineTotalWithVat,
                                                                )
                                                              : formatCurrency(
                                                                    lineTotal,
                                                                )}
                                                      </td>
                                                      <td className="py-2">
                                                          <button
                                                              type="button"
                                                              onClick={() =>
                                                                  removeItemRow(
                                                                      index,
                                                                  )
                                                              }
                                                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                                                              title={t(
                                                                  "orders.view.items.removeLine",
                                                              )}
                                                          >
                                                              <Trash2 className="w-4 h-4" />
                                                          </button>
                                                      </td>
                                                  </tr>
                                              );
                                          })}
                                </tbody>
                            </table>
                        </div>
                        {!isEmployee && (
                            <div className="mt-3 flex justify-end">
                                <button
                                    type="button"
                                    onClick={addItemRow}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md"
                                >
                                    <Plus className="w-4 h-4" />
                                    {t("orders.view.items.addProduct")}
                                </button>
                            </div>
                        )}
                        {isEmployee
                            ? (() => {
                                  const items = order?.items ?? [];
                                  const subtotal = items.reduce(
                                      (sum, item) =>
                                          sum +
                                          (Number(item.quantity) || 0) *
                                              (Number(item.price) || 0),
                                      0,
                                  );
                                  const taxPct = Number(order?.tax_rate) || 0;
                                  const taxAmount = (subtotal * taxPct) / 100;
                                  const shippingAmount =
                                      Number(order?.shipping_amount) || 0;
                                  const total =
                                      subtotal + taxAmount + shippingAmount;
                                  return (
                                      <div className="mt-6 pt-4 border-t border-gray-200 space-y-2 max-w-xs ml-auto text-sm">
                                          <div className="flex justify-between text-gray-700">
                                              <span>
                                                  {t("orders.view.summary.subtotal")}
                                              </span>
                                              <span className="font-medium">
                                                  {formatCurrency(subtotal)}
                                              </span>
                                          </div>
                                          <div className="flex justify-between text-gray-700">
                                              <span>
                                                  {t("orders.view.summary.vatRate")}
                                              </span>
                                              <span className="font-medium">
                                                  {taxPct > 0
                                                      ? `${taxPct}% · ${formatCurrency(taxAmount)}`
                                                      : "-"}
                                              </span>
                                          </div>
                                          {shippingAmount > 0 && (
                                              <div className="flex justify-between text-gray-700">
                                                  <span>
                                                      {t("orders.view.summary.shipping")}
                                                  </span>
                                                  <span className="font-medium">
                                                      {formatCurrency(
                                                          shippingAmount,
                                                      )}
                                                  </span>
                                              </div>
                                          )}
                                          <div className="flex justify-between text-gray-900 font-semibold pt-2">
                                              <span>
                                                  {t("orders.view.summary.total")}
                                              </span>
                                              <span>
                                                  {formatCurrency(
                                                      order?.total_amount ??
                                                          total,
                                                  )}
                                              </span>
                                          </div>
                                      </div>
                                  );
                              })()
                            : (() => {
                                  const subtotal = editItems.reduce(
                                      (sum, row) =>
                                          sum +
                                          (parseFloat(row.quantity) || 0) *
                                              (parseFloat(row.price) || 0),
                                      0,
                                  );
                                  const taxPct = parseFloat(editTaxRate) || 0;
                                  const taxAmount = (subtotal * taxPct) / 100;
                                  const shippingAmount = includeShipping
                                      ? parseFloat(editShippingAmount) || 0
                                      : 0;
                                  const total =
                                      subtotal + taxAmount + shippingAmount;
                                  return (
                                      <div className="mt-6 pt-4 border-t border-gray-200 space-y-2 max-w-xs ml-auto text-sm">
                                          <div className="flex justify-between text-gray-700">
                                              <span>
                                                  {t("orders.view.summary.subtotal")}
                                              </span>
                                              <span className="font-medium">
                                                  {formatCurrency(subtotal)}
                                              </span>
                                          </div>
                                          <div className="flex justify-between items-center gap-4">
                                              <span className="text-gray-700">
                                                  {t("orders.view.summary.vatRate")}
                                              </span>
                                              <input
                                                  type="number"
                                                  min={0}
                                                  max={100}
                                                  step={0.01}
                                                  value={editTaxRate}
                                                  onChange={(e) =>
                                                      setEditTaxRate(
                                                          e.target.value,
                                                      )
                                                  }
                                                  className="w-20 text-right px-2 py-1 border border-gray-300 rounded"
                                              />
                                              <span className="font-medium w-24 text-right">
                                                  {formatCurrency(taxAmount)}
                                              </span>
                                          </div>
                                          <div className="flex justify-between items-center gap-4">
                                              <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                                                  <input
                                                      type="checkbox"
                                                      checked={includeShipping}
                                                      onChange={(e) => {
                                                          setIncludeShipping(
                                                              e.target.checked,
                                                          );
                                                          if (!e.target.checked)
                                                              setEditShippingAmount(
                                                                  "",
                                                              );
                                                      }}
                                                      className="rounded border-gray-300"
                                                  />
                                                  <Truck className="w-4 h-4 text-amber-600" />
                                                  {t("orders.view.summary.shipping")}
                                              </label>
                                              {includeShipping ? (
                                                  <>
                                                      <input
                                                          type="number"
                                                          min={0}
                                                          step={0.01}
                                                          value={
                                                              editShippingAmount
                                                          }
                                                          onChange={(e) =>
                                                              setEditShippingAmount(
                                                                  e.target
                                                                      .value,
                                                              )
                                                          }
                                                          className="w-24 text-right px-2 py-1 border border-gray-300 rounded"
                                                          placeholder="0.00"
                                                      />
                                                      <span className="font-medium w-24 text-right">
                                                          {formatCurrency(
                                                              shippingAmount,
                                                          )}
                                                      </span>
                                                  </>
                                              ) : (
                                                  <span className="font-medium w-24 text-right text-gray-400">
                                                      -
                                                  </span>
                                              )}
                                          </div>
                                          <div className="flex justify-between text-gray-900 font-semibold pt-2">
                                              <span>
                                                  {t("orders.view.summary.total")}
                                              </span>
                                              <span>
                                                  {formatCurrency(total)}
                                              </span>
                                          </div>
                                          <div className="pt-3">
                                              <button
                                                  type="button"
                                                  onClick={() =>
                                                      saveItemsMutation.mutate()
                                                  }
                                                  disabled={
                                                      saveItemsMutation.isPending
                                                  }
                                                  className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                              >
                                                  {saveItemsMutation.isPending
                                                      ? t("common.saving")
                                                      : t("orders.view.summary.saveItems")}
                                              </button>
                                          </div>
                                      </div>
                                  );
                              })()}
                    </div>

                    {!isEmployee && (
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <ListTodo className="w-5 h-5 text-violet-500" />
                                {t("orders.view.tasks.title")}
                            </h2>
                            <p className="text-sm text-gray-600 mb-4">
                                {t("orders.view.tasks.description")}
                            </p>
                            <ul className="space-y-3 mb-4">
                                {(order?.tasks ?? []).map((task) => {
                                    const statusColor =
                                        TASK_STATUS_COLORS[task.status] ||
                                        "gray";
                                    const colorClasses = {
                                        yellow: "bg-amber-100 text-amber-800",
                                        blue: "bg-blue-100 text-blue-800",
                                        green: "bg-green-100 text-green-800",
                                        red: "bg-red-100 text-red-800",
                                        gray: "bg-gray-100 text-gray-800",
                                    };
                                    return (
                                        <li
                                            key={task.id}
                                            className="flex flex-wrap items-center justify-between gap-2 py-3 px-4 bg-gray-50 rounded-lg border border-gray-100"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-gray-900">
                                                        {task.title}
                                                    </span>
                                                    <span
                                                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClasses[statusColor]}`}
                                                    >
                                                        {TASK_STATUS_LABELS[
                                                            task.status
                                                        ] ?? task.status}
                                                    </span>
                                                    {task.order_id && (
                                                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                                                            {t("orders.view.tasks.orderTag")}
                                                        </span>
                                                    )}
                                                </div>
                                                {task.description && (
                                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                        {task.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                                    {task.due_date && (
                                                        <span>
                                                            {t("orders.view.tasks.due")}:{" "}
                                                            {formatDate(
                                                                task.due_date,
                                                            )}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                        {t("orders.view.tasks.assigned")}:{" "}
                                                        {(task.assignedTo
                                                            ?.name ??
                                                            (typeof task.assigned_to ===
                                                                "object" &&
                                                                task.assigned_to
                                                                    ?.name)) ||
                                                            "—"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Link
                                                    to={`/tasks/${task.id}/edit`}
                                                    className="inline-flex items-center gap-1.5 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                                                    title={t("orders.view.tasks.editTask")}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                    {t("orders.actions.edit")}
                                                </Link>
                                                <select
                                                    value={task.status}
                                                    onChange={(e) =>
                                                        updateTaskStatusMutation.mutate(
                                                            {
                                                                taskId: task.id,
                                                                status: e.target
                                                                    .value,
                                                            },
                                                        )
                                                    }
                                                    disabled={
                                                        updateTaskStatusMutation.isPending
                                                    }
                                                    className="text-sm border border-gray-300 rounded px-2 py-1"
                                                >
                                                    <option value="pending">
                                                        {
                                                            TASK_STATUS_LABELS.pending
                                                        }
                                                    </option>
                                                    <option value="in_progress">
                                                        {
                                                            TASK_STATUS_LABELS.in_progress
                                                        }
                                                    </option>
                                                    <option value="completed">
                                                        {
                                                            TASK_STATUS_LABELS.completed
                                                        }
                                                    </option>
                                                    <option value="cancelled">
                                                        {
                                                            TASK_STATUS_LABELS.cancelled
                                                        }
                                                    </option>
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (
                                                            window.confirm(
                                                                t("orders.view.tasks.confirmDeleteTask"),
                                                            )
                                                        ) {
                                                            deleteTaskMutation.mutate(
                                                                task.id,
                                                            );
                                                        }
                                                    }}
                                                    disabled={
                                                        deleteTaskMutation.isPending
                                                    }
                                                    className="p-1.5 text-gray-500 hover:text-red-600 rounded"
                                                    title={t("orders.view.tasks.deleteTask")}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                            {(!order?.tasks || order.tasks.length === 0) && (
                                <p className="text-sm text-gray-500 mb-4">
                                    {t("orders.view.tasks.empty")}
                                </p>
                            )}
                            {!showAddTaskForm ? (
                                <button
                                    type="button"
                                    onClick={() => setShowAddTaskForm(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-md hover:bg-violet-700"
                                >
                                    <Plus className="w-4 h-4" />
                                    {t("orders.view.tasks.add")}
                                </button>
                            ) : (
                                <div className="border-t border-gray-200 pt-4 space-y-3">
                                    <h3 className="text-sm font-medium text-gray-700">
                                        {t("orders.view.tasks.newTaskTitle")}
                                    </h3>
                                    <input
                                        type="text"
                                        value={newTaskTitle}
                                        onChange={(e) =>
                                            setNewTaskTitle(e.target.value)
                                        }
                                        placeholder={t("orders.view.tasks.titlePlaceholder")}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                    <textarea
                                        value={newTaskDescription}
                                        onChange={(e) =>
                                            setNewTaskDescription(
                                                e.target.value,
                                            )
                                        }
                                        placeholder={t("orders.view.tasks.descriptionPlaceholder")}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            {t("orders.view.tasks.assignedToLabel")}
                                        </label>
                                        <SearchableSelect
                                            value={newTaskAssignedToUserId}
                                            onChange={(val) =>
                                                setNewTaskAssignedToUserId(
                                                    val || "",
                                                )
                                            }
                                            options={employees
                                                .filter(
                                                    (emp) =>
                                                        emp.user_id ||
                                                        emp.user?.id,
                                                )
                                                .map((emp) => ({
                                                    value: String(
                                                        emp.user_id ||
                                                            emp.user?.id,
                                                    ),
                                                    label:
                                                        emp.user?.name ||
                                                        emp.employee_code ||
                                                        `Angajat #${emp.id}`,
                                                }))}
                                            placeholder={t("orders.view.tasks.selectEmployee")}
                                            className="text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            {t("orders.view.tasks.dueDateLabel")}
                                        </label>
                                        <input
                                            type="date"
                                            value={newTaskDueDate}
                                            onChange={(e) =>
                                                setNewTaskDueDate(
                                                    e.target.value,
                                                )
                                            }
                                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!newTaskAssignedToUserId) {
                                                    toast.error(
                                                        t("orders.view.tasks.selectEmployeeError"),
                                                    );
                                                    return;
                                                }
                                                createTaskMutation.mutate({
                                                    order_id: order?.id,
                                                    assigned_to: Number(
                                                        newTaskAssignedToUserId,
                                                    ),
                                                    title: newTaskTitle.trim(),
                                                    description:
                                                        newTaskDescription.trim()
                                                            ? newTaskDescription.trim()
                                                            : null,
                                                    due_date: newTaskDueDate
                                                        ? newTaskDueDate
                                                        : null,
                                                });
                                            }}
                                            disabled={
                                                !newTaskTitle.trim() ||
                                                !newTaskAssignedToUserId ||
                                                createTaskMutation.isPending
                                            }
                                            className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-md hover:bg-violet-700 disabled:opacity-50"
                                        >
                                            {createTaskMutation.isPending
                                                ? t("orders.view.tasks.adding")
                                                : t("orders.view.tasks.addConfirm")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddTaskForm(false);
                                                setNewTaskTitle("");
                                                setNewTaskDescription("");
                                                setNewTaskDueDate("");
                                                setNewTaskAssignedToUserId("");
                                            }}
                                            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300"
                                        >
                                            {t("common.cancel")}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="bg-white shadow-md rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            {t("orders.view.documents.title")}
                        </h2>
                        {!isEmployee && (
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <select
                                    value={docType}
                                    onChange={(e) => setDocType(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                >
                                    {DOC_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                            {t(`orders.documents.type.${type}`)}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,image/*"
                                    onChange={handleFileSelect}
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    disabled={uploadDocMutation.isPending}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm disabled:opacity-50"
                                >
                                    <Upload className="w-4 h-4" />
                                    {t("orders.view.documents.upload")}
                                </button>
                            </div>
                        )}
                        <ul className="space-y-2">
                            {(order?.documents ?? []).map((doc) => (
                                <li
                                    key={doc.id}
                                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                                >
                                    <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                                    >
                                        <Eye className="w-4 h-4" />
                                        {doc.name}
                                        <span className="text-xs text-gray-500">
                                            (
                                            {t(`orders.documents.type.${doc.type}`, {
                                                defaultValue: doc.type,
                                            })}
                                            )
                                        </span>
                                    </a>
                                    {!isEmployee && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                deleteDocMutation.mutate({
                                                    orderId: order.id,
                                                    documentId: doc.id,
                                                })
                                            }
                                            className="p-1.5 text-gray-500 hover:text-red-600"
                                            title={t("orders.actions.delete")}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                        {(!order?.documents ||
                            order.documents.length === 0) && (
                            <p className="text-sm text-gray-500">
                                {t("orders.view.documents.empty")}
                            </p>
                        )}
                    </div>
                </div>
            )}

            <CustomerFormModal
                isOpen={customerModalOpen}
                onClose={() => setCustomerModalOpen(false)}
                onCreated={handleCustomerCreated}
            />
        </div>
    );
}

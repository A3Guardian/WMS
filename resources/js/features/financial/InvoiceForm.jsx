import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm } from '../../hooks/useForm';
import api from '../../utils/api';
import { usePermissions } from '../../hooks/usePermissions';
import SearchableSelect from '../../components/SearchableSelect';

export default function InvoiceForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const isEdit = !!id;

    const { data: suppliersData } = useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const response = await api.get('/suppliers?per_page=100');
            return response.data;
        },
    });

    const { data: invoiceData } = useQuery({
        queryKey: ['invoice', id],
        queryFn: async () => {
            const response = await api.get(`/invoices/${id}`);
            return response.data;
        },
        enabled: isEdit,
    });

    const initialValues = {
        supplier_id: '',
        type: 'income',
        status: 'draft',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        paid_date: '',
        subtotal: '',
        tax_amount: '',
        discount_amount: '',
        total_amount: '',
        category: '',
        description: '',
        notes: '',
    };

    const { values, errors, isSubmitting, handleChange, handleSubmit, setValues } = useForm(
        initialValues,
        async (formValues) => {
            try {
                const submitData = {
                    supplier_id: formValues.supplier_id || null,
                    type: formValues.type,
                    status: formValues.status,
                    issue_date: formValues.issue_date,
                    due_date: formValues.due_date || null,
                    paid_date: formValues.paid_date || null,
                    subtotal: parseFloat(formValues.subtotal || 0),
                    tax_amount: parseFloat(formValues.tax_amount || 0),
                    discount_amount: parseFloat(formValues.discount_amount || 0),
                    total_amount: parseFloat(formValues.total_amount || 0),
                    category: formValues.category || null,
                    description: formValues.description || null,
                    notes: formValues.notes || null,
                };

                if (isEdit) {
                    await api.put(`/invoices/${id}`, submitData);
                    toast.success('Invoice updated successfully');
                } else {
                    await api.post('/invoices', submitData);
                    toast.success('Invoice created successfully');
                }

                queryClient.invalidateQueries({ queryKey: ['invoices'] });
                navigate('/invoices');
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'An error occurred';
                toast.error(isEdit ? 'Failed to update invoice' : 'Failed to create invoice', {
                    description: errorMessage,
                });
                throw error;
            }
        }
    );

    useEffect(() => {
        if (invoiceData) {
            setValues({
                supplier_id: invoiceData.supplier_id || '',
                type: invoiceData.type || 'income',
                status: invoiceData.status || 'draft',
                issue_date: invoiceData.issue_date ? invoiceData.issue_date.split('T')[0] : new Date().toISOString().split('T')[0],
                due_date: invoiceData.due_date ? invoiceData.due_date.split('T')[0] : '',
                paid_date: invoiceData.paid_date ? invoiceData.paid_date.split('T')[0] : '',
                subtotal: invoiceData.subtotal || '',
                tax_amount: invoiceData.tax_amount || '',
                discount_amount: invoiceData.discount_amount || '',
                total_amount: invoiceData.total_amount || '',
                category: invoiceData.category || '',
                description: invoiceData.description || '',
                notes: invoiceData.notes || '',
            });
        }
    }, [invoiceData, setValues]);

    const calculatedTotal = useMemo(() => {
        const subtotal = parseFloat(values.subtotal || 0);
        const tax = parseFloat(values.tax_amount || 0);
        const discount = parseFloat(values.discount_amount || 0);
        return subtotal + tax - discount;
    }, [values.subtotal, values.tax_amount, values.discount_amount]);

    useEffect(() => {
        if (calculatedTotal > 0 && !values.total_amount) {
            setValues({ ...values, total_amount: calculatedTotal.toFixed(2) });
        }
    }, [calculatedTotal]);

    const suppliers = suppliersData?.data || [];

    if (isEdit && !hasPermission('edit invoices')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to edit invoices.
            </div>
        );
    }

    if (!isEdit && !hasPermission('create invoices')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to create invoices.
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">
                {isEdit ? 'Edit Invoice' : 'Create Invoice'}
            </h1>

            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="invoice_number" className="block text-sm font-medium text-gray-700 mb-1">
                            Invoice Number
                        </label>
                        <input
                            type="text"
                            id="invoice_number"
                            name="invoice_number"
                            value={invoiceData?.invoice_number || 'Auto-generated'}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                        />
                        <p className="mt-1 text-xs text-gray-500">Auto-generated if not provided</p>
                    </div>

                    <div>
                        <label htmlFor="supplier_id" className="block text-sm font-medium text-gray-700 mb-1">
                            Supplier
                        </label>
                        <select
                            id="supplier_id"
                            name="supplier_id"
                            value={values.supplier_id}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="">Select Supplier (Optional)</option>
                            {suppliers.map((sup) => (
                                <option key={sup.id} value={sup.id}>
                                    {sup.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                            Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="type"
                            name="type"
                            value={values.type}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        >
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <select
                            id="status"
                            name="status"
                            value={values.status}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700 mb-1">
                            Issue Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            id="issue_date"
                            name="issue_date"
                            value={values.issue_date}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                            Due Date
                        </label>
                        <input
                            type="date"
                            id="due_date"
                            name="due_date"
                            value={values.due_date}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    <div>
                        <label htmlFor="paid_date" className="block text-sm font-medium text-gray-700 mb-1">
                            Paid Date
                        </label>
                        <input
                            type="date"
                            id="paid_date"
                            name="paid_date"
                            value={values.paid_date}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                        </label>
                        <input
                            type="text"
                            id="category"
                            name="category"
                            value={values.category}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="e.g., Office Supplies, Services"
                        />
                    </div>

                    <div>
                        <label htmlFor="subtotal" className="block text-sm font-medium text-gray-700 mb-1">
                            Subtotal <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            id="subtotal"
                            name="subtotal"
                            value={values.subtotal}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="tax_amount" className="block text-sm font-medium text-gray-700 mb-1">
                            Tax Amount
                        </label>
                        <input
                            type="number"
                            id="tax_amount"
                            name="tax_amount"
                            value={values.tax_amount}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    <div>
                        <label htmlFor="discount_amount" className="block text-sm font-medium text-gray-700 mb-1">
                            Discount Amount
                        </label>
                        <input
                            type="number"
                            id="discount_amount"
                            name="discount_amount"
                            value={values.discount_amount}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    <div>
                        <label htmlFor="total_amount" className="block text-sm font-medium text-gray-700 mb-1">
                            Total Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            id="total_amount"
                            name="total_amount"
                            value={values.total_amount}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Calculated: ${calculatedTotal.toFixed(2)}
                        </p>
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={values.description}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Invoice description"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                        </label>
                        <textarea
                            id="notes"
                            name="notes"
                            value={values.notes}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Additional notes"
                        />
                    </div>
                </div>

                {errors.form && (
                    <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
                        {errors.form}
                    </div>
                )}

                <div className="flex space-x-4 mt-6">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/invoices')}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}


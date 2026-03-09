import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm } from '../../hooks/useForm';
import api from '../../utils/api';
import { usePermissions } from '../../hooks/usePermissions';
import SearchableSelect from '../../components/SearchableSelect';

export default function SupplierPaymentForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const isEdit = !!id;

    const fetchSuppliers = (params) => api.get('/suppliers?' + params).then((r) => r.data);
    const fetchInvoices = (params) => api.get('/invoices?' + params).then((r) => r.data);

    const { data: paymentData } = useQuery({
        queryKey: ['payment', id],
        queryFn: async () => {
            const response = await api.get(`/payments/${id}`);
            return response.data;
        },
        enabled: isEdit,
    });

    const initialValues = {
        supplier_id: '',
        invoice_id: '',
        type: 'payment',
        category: 'supplier_payment',
        amount: '',
        payment_method: 'bank_transfer',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        notes: '',
        reference_number: '',
    };

    const { values, errors, isSubmitting, handleChange, handleSubmit, setValues } = useForm(
        initialValues,
        async (formValues) => {
            try {
                const submitData = {
                    supplier_id: formValues.supplier_id || null,
                    invoice_id: formValues.invoice_id || null,
                    type: formValues.type,
                    category: formValues.category,
                    amount: parseFloat(formValues.amount || 0),
                    payment_method: formValues.payment_method,
                    transaction_date: formValues.transaction_date,
                    description: formValues.description || null,
                    notes: formValues.notes || null,
                    reference_number: formValues.reference_number || null,
                };

                if (isEdit) {
                    await api.put(`/payments/${id}`, submitData);
                    toast.success('Payment updated successfully');
                } else {
                    await api.post('/payments', submitData);
                    toast.success('Payment created successfully');
                }

                queryClient.invalidateQueries({ queryKey: ['payments'] });
                navigate('/payments');
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'An error occurred';
                toast.error(isEdit ? 'Failed to update payment' : 'Failed to create payment', {
                    description: errorMessage,
                });
                throw error;
            }
        }
    );

    useEffect(() => {
        if (paymentData) {
            setValues({
                supplier_id: paymentData.supplier_id || '',
                invoice_id: paymentData.invoice_id || '',
                type: paymentData.type || 'payment',
                category: paymentData.category || 'supplier_payment',
                amount: paymentData.amount || '',
                payment_method: paymentData.payment_method || 'bank_transfer',
                transaction_date: paymentData.transaction_date ? paymentData.transaction_date.split('T')[0] : new Date().toISOString().split('T')[0],
                description: paymentData.description || '',
                notes: paymentData.notes || '',
                reference_number: paymentData.reference_number || '',
            });
        }
    }, [paymentData, setValues]);

    if (isEdit && !hasPermission('edit payments')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to edit payments.
            </div>
        );
    }

    if (!isEdit && !hasPermission('create payments')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to create payments.
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">
                {isEdit ? 'Edit Payment' : 'Create Payment'}
            </h1>

            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="transaction_number" className="block text-sm font-medium text-gray-700 mb-1">
                            Transaction Number
                        </label>
                        <input
                            type="text"
                            id="transaction_number"
                            name="transaction_number"
                            value={paymentData?.transaction_number || 'Auto-generated'}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                        />
                        <p className="mt-1 text-xs text-gray-500">Auto-generated if not provided</p>
                    </div>

                    <div>
                        <label htmlFor="supplier_id" className="block text-sm font-medium text-gray-700 mb-1">
                            Supplier
                        </label>
                        <SearchableSelect
                            value={values.supplier_id || ""}
                            onChange={(v) => handleChange({ target: { name: 'supplier_id', value: v || '' } })}
                            fetchOptions={fetchSuppliers}
                            displayValue={(sup) => sup?.name}
                            placeholder="Select Supplier (Optional)"
                            cacheKey="payment-suppliers"
                        />
                    </div>

                    <div>
                        <label htmlFor="invoice_id" className="block text-sm font-medium text-gray-700 mb-1">
                            Invoice
                        </label>
                        <SearchableSelect
                            value={values.invoice_id || ""}
                            onChange={(v) => handleChange({ target: { name: 'invoice_id', value: v || '' } })}
                            fetchOptions={fetchInvoices}
                            displayValue={(inv) => inv ? `${inv.invoice_number} - ${inv.supplier?.name || 'N/A'} (${inv.type})` : ''}
                            placeholder="Select Invoice (Optional)"
                            cacheKey="payment-invoices"
                        />
                    </div>

                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                            Type <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                            value={values.type}
                            onChange={(v) => handleChange({ target: { name: 'type', value: v } })}
                            options={[
                                { value: 'payment', label: 'Payment' },
                                { value: 'receipt', label: 'Receipt' },
                                { value: 'refund', label: 'Refund' },
                                { value: 'adjustment', label: 'Adjustment' },
                            ]}
                            placeholder="Select type"
                        />
                    </div>

                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                            value={values.category}
                            onChange={(v) => handleChange({ target: { name: 'category', value: v } })}
                            options={[
                                { value: 'supplier_payment', label: 'Supplier Payment' },
                                { value: 'customer_payment', label: 'Customer Payment' },
                                { value: 'salary', label: 'Salary' },
                                { value: 'expense', label: 'Expense' },
                                { value: 'income', label: 'Income' },
                                { value: 'other', label: 'Other' },
                            ]}
                            placeholder="Select category"
                        />
                    </div>

                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            id="amount"
                            name="amount"
                            value={values.amount}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Method <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                            value={values.payment_method}
                            onChange={(v) => handleChange({ target: { name: 'payment_method', value: v } })}
                            options={[
                                { value: 'cash', label: 'Cash' },
                                { value: 'bank_transfer', label: 'Bank Transfer' },
                                { value: 'check', label: 'Check' },
                                { value: 'credit_card', label: 'Credit Card' },
                                { value: 'debit_card', label: 'Debit Card' },
                                { value: 'other', label: 'Other' },
                            ]}
                            placeholder="Select method"
                        />
                    </div>

                    <div>
                        <label htmlFor="transaction_date" className="block text-sm font-medium text-gray-700 mb-1">
                            Transaction Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            id="transaction_date"
                            name="transaction_date"
                            value={values.transaction_date}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="reference_number" className="block text-sm font-medium text-gray-700 mb-1">
                            Reference Number
                        </label>
                        <input
                            type="text"
                            id="reference_number"
                            name="reference_number"
                            value={values.reference_number}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="e.g., Check #12345"
                        />
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
                            placeholder="Transaction description"
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
                        {isSubmitting ? 'Saving...' : isEdit ? 'Update Payment' : 'Create Payment'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/payments')}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}


export function resolveLinePrice(item) {
    const price = Number(item?.price);
    if (!Number.isNaN(price) && price > 0) {
        return price;
    }

    const productPrice = Number(item?.product?.price);
    if (!Number.isNaN(productPrice) && productPrice > 0) {
        return productPrice;
    }

    return 0;
}

export function calcItemsSubtotal(items) {
    return (items ?? []).reduce((sum, item) => {
        const q = Number(item?.quantity) || 0;
        return sum + q * resolveLinePrice(item);
    }, 0);
}

export function resolveOrderTotals({
    order,
    editItems,
    isEmployee,
    editTaxRate,
    editShippingAmount,
    includeShipping,
}) {
    const orderSubtotal =
        Number(order?.subtotal) > 0
            ? Number(order.subtotal)
            : calcItemsSubtotal(order?.items);

    const editSubtotal = calcItemsSubtotal(editItems);
    const subtotal = isEmployee
        ? orderSubtotal
        : editSubtotal > 0
          ? editSubtotal
          : orderSubtotal;

    const taxPct = isEmployee
        ? Number(order?.tax_rate) || 0
        : parseFloat(editTaxRate) || Number(order?.tax_rate) || 0;
    const taxAmount = (subtotal * taxPct) / 100;
    const shippingAmount = isEmployee
        ? Number(order?.shipping_amount) || 0
        : includeShipping
          ? parseFloat(editShippingAmount) || 0
          : 0;
    const computedTotal = subtotal + taxAmount + shippingAmount;
    const apiComputed = Number(order?.computed_total) || 0;
    const storedTotal = Number(order?.total_amount) || 0;

    return {
        subtotal,
        taxPct,
        taxAmount,
        shippingAmount,
        total:
            apiComputed > 0
                ? apiComputed
                : computedTotal > 0
                  ? computedTotal
                  : storedTotal,
        computedTotal: apiComputed > 0 ? apiComputed : computedTotal,
    };
}

export function mapOrderItemToEditRow(item) {
    const resolvedPrice = resolveLinePrice(item);

    return {
        product_id: String(item.product_id ?? item.product?.id ?? ""),
        product: item.product ?? null,
        quantity: String(item.quantity ?? ""),
        price: resolvedPrice > 0 ? String(resolvedPrice) : String(item.price ?? ""),
    };
}

export function buildOrderItemsPayload(rows) {
    return rows
        .filter((row) => row.product_id && Number(row.quantity) >= 1)
        .map((row) => ({
            product_id: Number(row.product_id),
            quantity: Number(row.quantity),
            price: resolveLinePrice(row),
        }));
}

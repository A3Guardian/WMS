import { formatCurrency, formatDate } from "./formatters";
import "jspdf";
import "../../fonts/Roboto-Regular";
import "../../fonts/Roboto-Bold";
import i18n from "../i18n";

function todayStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

function formatDateShort(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const locale = i18n.language === "ro" ? "ro-RO" : "en-US";
    return d.toLocaleDateString(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

async function loadImageAsDataUrl(url) {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok)
        throw new Error(i18n.t("invoicePdf.errors.imageLoadFailed"));
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export async function generateOrderInvoicePdf({
    order,
    customer,
    items,
    taxRate,
    shippingAmount,
    includeShipping,
    company = {},
    logoUrl = null,
}) {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    doc.setFont("Roboto-Regular", "normal");

    const orderNumber = order.order_number || order.id;
    const invoiceDate = todayStr();
    const invoiceNumber = `FACT-${orderNumber}-${invoiceDate.replace(/-/g, "")}`;

    let yPos = 14;
    const leftCol = 14;
    const rightCol = 105;
    const tableRightEdge = 196;

    // Logo (stânga sus)
    let logoDataUrl = null;
    if (logoUrl) {
        try {
            logoDataUrl = await loadImageAsDataUrl(logoUrl);
        } catch (_) {}
    }
    if (logoDataUrl) {
        const mime = (
            logoDataUrl.split(";")[0].split("/")[1] || "png"
        ).toLowerCase();
        const format = mime === "jpeg" || mime === "jpg" ? "JPEG" : "PNG";
        doc.addImage(logoDataUrl, format, leftCol, 10, 36, 14);
        yPos = 28;
    }

    // Bloc date companie (stânga) – adresă cu wrap pentru mai mult spațiu
    doc.setFontSize(10);
    const companyName = company.name;
    const companyCui = company.cui
        ? `${i18n.t("invoicePdf.labels.taxId")}: ${company.cui}`
        : null;
    const companyAddress = company.address || null;
    const companyCityCounty =
        [company.city, company.county].filter(Boolean).join(", ") || null;
    const companyPhone = company.phone
        ? `${i18n.t("invoicePdf.labels.phone")}: ${company.phone}`
        : null;
    const companyEmail = company.email
        ? `${i18n.t("invoicePdf.labels.email")}: ${company.email}`
        : null;
    const companyBank = company.bank
        ? `${i18n.t("invoicePdf.labels.bank")}: ${company.bank}`
        : null;
    const companyIban = company.iban ? `IBAN: ${company.iban}` : null;

    const companyLineWidth = 80;
    if (companyName) {
        doc.text(companyName, leftCol, yPos);
        yPos += 5;
    }
    if (companyCui) {
        doc.text(companyCui, leftCol, yPos);
        yPos += 5;
    }
    if (companyAddress) {
        const addrLines = doc.splitTextToSize(companyAddress, companyLineWidth);
        addrLines.forEach((line) => {
            doc.text(line, leftCol, yPos);
            yPos += 5;
        });
    }
    if (companyCityCounty) {
        doc.text(companyCityCounty, leftCol, yPos);
        yPos += 5;
    }
    if (companyPhone) {
        doc.text(companyPhone, leftCol, yPos);
        yPos += 5;
    }
    if (companyEmail) {
        doc.text(companyEmail, leftCol, yPos);
        yPos += 5;
    }
    if (companyBank) {
        doc.text(companyBank, leftCol, yPos);
        yPos += 5;
    }
    if (companyIban) {
        doc.text(companyIban, leftCol, yPos);
        yPos += 5;
    }

    // Linie separator sub header / companie
    doc.setDrawColor(200);
    doc.line(14, yPos + 2, 196, yPos + 2);
    yPos += 8;

    // Nr. factură și Data facturii – aliniate la dreapta cu tabelul (margin 196)
    doc.setFontSize(11);
    doc.text(
        `${i18n.t("invoicePdf.labels.invoiceNumber")}: ${invoiceNumber}`,
        tableRightEdge,
        14,
        {
            align: "right",
        },
    );
    doc.text(
        `${i18n.t("orderInvoicePdf.labels.invoiceDate")}: ${formatDateShort(invoiceDate)}`,
        tableRightEdge,
        20,
        {
            align: "right",
        },
    );

    // Titlu factură mai mare
    yPos = Math.max(yPos, 50);
    doc.setFont("Roboto-Bold", "normal");
    doc.setFontSize(20);
    doc.text(i18n.t("orderInvoicePdf.title"), leftCol, yPos);
    doc.setFont("Roboto-Regular", "normal");
    yPos += 8;
    doc.setFontSize(10);
    doc.text(
        `${i18n.t("orderInvoicePdf.labels.order")}: ${orderNumber}`,
        leftCol,
        yPos,
    );
    yPos += 5;
    if (order.created_at) {
        doc.text(
            `${i18n.t("orderInvoicePdf.labels.orderDate")}: ${formatDate(order.created_at)}`,
            leftCol,
            yPos,
        );
        yPos += 5;
    }
    yPos += 6;

    // Client: stânga = Date facturare, dreapta = Date livrare
    const billingCol = leftCol;
    const shippingCol = rightCol;
    const clientStartY = yPos;

    doc.setFontSize(10);
    doc.setFont("Roboto-Bold", "normal");
    doc.text(
        i18n.t("orderInvoicePdf.customer.billingTitle"),
        billingCol,
        clientStartY,
    );
    doc.text(
        i18n.t("orderInvoicePdf.customer.shippingTitle"),
        shippingCol,
        clientStartY,
    );
    doc.setFont("Roboto-Regular", "normal");
    let billingY = clientStartY + 5;
    let shippingY = clientStartY + 5;

    const customerName = customer.company_name || customer.name || "";
    const billingLineWidth = 88;
    const shippingLineWidth = 88;

    doc.text(customerName || "—", billingCol, billingY);
    doc.text(customerName || "—", shippingCol, shippingY);
    billingY += 5;
    shippingY += 5;

    // Facturare: adresă pe linii separate, cu wrap dacă e lungă
    if (customer.billing_address) {
        const addrLines = doc.splitTextToSize(
            customer.billing_address,
            billingLineWidth,
        );
        addrLines.forEach((line) => {
            doc.text(line, billingCol, billingY);
            billingY += 5;
        });
    }
    const billingCityLine = [customer.billing_postcode, customer.billing_city]
        .filter(Boolean)
        .join(" ");
    if (billingCityLine) {
        doc.text(billingCityLine, billingCol, billingY);
        billingY += 5;
    }
    if (customer.billing_country) {
        doc.text(customer.billing_country, billingCol, billingY);
        billingY += 5;
    }
    if (customer.billing_phone) {
        doc.text(
            `${i18n.t("invoicePdf.labels.phone")}: ${customer.billing_phone}`,
            billingCol,
            billingY,
        );
        billingY += 5;
    }

    // Livrare: adresă pe linii separate, cu wrap
    if (customer.shipping_address) {
        const addrLines = doc.splitTextToSize(
            customer.shipping_address,
            shippingLineWidth,
        );
        addrLines.forEach((line) => {
            doc.text(line || "—", shippingCol, shippingY);
            shippingY += 5;
        });
    }
    const shippingCityLine = [
        customer.shipping_postcode,
        customer.shipping_city,
    ]
        .filter(Boolean)
        .join(" ");
    if (shippingCityLine) {
        doc.text(shippingCityLine, shippingCol, shippingY);
        shippingY += 5;
    }
    if (customer.shipping_country) {
        doc.text(customer.shipping_country, shippingCol, shippingY);
        shippingY += 5;
    }
    if (customer.shipping_phone) {
        doc.text(
            `${i18n.t("invoicePdf.labels.phone")}: ${customer.shipping_phone}`,
            shippingCol,
            shippingY,
        );
        shippingY += 5;
    }

    const tableStartY = Math.max(billingY, shippingY) + 8;

    const taxPct = parseFloat(taxRate) || 0;
    const subtotal = (items || []).reduce(
        (sum, row) =>
            sum +
            (parseFloat(row.quantity) || 0) * (parseFloat(row.price) || 0),
        0,
    );
    const taxAmount = (subtotal * taxPct) / 100;
    const shipping = includeShipping ? parseFloat(shippingAmount) || 0 : 0;
    const total = subtotal + taxAmount + shipping;

    const rows = (items || []).map((row) => {
        const qty = parseFloat(row.quantity) || 0;
        const price = parseFloat(row.price) || 0;
        const lineTotal = qty * price;
        const lineTva = (lineTotal * taxPct) / 100;
        return [
            row.product?.name || "",
            qty.toString(),
            formatCurrency(price),
            taxPct > 0 ? formatCurrency(lineTva) : "—",
            formatCurrency(lineTotal),
        ];
    });

    autoTable(doc, {
        startY: tableStartY,
        head: [["Produs", "Cant.", "Preț", "TVA", "Total"]],
        body: rows,

        styles: {
            font: "Roboto-Regular",
            fontSize: 9,
            cellPadding: 4,
        },

        headStyles: {
            font: "Roboto-Bold",
            fontStyle: "normal",
            fillColor: [240, 240, 240],
            textColor: 20,
        },

        columnStyles: {
            1: { halign: "center" },
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
        },

        theme: "grid",
    });

    let afterTableY = doc.lastAutoTable?.finalY || tableStartY + 10;

    // Bloc subtotal / TVA / Transport / Total aliniat cu tabelul
    afterTableY += 6;
    doc.setDrawColor(200);
    doc.line(leftCol, afterTableY - 2, 196, afterTableY - 2);
    afterTableY += 6;

    const summaryLabelX = 120;
    const summaryValueX = 196;
    doc.setFontSize(10);
    doc.text(i18n.t("invoicePdf.summary.subtotal"), summaryLabelX, afterTableY);
    doc.text(formatCurrency(subtotal), summaryValueX, afterTableY, {
        align: "right",
    });
    afterTableY += 6;
    doc.text(
        `${i18n.t("invoicePdf.summary.tax")} (${taxPct}%)`,
        summaryLabelX,
        afterTableY,
    );
    doc.text(
        taxPct > 0 ? formatCurrency(taxAmount) : "—",
        summaryValueX,
        afterTableY,
        { align: "right" },
    );
    if (shipping > 0) {
        afterTableY += 6;
        doc.text(
            i18n.t("orderInvoicePdf.summary.shipping"),
            summaryLabelX,
            afterTableY,
        );
        doc.text(formatCurrency(shipping), summaryValueX, afterTableY, {
            align: "right",
        });
    }
    afterTableY += 6;
    doc.setFont("Roboto-Bold", "normal");
    doc.setFontSize(11);
    doc.text(i18n.t("invoicePdf.summary.total"), summaryLabelX, afterTableY);
    doc.text(formatCurrency(total), summaryValueX, afterTableY, {
        align: "right",
    });
    doc.setFont("Roboto-Regular", "normal");

    // const pageHeight = doc.internal.pageSize.height;
    // doc.setFontSize(8);
    // doc.text(
    //     "Factura generată automat.",
    //     105,
    //     pageHeight - 10,
    //     { align: "center" },
    // );

    const prefix = i18n.t("orderInvoicePdf.fileNamePrefix");
    const fileName = `${prefix}-${invoiceNumber}.pdf`;
    doc.save(fileName);

    const pdfBlob = doc.output("blob");
    const file = new File([pdfBlob], fileName, {
        type: "application/pdf",
    });

    return { file, fileName };
}

import { formatCurrency } from "./formatters";
import "jspdf";
import "../../fonts/Roboto-Regular";
import "../../fonts/Roboto-Bold";

function todayStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

function formatDateShort(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("ro-RO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

async function loadImageAsDataUrl(url) {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error("Failed to load image");
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export async function generateInvoicePdf({
    invoice,
    items,
    company = {},
    logoUrl = null,
}) {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    doc.setFont("Roboto-Regular", "normal");

    const invoiceNumber = invoice?.invoice_number || `INV-${invoice?.id || ""}`;
    const issueDate = invoice?.issue_date || todayStr();

    let yPos = 14;
    const leftCol = 14;
    const rightCol = 105;
    const tableRightEdge = 196;

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

    doc.setFontSize(10);
    const companyName = company.name;
    const companyCui = company.cui ? `CUI: ${company.cui}` : null;
    const companyAddress = company.address || null;
    const companyCityCounty =
        [company.city, company.county].filter(Boolean).join(", ") || null;
    const companyPhone = company.phone ? `Tel: ${company.phone}` : null;
    const companyEmail = company.email ? `Email: ${company.email}` : null;
    const companyBank = company.bank ? `Bancă: ${company.bank}` : null;
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

    doc.setDrawColor(200);
    doc.line(14, yPos + 2, 196, yPos + 2);
    yPos += 8;

    doc.setFontSize(11);
    doc.text(`Nr. factură: ${invoiceNumber}`, tableRightEdge, 14, {
        align: "right",
    });
    doc.text(`Data: ${formatDateShort(issueDate)}`, tableRightEdge, 20, {
        align: "right",
    });

    yPos = Math.max(yPos, 50);
    doc.setFont("Roboto-Bold", "normal");
    doc.setFontSize(20);
    doc.text("FACTURĂ", leftCol, yPos);
    doc.setFont("Roboto-Regular", "normal");
    yPos += 12;

    const partner =
        invoice?.type === "income" ? invoice?.customer : invoice?.supplier;
    const partnerTitle = invoice?.type === "income" ? "Client" : "Furnizor";
    const partnerCol = leftCol;
    const metaCol = rightCol;

    doc.setFontSize(10);
    doc.setFont("Roboto-Bold", "normal");
    doc.text(partnerTitle, partnerCol, yPos);
    doc.text("Detalii", metaCol, yPos);
    doc.setFont("Roboto-Regular", "normal");
    let partnerY = yPos + 5;
    let metaY = yPos + 5;

    const partnerName = partner?.company_name || partner?.name || "—";
    doc.text(partnerName, partnerCol, partnerY);
    partnerY += 5;
    if (partner?.email) {
        doc.text(`Email: ${partner.email}`, partnerCol, partnerY);
        partnerY += 5;
    }
    if (partner?.phone) {
        doc.text(`Tel: ${partner.phone}`, partnerCol, partnerY);
        partnerY += 5;
    }
    if (partner?.tax_number) {
        doc.text(`CUI: ${partner.tax_number}`, partnerCol, partnerY);
        partnerY += 5;
    }
    if (partner?.registration_number) {
        doc.text(
            `Reg. Com.: ${partner.registration_number}`,
            partnerCol,
            partnerY,
        );
        partnerY += 5;
    }
    if (partner?.billing_address) {
        const addrLines = doc.splitTextToSize(partner.billing_address, 88);
        addrLines.forEach((line) => {
            doc.text(line, partnerCol, partnerY);
            partnerY += 5;
        });
    }

    doc.text(
        `Status: ${(invoice?.status || "—").toUpperCase()}`,
        metaCol,
        metaY,
    );
    metaY += 5;
    if (invoice?.due_date) {
        doc.text(
            `Scadență: ${formatDateShort(invoice.due_date)}`,
            metaCol,
            metaY,
        );
        metaY += 5;
    }
    if (invoice?.paid_date) {
        doc.text(
            `Plătită: ${formatDateShort(invoice.paid_date)}`,
            metaCol,
            metaY,
        );
        metaY += 5;
    }
    if (invoice?.category) {
        doc.text(`Categorie: ${invoice.category}`, metaCol, metaY);
        metaY += 5;
    }

    const tableStartY = Math.max(partnerY, metaY) + 8;

    const rows = (items || []).map((row) => {
        const qty = Number(row.quantity) || 0;
        const price = Number(row.unit_price ?? row.price) || 0;
        const lineTotal =
            Number(row.line_total) || (Number.isFinite(qty) ? qty * price : 0);
        return [
            row.name || row.product?.name || "",
            qty.toString(),
            formatCurrency(price),
            formatCurrency(lineTotal),
        ];
    });

    autoTable(doc, {
        startY: tableStartY,
        head: [["Articol", "Cant.", "Preț", "Total"]],
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
        },
        theme: "grid",
    });

    let afterTableY = doc.lastAutoTable?.finalY || tableStartY + 10;
    afterTableY += 10;

    const subtotal = Number(invoice?.subtotal) || 0;
    const tax = Number(invoice?.tax_amount) || 0;
    const discount = Number(invoice?.discount_amount) || 0;
    const total = Number(invoice?.total_amount) || subtotal + tax - discount;

    const summaryLabelX = 120;
    const summaryValueX = 196;
    doc.setFontSize(10);
    doc.text("Subtotal", summaryLabelX, afterTableY);
    doc.text(formatCurrency(subtotal), summaryValueX, afterTableY, {
        align: "right",
    });
    afterTableY += 6;
    doc.text("TVA", summaryLabelX, afterTableY);
    doc.text(formatCurrency(tax), summaryValueX, afterTableY, {
        align: "right",
    });
    afterTableY += 6;
    doc.text("Discount", summaryLabelX, afterTableY);
    doc.text(formatCurrency(discount), summaryValueX, afterTableY, {
        align: "right",
    });
    afterTableY += 6;
    doc.setFont("Roboto-Bold", "normal");
    doc.setFontSize(11);
    doc.text("Total", summaryLabelX, afterTableY);
    doc.text(formatCurrency(total), summaryValueX, afterTableY, {
        align: "right",
    });
    doc.setFont("Roboto-Regular", "normal");

    const safeNumber = String(invoiceNumber).replace(/[^\w\-]+/g, "_");
    const fileName = `invoice-${safeNumber}.pdf`;
    doc.save(fileName);

    const pdfBlob = doc.output("blob");
    const file = new File([pdfBlob], fileName, { type: "application/pdf" });
    return { file, fileName };
}

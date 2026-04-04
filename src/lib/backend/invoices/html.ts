import type { InvoiceSnapshot } from "@/lib/backend/invoices/types";

export function renderInvoiceHtml(snapshot: InvoiceSnapshot): string {
  const rows = snapshot.items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-type">${escapeHtml(item.type)}</div>
          </td>
          <td class="align-right">${item.quantity}</td>
          <td class="align-right">${formatMoney(item.unitPrice)}</td>
          <td class="align-right">${formatMoney(item.lineTotal)}</td>
        </tr>
      `,
    )
    .join("");

  const paymentRows = snapshot.payments.length > 0
    ? snapshot.payments
        .map(
          (payment) => `
            <tr>
              <td>${escapeHtml(payment.method)}</td>
              <td>${escapeHtml(payment.status)}</td>
              <td>${escapeHtml(payment.referenceId ?? "-")}</td>
              <td class="align-right">${formatMoney(payment.amount)}</td>
            </tr>
          `,
        )
        .join("")
    : `
      <tr>
        <td colspan="4" class="muted">No payments recorded at invoice generation time.</td>
      </tr>
    `;

  const taxRows = snapshot.taxSummary.length > 0
    ? snapshot.taxSummary
        .map(
          (taxLine) => `
            <tr>
              <td>${escapeHtml(taxLine.label)}</td>
              <td>${escapeHtml(taxLine.rate ?? "-")}</td>
              <td>${escapeHtml(taxLine.cgstAmount ?? "-")}</td>
              <td>${escapeHtml(taxLine.sgstAmount ?? "-")}</td>
              <td class="align-right">${formatMoney(taxLine.amount)}</td>
            </tr>
          `,
        )
        .join("")
    : `
      <tr>
        <td colspan="5" class="muted">No GST lines recorded.</td>
      </tr>
    `;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(snapshot.invoiceNumber)}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #14213d;
        --muted: #60708a;
        --line: #d7dee7;
        --surface: #ffffff;
        --panel: #f7f9fc;
        --accent: #0f766e;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Georgia", "Times New Roman", serif;
        background: linear-gradient(180deg, #eef6f7 0%, #ffffff 18%);
        color: var(--ink);
        padding: 32px;
      }
      .invoice {
        max-width: 960px;
        margin: 0 auto;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 18px 60px rgba(20, 33, 61, 0.08);
      }
      .hero {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        padding: 32px;
        background:
          radial-gradient(circle at top right, rgba(15, 118, 110, 0.16), transparent 42%),
          linear-gradient(135deg, #ffffff 0%, #f3faf9 100%);
      }
      .brand-kicker {
        display: inline-block;
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--accent);
        margin-bottom: 10px;
      }
      h1 {
        margin: 0;
        font-size: 34px;
        line-height: 1;
      }
      .subtle {
        color: var(--muted);
        font-size: 14px;
        line-height: 1.6;
      }
      .number-card {
        min-width: 260px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 20px;
      }
      .number-card dt {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--muted);
      }
      .number-card dd {
        margin: 6px 0 16px;
        font-size: 18px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 20px;
        padding: 24px 32px 0;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 18px;
      }
      .card h2 {
        margin: 0 0 10px;
        font-size: 13px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .card p {
        margin: 0;
        font-size: 14px;
        line-height: 1.7;
      }
      .section {
        padding: 24px 32px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        padding: 14px 12px;
        border-bottom: 1px solid var(--line);
        text-align: left;
        font-size: 14px;
        vertical-align: top;
      }
      th {
        font-size: 12px;
        color: var(--muted);
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .item-name {
        font-weight: 600;
      }
      .item-type {
        margin-top: 4px;
        color: var(--muted);
        font-size: 12px;
      }
      .align-right {
        text-align: right;
      }
      .totals {
        margin-left: auto;
        width: min(360px, 100%);
        border: 1px solid var(--line);
        border-radius: 16px;
        overflow: hidden;
      }
      .totals-row {
        display: flex;
        justify-content: space-between;
        padding: 12px 16px;
        background: #fff;
        border-bottom: 1px solid var(--line);
      }
      .totals-row:last-child {
        border-bottom: 0;
      }
      .totals-row.emphasis {
        background: #eaf7f5;
        font-weight: 700;
      }
      .muted {
        color: var(--muted);
      }
      .footer {
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 20px;
        padding: 24px 32px 32px;
      }
      .terms {
        background: #14213d;
        color: white;
        border-radius: 18px;
        padding: 20px;
      }
      .terms h2 {
        margin: 0 0 12px;
        font-size: 14px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      .terms ul {
        margin: 0;
        padding-left: 18px;
        line-height: 1.8;
      }
      @media print {
        body {
          padding: 0;
          background: white;
        }
        .invoice {
          box-shadow: none;
          border-radius: 0;
          border: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="invoice">
      <section class="hero">
        <div>
          <span class="brand-kicker">ClinicOS Invoice</span>
          <h1>${escapeHtml(snapshot.facility.name)}</h1>
          <p class="subtle">
            ${escapeHtml(snapshot.facility.address ?? "Address not configured")}<br />
            Facility Type: ${escapeHtml(snapshot.facility.type)}<br />
            GSTIN: ${escapeHtml(snapshot.facility.gstNumber ?? "Not configured")}
          </p>
        </div>
        <dl class="number-card">
          <dt>Invoice Number</dt>
          <dd>${escapeHtml(snapshot.invoiceNumber)}</dd>
          <dt>Generated On</dt>
          <dd>${escapeHtml(formatDate(snapshot.generatedAt))}</dd>
          <dt>Billing Reference</dt>
          <dd>${escapeHtml(snapshot.billing.id)}</dd>
        </dl>
      </section>

      <section class="grid">
        <article class="card">
          <h2>Patient</h2>
          <p>
            ${escapeHtml(snapshot.patient.name)}<br />
            ${escapeHtml(snapshot.patient.phone ?? "-")}<br />
            ${escapeHtml(snapshot.patient.email ?? "-")}<br />
            ${escapeHtml(snapshot.patient.address ?? "-")}
          </p>
        </article>
        <article class="card">
          <h2>Doctor</h2>
          <p>
            ${escapeHtml(snapshot.doctor?.fullName ?? "Not assigned")}<br />
            ${escapeHtml(snapshot.doctor?.specialization ?? "-")}<br />
            ${escapeHtml(snapshot.doctor?.phone ?? "-")}<br />
            ${escapeHtml(snapshot.doctor?.email ?? "-")}
          </p>
        </article>
        <article class="card">
          <h2>Payment Status</h2>
          <p>
            Snapshot Status: ${escapeHtml(snapshot.billing.status)}<br />
            Paid: ${formatMoney(snapshot.totals.paid)}<br />
            Due: ${formatMoney(snapshot.totals.due)}<br />
            Refund: ${formatMoney(snapshot.totals.refund)}
          </p>
        </article>
      </section>

      <section class="section">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Description</th>
              <th class="align-right">Qty</th>
              <th class="align-right">Unit Price</th>
              <th class="align-right">Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>

      <section class="section">
        <div class="grid" style="padding:0; grid-template-columns: 1fr 380px;">
          <article class="card">
            <h2>GST Summary</h2>
            <table>
              <thead>
                <tr>
                  <th>Tax</th>
                  <th>Rate</th>
                  <th>CGST</th>
                  <th>SGST</th>
                  <th class="align-right">Amount</th>
                </tr>
              </thead>
              <tbody>${taxRows}</tbody>
            </table>
          </article>
          <aside class="totals">
            ${renderTotalRow("Subtotal", snapshot.totals.subtotal)}
            ${renderTotalRow("Discount", snapshot.totals.discount)}
            ${renderTotalRow("Tax", snapshot.totals.tax)}
            ${renderTotalRow("Total", snapshot.totals.total, true)}
            ${renderTotalRow("Paid", snapshot.totals.paid)}
            ${renderTotalRow("Refund", snapshot.totals.refund)}
            ${renderTotalRow("Write-off", snapshot.totals.writeOff)}
            ${renderTotalRow("Amount Due", snapshot.totals.due, true)}
          </aside>
        </div>
      </section>

      <section class="section">
        <article class="card">
          <h2>Payment Snapshot</h2>
          <table>
            <thead>
              <tr>
                <th>Method</th>
                <th>Status</th>
                <th>Reference</th>
                <th class="align-right">Amount</th>
              </tr>
            </thead>
            <tbody>${paymentRows}</tbody>
          </table>
        </article>
      </section>

      <footer class="footer">
        <section class="terms">
          <h2>Terms</h2>
          <ul>
            ${snapshot.metadata.terms
              .map((term) => `<li>${escapeHtml(term)}</li>`)
              .join("")}
          </ul>
        </section>
        <article class="card">
          <h2>GST Note</h2>
          <p>${escapeHtml(snapshot.metadata.gstNote)}</p>
        </article>
      </footer>
    </main>
  </body>
</html>`;
}

function renderTotalRow(label: string, amount: string, emphasis = false) {
  return `
    <div class="totals-row${emphasis ? " emphasis" : ""}">
      <span>${escapeHtml(label)}</span>
      <span>${formatMoney(amount)}</span>
    </div>
  `;
}

function formatMoney(amount: string) {
  return `INR ${escapeHtml(amount)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

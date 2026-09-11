import 'server-only';

import nodemailer from 'nodemailer';
import type { StoreOrder } from './supabase-store';

const notificationEmail = process.env.ORDER_NOTIFICATION_EMAIL || 'lightbe1234@gmail.com';

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const formatMoney = (minor: number) => `Rs. ${(minor / 100).toLocaleString('en-PK')}`;

function paymentLabel(payment: StoreOrder['payment']) {
  if (payment === 'cod') return 'Cash on delivery';
  if (payment === 'bank') return 'Bank transfer';
  return 'Online payment';
}

function itemName(slug: string) {
  return slug.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function sendOrderPlacedEmail(order: StoreOrder) {
  const user = process.env.GMAIL_SMTP_USER?.trim();
  const appPassword = process.env.GMAIL_APP_PASSWORD?.replaceAll(' ', '');
  if (!user || !appPassword) return { sent: false, reason: 'not-configured' as const };

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass: appPassword },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  const itemRows = order.items.map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e8e6df">
        <strong>${escapeHtml(itemName(item.slug))}</strong><br>
        <span style="color:#706e67;font-size:13px">${escapeHtml(item.color)} · Size ${escapeHtml(item.size)} · Qty ${item.qty}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e8e6df;text-align:right;white-space:nowrap">${formatMoney(item.lineTotal)}</td>
    </tr>`).join('');

  const plainItems = order.items.map((item) =>
    `- ${itemName(item.slug)} | ${item.color} | Size ${item.size} | Qty ${item.qty} | ${formatMoney(item.lineTotal)}`,
  ).join('\n');

  await transporter.sendMail({
    from: `ZYRA Orders <${user}>`,
    to: notificationEmail,
    replyTo: order.customer.email,
    subject: `New ZYRA order ${order.number} · ${formatMoney(order.total)}`,
    messageId: `<${order.number.toLowerCase()}@zyra-orders>`,
    text: [
      `New ZYRA order ${order.number}`,
      '',
      `Customer: ${order.customer.firstName} ${order.customer.lastName}`,
      `Phone: ${order.customer.phone}`,
      `Email: ${order.customer.email}`,
      `Address: ${order.delivery.address}, ${order.delivery.city}, ${order.delivery.province} ${order.delivery.postal}`,
      `Payment: ${paymentLabel(order.payment)}`,
      order.delivery.note ? `Note: ${order.delivery.note}` : '',
      '',
      plainItems,
      '',
      `Subtotal: ${formatMoney(order.subtotal)}`,
      `Delivery: ${order.shipping ? formatMoney(order.shipping) : 'Free'}`,
      `Total: ${formatMoney(order.total)}`,
      '',
      'Open the ZYRA admin panel to process this order.',
    ].filter(Boolean).join('\n'),
    html: `
      <div style="margin:0;background:#f1efe8;padding:32px 16px;color:#171815;font-family:Arial,sans-serif">
        <div style="max-width:620px;margin:auto;background:#fff;padding:30px;border:1px solid #dedbd2">
          <p style="margin:0 0 8px;color:#77746d;font-size:11px;letter-spacing:1.5px">ZYRA / NEW ORDER</p>
          <h1 style="margin:0 0 6px;font-size:30px">${escapeHtml(order.number)}</h1>
          <p style="margin:0 0 28px;font-size:18px">${formatMoney(order.total)} · ${escapeHtml(paymentLabel(order.payment))}</p>
          <h2 style="font-size:15px;margin:0 0 8px">Customer</h2>
          <p style="margin:0 0 22px;line-height:1.7;color:#45463f">
            ${escapeHtml(`${order.customer.firstName} ${order.customer.lastName}`)}<br>
            <a href="tel:${escapeHtml(order.customer.phone)}">${escapeHtml(order.customer.phone)}</a><br>
            <a href="mailto:${escapeHtml(order.customer.email)}">${escapeHtml(order.customer.email)}</a><br>
            ${escapeHtml(`${order.delivery.address}, ${order.delivery.city}, ${order.delivery.province} ${order.delivery.postal}`)}
          </p>
          ${order.delivery.note ? `<p style="padding:12px;background:#f4f2ec"><strong>Customer note:</strong> ${escapeHtml(order.delivery.note)}</p>` : ''}
          <table style="width:100%;border-collapse:collapse;margin-top:18px">${itemRows}</table>
          <table style="width:100%;margin-top:20px;line-height:1.8">
            <tr><td>Subtotal</td><td style="text-align:right">${formatMoney(order.subtotal)}</td></tr>
            <tr><td>Delivery</td><td style="text-align:right">${order.shipping ? formatMoney(order.shipping) : 'Free'}</td></tr>
            <tr><td style="font-size:18px"><strong>Total</strong></td><td style="text-align:right;font-size:18px"><strong>${formatMoney(order.total)}</strong></td></tr>
          </table>
          <a href="${escapeHtml(process.env.NEXT_PUBLIC_SITE_URL || 'https://zyraa-web.vercel.app')}/admin" style="display:block;margin-top:28px;padding:14px 18px;background:#1b1d18;color:#fff;text-align:center;text-decoration:none">Open admin orders</a>
        </div>
      </div>`,
  });

  return { sent: true as const };
}

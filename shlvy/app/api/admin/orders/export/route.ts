// Download every order as a spreadsheet (CSV opens in Excel / Google Sheets).
import {guard} from '@/lib/auth';
import {listOrders} from '@/lib/store';

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const cols = ['createdAt', 'status', 'requestType', 'selectedDesign', 'selectedColor', 'name', 'email', 'model', 'price', 'tracking', 'interests', 'style', 'palette', 'notes', 'adminNotes', 'id'] as const;
  const cell = (v: unknown) => `"${String(Array.isArray(v) ? v.join(', ') : v ?? '').replace(/"/g, '""')}"`;
  const rows = (await listOrders()).map(o => cols.map(c => cell(o[c])).join(','));
  const csv = '﻿' + [cols.join(','), ...rows].join('\n');
  return new Response(csv, {headers: {'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="shlvy-orders-${new Date().toISOString().slice(0, 10)}.csv"`}});
}

/** Ex-GST base from GST-inclusive revenue: gross ÷ (1 + GST rate). */
const GST_RATE = 0.18;

export function totalSalesAfterGst(totalSales) {
  if (totalSales == null || Number.isNaN(Number(totalSales))) return null;
  const n = Number(totalSales);
  return Number((n / (1 + GST_RATE)).toFixed(2));
}

export { GST_RATE };

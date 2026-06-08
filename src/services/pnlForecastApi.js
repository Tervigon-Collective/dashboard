import { apiClient } from "@/api/api";

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** P&L API uses exclusive endDate (matches ClickHouse: report_date < endDate). */
export function toExclusiveEndDate(inclusiveEndDate) {
  if (!inclusiveEndDate) return null;
  const [year, month, day] = inclusiveEndDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + 1);
  return formatDateOnly(date);
}

export async function getPnlSummary(startDateInclusive, endDateInclusive) {
  const endDate = toExclusiveEndDate(endDateInclusive);
  const response = await apiClient.get("/api/pnl/summary", {
    params: { startDate: startDateInclusive, endDate },
  });
  return response?.data?.data || null;
}

export async function getLatestVariableOpsCost() {
  const response = await apiClient.get("/api/pnl/variable_ops_cost/latest");
  return response?.data?.data || null;
}

export async function createVariableOpsCost(payload) {
  const response = await apiClient.post("/api/pnl/variable_ops_cost", payload);
  return response?.data?.data || null;
}

export async function updateVariableOpsCost(id, payload) {
  const response = await apiClient.put(`/api/pnl/variable_ops_cost/${id}`, payload);
  return response?.data?.data || null;
}

export async function getFixedCostByMonth(month) {
  const response = await apiClient.get("/api/pnl/fixed_cost", {
    params: { month },
  });
  return response?.data?.data || null;
}

export async function upsertFixedCostByMonth(payload) {
  const response = await apiClient.post("/api/pnl/fixed_cost", payload);
  return response?.data?.data || null;
}

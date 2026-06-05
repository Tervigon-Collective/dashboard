import { apiClient } from "@/api/api";

export async function getPnlSummary(startDate, endDate) {
  const response = await apiClient.get("/api/pnl/summary", {
    params: { startDate, endDate },
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

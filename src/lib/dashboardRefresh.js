let forceRefreshPending = false;

export function markDashboardForceRefresh() {
  forceRefreshPending = true;
}

export function peekDashboardForceRefresh() {
  return forceRefreshPending;
}

export function clearDashboardForceRefresh() {
  forceRefreshPending = false;
}

export function withForceRefreshParams(params = {}) {
  if (!peekDashboardForceRefresh()) return params;
  return { ...params, refresh: "1" };
}

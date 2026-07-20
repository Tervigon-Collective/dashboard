export function getTodayIST() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function isTodayRange(start, end) {
  if (!start || !end) return true;
  const today = getTodayIST();
  return start.split(" ")[0] === today && end.split(" ")[0] === today;
}

function getIstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
  };
}

export function getIstHourNow() {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  }).format(new Date());
  return Number(hour);
}

export function getIstTodayDate() {
  const { year, month, day } = getIstDateParts();
  return new Date(year, month - 1, day);
}

export function isAfterIstToday(date) {
  const istToday = getIstTodayDate();
  const candidate = new Date(date);
  candidate.setHours(0, 0, 0, 0);
  istToday.setHours(0, 0, 0, 0);
  return candidate > istToday;
}

export function isSameIstDay(dateA, dateB) {
  if (!dateA || !dateB) return false;
  const a = new Date(dateA);
  const b = new Date(dateB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getHistoricalPickerPresets() {
  const { year, month, day } = getIstDateParts();
  const todayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
  const todayEnd = new Date(year, month - 1, day, 23, 0, 0, 0);
  const yesterdayDate = new Date(year, month - 1, day - 1);
  const yesterdayStart = new Date(
    yesterdayDate.getFullYear(),
    yesterdayDate.getMonth(),
    yesterdayDate.getDate(),
    0,
    0,
    0,
    0
  );
  const yesterdayEnd = new Date(
    yesterdayDate.getFullYear(),
    yesterdayDate.getMonth(),
    yesterdayDate.getDate(),
    23,
    0,
    0,
    0
  );
  const weekStart = new Date(year, month - 1, day - 6, 0, 0, 0, 0);
  const monthStart = new Date(year, month - 1, day - 29, 0, 0, 0, 0);

  return [
    { label: "Today", value: [todayStart, todayEnd] },
    { label: "Yesterday", value: [yesterdayStart, yesterdayEnd] },
    { label: "Last 7 Days", value: [weekStart, todayEnd] },
    { label: "Last 30 Days", value: [monthStart, todayEnd] },
  ];
}

export function getDefaultHistoricalDateRange() {
  const { year, month, day } = getIstDateParts();
  return [
    new Date(year, month - 1, day, 0, 0, 0, 0),
    new Date(year, month - 1, day, 23, 0, 0, 0),
  ];
}

export function buildDashboardMetricsParams(dateRange, { historicalMode = false } = {}) {
  const today = getTodayIST();
  const hasSelection = dateRange?.startDate && dateRange?.endDate;
  const startDate = hasSelection ? dateRange.startDate : `${today} 00`;
  const endDate = hasSelection ? dateRange.endDate : `${today} 23`;
  const startDateOnly = startDate.split(" ")[0];
  const endDateOnly = endDate.split(" ")[0];

  return {
    isToday: historicalMode ? false : isTodayRange(startDateOnly, endDateOnly),
    startDateOnly,
    endDateOnly,
    startDateTime: startDate.split(":")[0],
    endDateTime: endDate.split(":")[0],
    historicalMode,
  };
}

export function getPeriodDateRange(period) {
  const istNow = getIstDateParts();
  let startDate;
  let endDate;

  if (period === "today") {
    startDate = endDate = getTodayIST();
  } else if (period === "week") {
    const end = new Date(Date.UTC(istNow.year, istNow.month - 1, istNow.day));
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - 6);
    startDate = start.toISOString().slice(0, 10);
    endDate = end.toISOString().slice(0, 10);
  } else if (period === "month") {
    startDate = `${istNow.year}-${String(istNow.month).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(istNow.year, istNow.month, 0)).getUTCDate();
    endDate = `${istNow.year}-${String(istNow.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  } else if (period === "year") {
    startDate = `${istNow.year}-01-01`;
    endDate = `${istNow.year}-12-31`;
  } else {
    startDate = endDate = getTodayIST();
  }

  return { startDate, endDate };
}

export function getNetProfitChartRange(period) {
  const istNow = getIstDateParts();
  const end = new Date(Date.UTC(istNow.year, istNow.month - 1, istNow.day));
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);

  if (period === "month") {
    start.setUTCDate(end.getUTCDate() - 29);
  } else {
    start.setUTCDate(end.getUTCDate() - 6);
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function mapInventoryPayload(payload) {
  const cancelOnly = payload?.cancel_only ?? { count: 0, quantity: 0 };
  const returnOnly = payload?.return_only ?? { count: 0, quantity: 0 };
  const overlap = payload?.overlap ?? { count: 0, quantity: 0 };
  const cancelCount =
    payload?.cancel?.count ?? cancelOnly.count + overlap.count;
  const returnCount = payload?.return?.count ?? returnOnly.count;
  const totalEvents = payload?.total_events ?? cancelCount + returnCount;

  return {
    cancel: payload?.cancel ?? { count: cancelCount, quantity: cancelCount },
    return: payload?.return ?? { count: returnCount, quantity: returnCount },
    cancel_only: cancelOnly,
    return_only: returnOnly,
    overlap,
    total_events: totalEvents,
    total_quantity: payload?.total_quantity ?? totalEvents,
  };
}

function normalizeOrderCountPayload(raw = {}) {
  const total = Number(raw.orderCount ?? raw.totalQuantity ?? 0) || 0;
  const meta =
    Number(raw.metaOrderCount ?? raw.metaQuantity ?? 0) || 0;
  const google =
    Number(raw.googleOrderCount ?? raw.googleQuantity ?? 0) || 0;
  const organic =
    Number(raw.organicOrderCount ?? raw.organicQuantity ?? 0) || 0;

  return {
    orderCount: total,
    totalQuantity: total,
    metaOrderCount: meta,
    metaQuantity: meta,
    googleOrderCount: google,
    googleQuantity: google,
    organicOrderCount: organic,
    organicQuantity: organic,
  };
}

/** Datetime query values contain spaces; must use axios params (not raw URL strings). */
function hourlyRangeParams(startDateTime, endDateTime) {
  return { params: { startDateTime, endDateTime } };
}

function computeLegacyRoas(sales, cogs, adSpend, zeroWhenEmpty = false) {
  const safeDiv = (num, denom) => {
    if (!denom) return zeroWhenEmpty ? 0 : null;
    return num / denom;
  };

  const metaRevenue = sales.metaSales || 0;
  const metaCogs = cogs.metaCogs || 0;
  const metaAdSpend = adSpend.facebookSpend || 0;
  const googleRevenue = sales.googleSales || 0;
  const googleCogs = cogs.googleCogs || 0;
  const googleAdSpend = adSpend.googleSpend || 0;
  const totalRevenue = sales.totalSales || 0;
  const totalCogs = cogs.totalCogs || 0;
  const totalAdSpend = adSpend.totalSpend || 0;

  return {
    meta: {
      grossRoas: safeDiv(metaRevenue, metaAdSpend),
      netRoas: safeDiv(metaRevenue - metaCogs, metaAdSpend),
      beRoas: safeDiv(metaCogs + metaAdSpend, metaAdSpend),
    },
    google: {
      grossRoas: safeDiv(googleRevenue, googleAdSpend),
      netRoas: safeDiv(googleRevenue - googleCogs, googleAdSpend),
      beRoas: safeDiv(googleCogs + googleAdSpend, googleAdSpend),
    },
    total: {
      grossRoas: safeDiv(totalRevenue, totalAdSpend),
      netRoas: safeDiv(totalRevenue - totalCogs, totalAdSpend),
      beRoas: safeDiv(totalCogs + totalAdSpend, totalAdSpend),
    },
  };
}

async function fetchTodayLegacy(apiClient, startDateOnly, endDateOnly) {
  const query = `?startDate=${startDateOnly}&endDate=${endDateOnly}`;
  const results = await Promise.allSettled([
    apiClient.get(`/api/ad_spend${query}`),
    apiClient.get(`/api/cogs${query}`),
    apiClient.get(`/api/sales${query}`),
    apiClient.get(`/api/net_profit${query}`),
    apiClient.get(`/api/order_count${query}`),
    apiClient.get(`/api/roas${query}`),
    apiClient.get(
      `/api/inventory-events/summary?start_date=${startDateOnly}&end_date=${endDateOnly}`
    ),
    apiClient.get(`/api/payment_method_count${query}`),
  ]);

  const errors = {};
  const adSpend =
    results[0].status === "fulfilled"
      ? results[0].value.data
      : (() => {
          errors.adSpend = "Failed to load ad spend";
          return { totalSpend: 0, googleSpend: 0, facebookSpend: 0 };
        })();

  const cogs =
    results[1].status === "fulfilled"
      ? results[1].value.data
      : (() => {
          errors.cogs = "Failed to load COGS";
          return { totalCogs: 0, googleCogs: 0, metaCogs: 0, organicCogs: 0 };
        })();

  const sales =
    results[2].status === "fulfilled"
      ? results[2].value.data
      : (() => {
          errors.sales = "Failed to load sales";
          return {
            totalSales: 0,
            total_sales_after_gst: 0,
            googleSales: 0,
            metaSales: 0,
            organicSales: 0,
          };
        })();

  const netProfit =
    results[3].status === "fulfilled"
      ? results[3].value.data
      : (() => {
          errors.netProfit = "Failed to load net profit";
          return {};
        })();

  const orderCount =
    results[4].status === "fulfilled"
      ? results[4].value.data
      : (() => {
          errors.orderCount = "Failed to load order count";
          return {
            totalQuantity: 0,
            googleQuantity: 0,
            metaQuantity: 0,
            organicQuantity: 0,
          };
        })();

  const roas =
    results[5].status === "fulfilled"
      ? results[5].value.data
      : (() => {
          errors.roas = "Failed to load ROAS";
          return {
            total: { grossRoas: null, netRoas: null, beRoas: null },
            google: { grossRoas: null, netRoas: null, beRoas: null },
            meta: { grossRoas: null, netRoas: null, beRoas: null },
          };
        })();

  const inventoryEvents =
    results[6].status === "fulfilled"
      ? mapInventoryPayload(results[6].value.data?.data)
      : (() => {
          errors.inventoryEvents = "Failed to load inventory events";
          return mapInventoryPayload(null);
        })();

  const paymentMethodCounts =
    results[7].status === "fulfilled"
      ? results[7].value.data || results[7].value || {}
      : (() => {
          errors.paymentMethodCount = "Failed to load payment methods";
          return {};
        })();

  const totalNetProfit =
    netProfit.net_profit_after_gst != null
      ? Number(netProfit.net_profit_after_gst)
      : Number(sales.total_sales_after_gst ?? 0) -
        Number(cogs.totalCogs ?? 0) -
        Number(adSpend.totalSpend ?? 0);

  return {
    source: "live",
    adSpend: {
      totalSpend: adSpend.totalSpend ?? 0,
      googleSpend: adSpend.googleSpend ?? 0,
      facebookSpend: adSpend.facebookSpend ?? 0,
    },
    cogs,
    sales,
    netProfit: {
      ...netProfit,
      totalNetProfit,
      net_profit_after_gst: totalNetProfit,
    },
    orderCount: normalizeOrderCountPayload(orderCount),
    roas,
    inventoryEvents,
    paymentMethodCounts,
    errors,
  };
}

async function fetchHistoricalLegacy(
  apiClient,
  startDateTime,
  endDateTime,
  startDateOnly,
  endDateOnly
) {
  const results = await Promise.allSettled([
    apiClient.get(
      "/api/historical/ad_spend_by_hour",
      hourlyRangeParams(startDateTime, endDateTime)
    ),
    apiClient.get(
      "/api/sales_unitCost_by_hour",
      hourlyRangeParams(startDateTime, endDateTime)
    ),
    apiClient.get(
      `/api/inventory-events/summary?start_date=${startDateOnly}&end_date=${endDateOnly}`
    ),
    apiClient.get(
      `/api/payment_method_count?startDate=${startDateOnly}&endDate=${endDateOnly}`
    ),
  ]);

  const errors = {};
  let adSpendTotals = { facebookSpend: 0, googleSpend: 0 };

  if (results[0].status === "fulfilled") {
    adSpendTotals = results[0].value.data.totals ?? adSpendTotals;
  } else {
    errors.adSpend = "Failed to load ad spend";
  }

  const hourlyTotal =
    (adSpendTotals.facebookSpend ?? 0) + (adSpendTotals.googleSpend ?? 0);
  if (hourlyTotal === 0) {
    try {
      const dailyRes = await apiClient.get(
        `/api/historical/ad_spend?startDate=${startDateOnly}&endDate=${endDateOnly}`
      );
      adSpendTotals = {
        facebookSpend: dailyRes.data.facebookSpend ?? 0,
        googleSpend: dailyRes.data.googleSpend ?? 0,
      };
    } catch {
      // keep zeros
    }
  }

  const adSpend = {
    totalSpend:
      (adSpendTotals.facebookSpend ?? 0) + (adSpendTotals.googleSpend ?? 0),
    googleSpend: adSpendTotals.googleSpend ?? 0,
    facebookSpend: adSpendTotals.facebookSpend ?? 0,
  };

  let salesData = null;
  if (results[1].status === "fulfilled") {
    salesData = results[1].value.data.sum;
  } else {
    errors.sales = "Failed to load sales data";
    errors.cogs = errors.sales;
    errors.orderCount = errors.sales;
  }

  const sales = salesData
    ? {
        totalSales: salesData.total_sales ?? 0,
        total_sales_after_gst: salesData.total_sales_after_gst ?? 0,
        googleSales: salesData.google_sales ?? 0,
        metaSales: salesData.meta_sales ?? 0,
        organicSales: salesData.organic_sales ?? 0,
      }
    : {
        totalSales: 0,
        total_sales_after_gst: 0,
        googleSales: 0,
        metaSales: 0,
        organicSales: 0,
      };

  const cogs = salesData
    ? {
        totalCogs: salesData.unit_cost ?? 0,
        googleCogs: salesData.unit_cost_google ?? 0,
        metaCogs: salesData.unit_cost_meta ?? 0,
        organicCogs: salesData.unit_cost_organic ?? 0,
      }
    : {
        totalCogs: 0,
        googleCogs: 0,
        metaCogs: 0,
        organicCogs: 0,
      };

  const netProfit = {
    totalNetProfit:
      Number(sales.total_sales_after_gst ?? 0) -
      Number(cogs.totalCogs ?? 0) -
      Number(adSpend.totalSpend ?? 0),
    net_profit_after_gst:
      Number(sales.total_sales_after_gst ?? 0) -
      Number(cogs.totalCogs ?? 0) -
      Number(adSpend.totalSpend ?? 0),
    googleNetProfit:
      (sales.googleSales ?? 0) -
      (cogs.googleCogs ?? 0) -
      (adSpend.googleSpend ?? 0),
    metaNetProfit:
      (sales.metaSales ?? 0) -
      (cogs.metaCogs ?? 0) -
      (adSpend.facebookSpend ?? 0),
    organicNetProfit:
      (sales.organicSales ?? 0) - (cogs.organicCogs ?? 0),
  };

  const roas =
    adSpend.totalSpend > 0
      ? computeLegacyRoas(sales, cogs, adSpend, true)
      : {
          meta: { grossRoas: null, netRoas: null, beRoas: null },
          google: { grossRoas: null, netRoas: null, beRoas: null },
          total: { grossRoas: null, netRoas: null, beRoas: null },
        };

  const inventoryEvents =
    results[2].status === "fulfilled"
      ? mapInventoryPayload(results[2].value.data?.data)
      : (() => {
          errors.inventoryEvents = "Failed to load inventory events";
          return mapInventoryPayload(null);
        })();

  const paymentMethodCounts =
    results[3].status === "fulfilled"
      ? results[3].value.data || results[3].value || {}
      : (() => {
          errors.paymentMethodCount = "Failed to load payment methods";
          return {};
        })();

  return {
    source: "database",
    adSpend,
    cogs,
    sales,
    netProfit,
    orderCount: normalizeOrderCountPayload(
      salesData
        ? {
            orderCount: salesData.order_count ?? 0,
            metaOrderCount: salesData.meta_order_count ?? 0,
            googleOrderCount: salesData.google_order_count ?? 0,
            organicOrderCount: salesData.organic_order_count ?? 0,
          }
        : {
            orderCount: 0,
            metaOrderCount: 0,
            googleOrderCount: 0,
            organicOrderCount: 0,
          }
    ),
    roas,
    inventoryEvents,
    paymentMethodCounts,
    errors,
  };
}

function deriveHistoricalNetProfit(sales, cogs, adSpend) {
  return {
    totalNetProfit:
      Number(sales.total_sales_after_gst ?? 0) -
      Number(cogs.totalCogs ?? 0) -
      Number(adSpend.totalSpend ?? 0),
    net_profit_after_gst:
      Number(sales.total_sales_after_gst ?? 0) -
      Number(cogs.totalCogs ?? 0) -
      Number(adSpend.totalSpend ?? 0),
    googleNetProfit:
      (sales.googleSales ?? 0) -
      (cogs.googleCogs ?? 0) -
      (adSpend.googleSpend ?? 0),
    metaNetProfit:
      (sales.metaSales ?? 0) -
      (cogs.metaCogs ?? 0) -
      (adSpend.facebookSpend ?? 0),
    organicNetProfit:
      (sales.organicSales ?? 0) - (cogs.organicCogs ?? 0),
  };
}

function mapHistoricalSalesBundle(sum) {
  const sales = {
    totalSales: sum.total_sales ?? 0,
    total_sales_after_gst: sum.total_sales_after_gst ?? 0,
    googleSales: sum.google_sales ?? 0,
    metaSales: sum.meta_sales ?? 0,
    organicSales: sum.organic_sales ?? 0,
  };
  const cogs = {
    totalCogs: sum.unit_cost ?? 0,
    googleCogs: sum.unit_cost_google ?? 0,
    metaCogs: sum.unit_cost_meta ?? 0,
    organicCogs: sum.unit_cost_organic ?? 0,
  };
  const orderCount = normalizeOrderCountPayload({
    orderCount: sum.order_count ?? 0,
    metaOrderCount: sum.meta_order_count ?? 0,
    googleOrderCount: sum.google_order_count ?? 0,
    organicOrderCount: sum.organic_order_count ?? 0,
  });
  return { sales, cogs, orderCount };
}

/**
 * Fires independent API calls and invokes onSection as each completes.
 * Used for skeleton + progressive card rendering in UnitCountOne.
 */
export function fetchDashboardMetricsProgressive(apiClient, options, callbacks = {}) {
  const { onSection, onError, onDone } = callbacks;
  const {
    isToday,
    startDateOnly,
    endDateOnly,
    startDateTime,
    endDateTime,
  } = options;

  if (isToday) {
    return fetchTodayProgressive(
      apiClient,
      startDateOnly,
      endDateOnly,
      onSection,
      onError,
      onDone
    );
  }

  return fetchHistoricalProgressive(
    apiClient,
    startDateTime,
    endDateTime,
    startDateOnly,
    endDateOnly,
    onSection,
    onError,
    onDone
  );
}

function fetchTodayProgressive(
  apiClient,
  startDateOnly,
  endDateOnly,
  onSection,
  onError,
  onDone
) {
  const query = `?startDate=${startDateOnly}&endDate=${endDateOnly}`;
  const invQuery = `?start_date=${startDateOnly}&end_date=${endDateOnly}`;
  let pending = 8;

  const done = () => {
    pending -= 1;
    if (pending <= 0) {
      onDone?.();
    }
  };

  const run = (section, request, mapPayload) => {
    request
      .then((res) => {
        onSection?.(section, mapPayload(res.data));
      })
      .catch((err) => {
        onError?.(section, err);
        onSection?.(section, mapPayload(null, err));
      })
      .finally(done);
  };

  run(
    "adSpend",
    apiClient.get(`/api/ad_spend${query}`),
    (data) => ({
      adSpend: {
        totalSpend: data?.totalSpend ?? 0,
        googleSpend: data?.googleSpend ?? 0,
        facebookSpend: data?.facebookSpend ?? 0,
        errors: data?.errors,
      },
      errors: data ? {} : { adSpend: "Failed to load ad spend" },
    })
  );

  run(
    "cogs",
    apiClient.get(`/api/cogs${query}`),
    (data) => ({
      cogs: data || {
        totalCogs: 0,
        googleCogs: 0,
        metaCogs: 0,
        organicCogs: 0,
      },
      errors: data ? {} : { cogs: "Failed to load COGS" },
    })
  );

  run(
    "sales",
    apiClient.get(`/api/sales${query}`),
    (data) => ({
      sales: data || {
        totalSales: 0,
        total_sales_after_gst: 0,
        googleSales: 0,
        metaSales: 0,
        organicSales: 0,
      },
      errors: data ? {} : { sales: "Failed to load sales" },
    })
  );

  run(
    "netProfit",
    apiClient.get(`/api/net_profit${query}`),
    (data) => ({
      netProfit: data || {},
      errors: data ? {} : { netProfit: "Failed to load net profit" },
    })
  );

  run(
    "orderCount",
    apiClient.get(`/api/order_count${query}`),
    (data) => ({
      orderCount: normalizeOrderCountPayload(data),
      errors: data ? {} : { orderCount: "Failed to load order count" },
    })
  );

  run(
    "roas",
    apiClient.get(`/api/roas${query}`),
    (data) => ({
      roas: data || {
        total: { grossRoas: null, netRoas: null, beRoas: null },
        google: { grossRoas: null, netRoas: null, beRoas: null },
        meta: { grossRoas: null, netRoas: null, beRoas: null },
      },
      errors: data ? {} : { roas: "Failed to load ROAS" },
    })
  );

  run(
    "inventoryEvents",
    apiClient.get(`/api/inventory-events/summary${invQuery}`),
    (data) => ({
      inventoryEvents: mapInventoryPayload(data?.data),
      errors: data ? {} : { inventoryEvents: "Failed to load inventory events" },
    })
  );

  run(
    "paymentMethodCount",
    apiClient.get(`/api/payment_method_count${query}`),
    (data, err) => ({
      paymentMethodCounts: data || {},
      errors: err ? { paymentMethodCount: "Failed to load payment methods" } : {},
    })
  );

  return () => {};
}

function emitBundleAsSections(data, onSection) {
  if (!data) return;
  onSection?.("adSpend", {
    adSpend: data.adSpend,
    errors: data.errors?.adSpend ? { adSpend: data.errors.adSpend } : {},
  });
  onSection?.("cogs", { cogs: data.cogs, errors: data.errors?.cogs ? { cogs: data.errors.cogs } : {} });
  onSection?.("sales", {
    sales: data.sales,
    errors: data.errors?.sales ? { sales: data.errors.sales } : {},
  });
  onSection?.("netProfit", {
    netProfit: data.netProfit,
    errors: data.errors?.netProfit ? { netProfit: data.errors.netProfit } : {},
  });
  onSection?.("orderCount", {
    orderCount: normalizeOrderCountPayload(data.orderCount),
    errors: data.errors?.orderCount ? { orderCount: data.errors.orderCount } : {},
  });
  onSection?.("roas", { roas: data.roas, errors: data.errors?.roas ? { roas: data.errors.roas } : {} });
  onSection?.("inventoryEvents", {
    inventoryEvents: mapInventoryPayload(data.inventoryEvents),
    errors: data.errors?.inventoryEvents
      ? { inventoryEvents: data.errors.inventoryEvents }
      : {},
  });
  onSection?.("paymentMethodCount", {
    paymentMethodCounts: data.paymentMethodCounts,
    errors: data.errors?.paymentMethodCount
      ? { paymentMethodCount: data.errors.paymentMethodCount }
      : {},
  });
}

async function tryHistoricalMetricsBundle(
  apiClient,
  startDateTime,
  endDateTime,
  onSection,
  onDone
) {
  try {
    const response = await apiClient.get("/api/dashboard/metrics", {
      params: { startDateTime, endDateTime },
    });
    const data = response?.data;
    if (data?.adSpend || data?.sales || data?.source) {
      emitBundleAsSections(data, onSection);
      onDone?.();
      return true;
    }
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      throw err;
    }
    console.warn(
      "[dashboardMetrics] Historical bundle failed, using per-section APIs:",
      err?.response?.status || err?.message
    );
  }
  return false;
}

function fetchHistoricalProgressive(
  apiClient,
  startDateTime,
  endDateTime,
  startDateOnly,
  endDateOnly,
  onSection,
  onError,
  onDone
) {
  (async () => {
    const usedBundle = await tryHistoricalMetricsBundle(
      apiClient,
      startDateTime,
      endDateTime,
      onSection,
      onDone
    );
    if (usedBundle) {
      return;
    }

  const invQuery = `?start_date=${startDateOnly}&end_date=${endDateOnly}`;
  let pending = 4;
  const derived = { sales: null, cogs: null, adSpend: null };

  const done = () => {
    pending -= 1;
    if (pending <= 0) {
      onDone?.();
    }
  };

  const maybeEmitDerived = () => {
    if (!derived.sales || !derived.cogs || !derived.adSpend) {
      return;
    }
    const netProfit = deriveHistoricalNetProfit(
      derived.sales,
      derived.cogs,
      derived.adSpend
    );
    onSection?.("netProfit", { netProfit, errors: {} });

    const roas =
      derived.adSpend.totalSpend > 0
        ? computeLegacyRoas(derived.sales, derived.cogs, derived.adSpend, true)
        : {
            meta: { grossRoas: null, netRoas: null, beRoas: null },
            google: { grossRoas: null, netRoas: null, beRoas: null },
            total: { grossRoas: null, netRoas: null, beRoas: null },
          };
    onSection?.("roas", { roas, errors: {} });
  };

  const loadAdSpend = async () => {
    try {
      let adSpendTotals = { facebookSpend: 0, googleSpend: 0 };
      const hourlyRes = await apiClient.get(
        "/api/historical/ad_spend_by_hour",
        hourlyRangeParams(startDateTime, endDateTime)
      );
      adSpendTotals = hourlyRes.data.totals ?? adSpendTotals;

      const hourlyTotal =
        (adSpendTotals.facebookSpend ?? 0) + (adSpendTotals.googleSpend ?? 0);
      if (hourlyTotal === 0) {
        try {
          const dailyRes = await apiClient.get(
            `/api/historical/ad_spend?startDate=${startDateOnly}&endDate=${endDateOnly}`
          );
          adSpendTotals = {
            facebookSpend: dailyRes.data.facebookSpend ?? 0,
            googleSpend: dailyRes.data.googleSpend ?? 0,
          };
        } catch {
          // keep zeros
        }
      }

      const adSpend = {
        totalSpend:
          (adSpendTotals.facebookSpend ?? 0) + (adSpendTotals.googleSpend ?? 0),
        googleSpend: adSpendTotals.googleSpend ?? 0,
        facebookSpend: adSpendTotals.facebookSpend ?? 0,
      };
      derived.adSpend = adSpend;
      onSection?.("adSpend", { adSpend, errors: {} });
      maybeEmitDerived();
    } catch (err) {
      onError?.("adSpend", err);
      derived.adSpend = {
        totalSpend: 0,
        googleSpend: 0,
        facebookSpend: 0,
      };
      onSection?.("adSpend", {
        adSpend: derived.adSpend,
        errors: { adSpend: "Failed to load ad spend" },
      });
      maybeEmitDerived();
    } finally {
      done();
    }
  };

  const loadSalesBundle = async () => {
    try {
      const res = await apiClient.get(
        "/api/sales_unitCost_by_hour",
        hourlyRangeParams(startDateTime, endDateTime)
      );
      const sum = res.data.sum;
      const bundle = mapHistoricalSalesBundle(sum);
      derived.sales = bundle.sales;
      derived.cogs = bundle.cogs;
      onSection?.("sales", { sales: bundle.sales, errors: {} });
      onSection?.("cogs", { cogs: bundle.cogs, errors: {} });
      onSection?.("orderCount", { orderCount: bundle.orderCount, errors: {} });
      maybeEmitDerived();
    } catch (err) {
      onError?.("sales", err);
      const emptySales = {
        totalSales: 0,
        total_sales_after_gst: 0,
        googleSales: 0,
        metaSales: 0,
        organicSales: 0,
      };
      const emptyCogs = {
        totalCogs: 0,
        googleCogs: 0,
        metaCogs: 0,
        organicCogs: 0,
      };
      derived.sales = emptySales;
      derived.cogs = emptyCogs;
      const salesError = { sales: "Failed to load sales data" };
      onSection?.("sales", { sales: emptySales, errors: salesError });
      onSection?.("cogs", { cogs: emptyCogs, errors: { cogs: "Failed to load sales data" } });
      onSection?.("orderCount", {
        orderCount: normalizeOrderCountPayload({}),
        errors: { orderCount: "Failed to load sales data" },
      });
      maybeEmitDerived();
    } finally {
      done();
    }
  };

  const loadInventory = async () => {
    try {
      const res = await apiClient.get(
        `/api/inventory-events/summary${invQuery}`
      );
      onSection?.("inventoryEvents", {
        inventoryEvents: mapInventoryPayload(res.data?.data),
        errors: {},
      });
    } catch (err) {
      onError?.("inventoryEvents", err);
      onSection?.("inventoryEvents", {
        inventoryEvents: mapInventoryPayload(null),
        errors: { inventoryEvents: "Failed to load inventory events" },
      });
    } finally {
      done();
    }
  };

  const loadPayment = async () => {
    try {
      const res = await apiClient.get(
        `/api/payment_method_count?startDate=${startDateOnly}&endDate=${endDateOnly}`
      );
      onSection?.("paymentMethodCount", {
        paymentMethodCounts: res.data || res || {},
        errors: {},
      });
    } catch (err) {
      onError?.("paymentMethodCount", err);
      onSection?.("paymentMethodCount", {
        paymentMethodCounts: {},
        errors: { paymentMethodCount: "Failed to load payment methods" },
      });
    } finally {
      done();
    }
  };

  loadAdSpend();
  loadSalesBundle();
  loadInventory();
  loadPayment();
  })();

  return () => {};
}

export async function fetchDashboardMetrics(apiClient, options) {
  const {
    isToday,
    startDateOnly,
    endDateOnly,
    startDateTime,
    endDateTime,
  } = options;

  const params = isToday
    ? { startDate: startDateOnly, endDate: endDateOnly }
    : { startDateTime, endDateTime };

  try {
    const response = await apiClient.get("/api/dashboard/metrics", { params });
    if (response?.data?.adSpend || response?.data?.sales || response?.data?.source) {
      const data = response.data;
      return {
        ...data,
        orderCount: normalizeOrderCountPayload(data.orderCount),
        inventoryEvents: mapInventoryPayload(data.inventoryEvents),
      };
    }
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      throw err;
    }
    console.warn(
      "[dashboardMetrics] Bundle endpoint failed, using legacy APIs:",
      err?.response?.status || err?.message
    );
  }

  if (isToday) {
    return fetchTodayLegacy(apiClient, startDateOnly, endDateOnly);
  }

  return fetchHistoricalLegacy(
    apiClient,
    startDateTime,
    endDateTime,
    startDateOnly,
    endDateOnly
  );
}

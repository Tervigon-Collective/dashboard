"use client";

import { useEffect, useMemo, useState } from "react";
import { DateRangePicker, CustomProvider } from "rsuite";
import enUS from "rsuite/locales/en_US";
import "rsuite/dist/rsuite.min.css";
import MasterLayout from "@/masterLayout/MasterLayout";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import {
  createVariableOpsCost,
  getFixedCostByMonth,
  getLatestVariableOpsCost,
  getPnlSummary,
  toExclusiveEndDate,
  upsertFixedCostByMonth,
  updateVariableOpsCost,
} from "@/services/pnlForecastApi";

const VARIABLE_FIELDS = [
  { key: "shippingPartnerCost", label: "Shipping Partner Cost" },
  { key: "gatewayCharges", label: "Gateway Charges" },
  { key: "marketplaceCommission", label: "Marketplace Commission" },
  { key: "amazonShippingCharges", label: "Amazon Shipping Charges" },
  { key: "petfedEventExpense", label: "PetFed / Event Expense" },
  { key: "creativeProductionCost", label: "Creative Production Cost" },
  { key: "foodTreatLaunchCost", label: "Food & Treat Launch Cost" },
  { key: "retailerSchemesSampling", label: "Retailer Schemes / Sampling" },
  { key: "chinaTravelExpense", label: "China Travel Expense" },
];

const EMPTY_FORM = VARIABLE_FIELDS.reduce((acc, field) => {
  acc[field.key] = "";
  return acc;
}, {});

const FIXED_FIELDS = [
  { key: "salaryExpense", api: "salary_expense", label: "Salary Expense" },
  {
    key: "offlineHiringIncrementalCost",
    api: "offline_hiring_incremental_cost",
    label: "Offline Hiring Incremental Cost",
  },
  { key: "rentExpense", api: "rent_expense", label: "Rent Expense" },
  {
    key: "electricityCharges",
    api: "electricity_charges",
    label: "Electricity Charges",
  },
  { key: "staffWelfare", api: "staff_welfare", label: "Staff Welfare" },
  {
    key: "shopifyExpenses10Store",
    api: "shopify_expenses_10_store",
    label: "Shopify Expenses (10 Store)",
  },
  {
    key: "subscriptionsTools",
    api: "subscriptions_tools",
    label: "Subscriptions / Tools",
  },
  {
    key: "otherAdminLegalOffice",
    api: "other_admin_legal_office",
    label: "Other Admin / Legal / Office",
  },
  {
    key: "crmWhatsappRetentionTools",
    api: "crm_whatsapp_retention_tools",
    label: "CRM / WhatsApp / Retention Tools",
  },
  {
    key: "auditAccountingCompliance",
    api: "audit_accounting_compliance",
    label: "Audit / Accounting / Compliance",
  },
  {
    key: "mumbai3plWarehouseCost",
    api: "mumbai_3pl_warehouse_cost",
    label: "Mumbai 3PL / Warehouse Cost",
  },
  {
    key: "professionalCharges",
    api: "professional_charges",
    label: "Professional Charges",
  },
  {
    key: "securityGuardCharges",
    api: "security_guard_charges",
    label: "Security Guard Charges",
  },
  {
    key: "contingencyBuffer",
    api: "contingency_buffer",
    label: "Contingency Buffer",
  },
];

const EMPTY_FIXED_FORM = FIXED_FIELDS.reduce((acc, field) => {
  acc[field.key] = "";
  return acc;
}, {});

function formatCurrency(value) {
  const numberValue = Number(value || 0);
  return `Rs. ${numberValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value) {
  const numberValue = Number(value || 0);
  return `${numberValue.toFixed(2)}%`;
}

function toInputNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateOnly(date) {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultDateRange() {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(0, 0, 0, 0);
  return [startOfDay, endOfDay];
}

export default function PnlForecastPage() {
  const [dateRange, setDateRange] = useState(() => getDefaultDateRange());
  const [summary, setSummary] = useState(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [variableRowId, setVariableRowId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingFixed, setSavingFixed] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isVariableModalOpen, setIsVariableModalOpen] = useState(false);
  const [fixedFormValues, setFixedFormValues] = useState(EMPTY_FIXED_FORM);

  const startDate = useMemo(
    () => (dateRange?.[0] ? formatDateOnly(dateRange[0]) : null),
    [dateRange]
  );
  const endDate = useMemo(
    () => (dateRange?.[1] ? formatDateOnly(dateRange[1]) : null),
    [dateRange]
  );

  const selectedMonth = useMemo(() => startDate?.slice(0, 7), [startDate]);

  const refreshData = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError("");
    try {
      const [summaryData, latestVariable, monthlyFixedCost] = await Promise.all([
        getPnlSummary(startDate, endDate),
        getLatestVariableOpsCost(),
        getFixedCostByMonth(selectedMonth),
      ]);
      setSummary(summaryData);
      if (latestVariable) {
        setVariableRowId(latestVariable.id);
        setFormValues({
          shippingPartnerCost: latestVariable.shippingPartnerCost ?? "",
          gatewayCharges: latestVariable.gatewayCharges ?? "",
          marketplaceCommission: latestVariable.marketplaceCommission ?? "",
          amazonShippingCharges: latestVariable.amazonShippingCharges ?? "",
          petfedEventExpense: latestVariable.petfedEventExpense ?? "",
          creativeProductionCost: latestVariable.creativeProductionCost ?? "",
          foodTreatLaunchCost: latestVariable.foodTreatLaunchCost ?? "",
          retailerSchemesSampling: latestVariable.retailerSchemesSampling ?? "",
          chinaTravelExpense: latestVariable.chinaTravelExpense ?? "",
        });
      } else {
        setVariableRowId(null);
        setFormValues(EMPTY_FORM);
      }
      if (monthlyFixedCost) {
        setFixedFormValues({
          salaryExpense: monthlyFixedCost.salaryExpense ?? "",
          offlineHiringIncrementalCost:
            monthlyFixedCost.offlineHiringIncrementalCost ?? "",
          rentExpense: monthlyFixedCost.rentExpense ?? "",
          electricityCharges: monthlyFixedCost.electricityCharges ?? "",
          staffWelfare: monthlyFixedCost.staffWelfare ?? "",
          shopifyExpenses10Store: monthlyFixedCost.shopifyExpenses10Store ?? "",
          subscriptionsTools: monthlyFixedCost.subscriptionsTools ?? "",
          otherAdminLegalOffice: monthlyFixedCost.otherAdminLegalOffice ?? "",
          crmWhatsappRetentionTools: monthlyFixedCost.crmWhatsappRetentionTools ?? "",
          auditAccountingCompliance:
            monthlyFixedCost.auditAccountingCompliance ?? "",
          mumbai3plWarehouseCost: monthlyFixedCost.mumbai3plWarehouseCost ?? "",
          professionalCharges: monthlyFixedCost.professionalCharges ?? "",
          securityGuardCharges: monthlyFixedCost.securityGuardCharges ?? "",
          contingencyBuffer: monthlyFixedCost.contingencyBuffer ?? "",
        });
      } else {
        setFixedFormValues(EMPTY_FIXED_FORM);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load P&L data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!startDate || !endDate) return;
    refreshData();
  }, [startDate, endDate, selectedMonth]);

  const derived = useMemo(() => {
    if (!summary) {
      return {
        impactNetSales: 0,
        grossProfit: 0,
        grossMarginPct: 0,
        totalPerformanceMarketing: 0,
        totalVariableOpsCost: 0,
        contributionBeforeFixedCost: 0,
        contributionBeforeFixedCostPct: 0,
      };
    }

    const impactNetSales = Number(summary.impactNetSales || 0);
    const netSalesExclTax = Number(summary.netSalesExclTax || 0);
    const grossProfit = Number(summary.grossProfit || 0);
    const grossMarginPct = netSalesExclTax
      ? (grossProfit / netSalesExclTax) * 100
      : 0;
    const totalPerformanceMarketing =
      Number(summary.metaAdsCost || 0) + Number(summary.googleAdsCost || 0);

    const totalVariableOpsCost = VARIABLE_FIELDS.reduce(
      (sum, field) => sum + toInputNumber(formValues[field.key]),
      0
    );
    const contributionBeforeFixedCost =
      grossProfit - totalPerformanceMarketing - totalVariableOpsCost;
    const contributionBeforeFixedCostPct = netSalesExclTax
      ? (contributionBeforeFixedCost / netSalesExclTax) * 100
      : 0;

    return {
      impactNetSales,
      grossProfit,
      grossMarginPct,
      totalPerformanceMarketing,
      totalVariableOpsCost,
      contributionBeforeFixedCost,
      contributionBeforeFixedCostPct,
    };
  }, [summary, formValues]);

  const handleInputChange = (fieldKey, value) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const payload = {
        startDate,
        endDate: toExclusiveEndDate(endDate),
        shipping_partner_cost: toInputNumber(formValues.shippingPartnerCost),
        gateway_charges: toInputNumber(formValues.gatewayCharges),
        marketplace_commission: toInputNumber(formValues.marketplaceCommission),
        amazon_shipping_charges: toInputNumber(formValues.amazonShippingCharges),
        petfed_event_expense: toInputNumber(formValues.petfedEventExpense),
        creative_production_cost: toInputNumber(formValues.creativeProductionCost),
        food_treat_launch_cost: toInputNumber(formValues.foodTreatLaunchCost),
        retailer_schemes_sampling: toInputNumber(formValues.retailerSchemesSampling),
        china_travel_expense: toInputNumber(formValues.chinaTravelExpense),
      };

      const saved = variableRowId
        ? await updateVariableOpsCost(variableRowId, payload)
        : await createVariableOpsCost(payload);

      if (saved?.id) {
        setVariableRowId(saved.id);
      }
      setSuccessMessage("Variable Ops Cost saved successfully.");
      setIsVariableModalOpen(false);
      await refreshData();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save Variable Ops Cost.");
    } finally {
      setSaving(false);
    }
  };

  const fixedDerived = useMemo(() => {
    const operatingExpensesBeforeContingency = FIXED_FIELDS.filter(
      (field) => field.key !== "contingencyBuffer"
    ).reduce((sum, field) => sum + toInputNumber(fixedFormValues[field.key]), 0);
    const totalFixedOperatingExpenses =
      operatingExpensesBeforeContingency +
      toInputNumber(fixedFormValues.contingencyBuffer);
    return { operatingExpensesBeforeContingency, totalFixedOperatingExpenses };
  }, [fixedFormValues]);

  const handleFixedInputChange = (fieldKey, value) => {
    setFixedFormValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const handleSaveFixed = async () => {
    setSavingFixed(true);
    setError("");
    setSuccessMessage("");
    try {
      const payload = { month: selectedMonth };
      FIXED_FIELDS.forEach((field) => {
        payload[field.api] = toInputNumber(fixedFormValues[field.key]);
      });
      await upsertFixedCostByMonth(payload);
      setSuccessMessage(`Fixed Cost saved for ${selectedMonth}.`);
      await refreshData();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save Fixed Cost.");
    } finally {
      setSavingFixed(false);
    }
  };

  return (
    <SidebarPermissionGuard requiredSidebar="pnlForecast">
      <CustomProvider locale={enUS}>
        <MasterLayout>
          <div className="d-flex flex-column gap-3">
            <div className="card basic-data-table">
              <div className="card-body">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                  <h5 className="mb-0">P &amp; L Forecast</h5>
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    format="yyyy-MM-dd"
                    showMeridian={false}
                    ranges={[]}
                    defaultCalendarValue={getDefaultDateRange()}
                    disabledDate={(date) => {
                      const now = new Date();
                      now.setHours(0, 0, 0, 0);
                      const d = new Date(date);
                      d.setHours(0, 0, 0, 0);
                      return d > now;
                    }}
                    placeholder="Select date range"
                    style={{
                      width: 300,
                      borderRadius: 8,
                      border: "1px solid #ccc",
                      fontSize: 16,
                    }}
                    appearance="subtle"
                    cleanable
                    menuStyle={{
                      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                      borderRadius: 8,
                      padding: 8,
                    }}
                    placement="bottomEnd"
                    oneTap={false}
                  />
                </div>

              {error && <div className="alert alert-danger py-2">{error}</div>}
              {successMessage && (
                <div className="alert alert-success py-2">{successMessage}</div>
              )}
              {loading && (
                <p className="mb-0 text-secondary-light">Loading data...</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h6 className="mb-3">Metrics</h6>
              <div className="row g-3">
                <div className="col-md-3">
                  <strong>Gross Sales (ex-GST)</strong>
                  <div>{formatCurrency(summary?.grossSalesExclTax)}</div>
                </div>
                <div className="col-md-3">
                  <strong>Discount</strong>
                  <div>{formatCurrency(summary?.discounts)}</div>
                </div>
                <div className="col-md-3">
                  <strong>Returns</strong>
                  <div>{formatCurrency(summary?.returns)}</div>
                </div>
                <div className="col-md-3">
                  <strong>Cancelled</strong>
                  <div>{formatCurrency(summary?.cancelled)}</div>
                </div>
                <div className="col-md-3">
                  <strong>Net Sales (ex-GST)</strong>
                  <div>{formatCurrency(summary?.netSalesExclTax)}</div>
                </div>
                <div className="col-md-3">
                  <strong>Taxes (18% on net sales)</strong>
                  <div>{formatCurrency(summary?.taxes)}</div>
                </div>
                <div className="col-md-3">
                  <strong>Impact Net Sales</strong>
                  <div>{formatCurrency(derived.impactNetSales)}</div>
                </div>
                <div className="col-md-3">
                  <strong>COGS</strong>
                  <div>{formatCurrency(summary?.cogs)}</div>
                </div>
                <div className="col-md-3">
                  <strong>Packaging Cost</strong>
                  <div>{formatCurrency(summary?.packagingCost)}</div>
                </div>
                <div className="col-md-3">
                  <strong>Shipping Cost (Courier)</strong>
                  <div>{formatCurrency(summary?.shippingCost)}</div>
                </div>
                <div className="col-md-3">
                  <strong>Payment Gateway Fees</strong>
                  <div>{formatCurrency(summary?.paymentGatewayFees)}</div>
                </div>
                <div className="col-md-3">
                  <strong>RTO Logistics Cost</strong>
                  <div>{formatCurrency(summary?.rtoLogisticsCost)}</div>
                </div>
                <div className="col-md-3">
                  <strong>Total Operating Cost</strong>
                  <div>{formatCurrency(summary?.totalOperatingCost)}</div>
                </div>
                <div className="col-md-3">
                  <strong>Gross Profit</strong>
                  <div>{formatCurrency(derived.grossProfit)}</div>
                </div>
                <div className="col-md-3">
                  <strong>Gross Margin %</strong>
                  <div>{formatPercent(derived.grossMarginPct)}</div>
                </div>
                <div className="col-md-3">
                  <strong>Total Sales (incl. GST)</strong>
                  <div>{formatCurrency(summary?.totalSales)}</div>
                </div>
                <div className="col-md-3">
                  <strong>Net Sales (cash)</strong>
                  <div>{formatCurrency(summary?.netSales)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h6 className="mb-3">Marketing &amp; Sales</h6>
              <div className="row g-3">
                <div className="col-md-4">
                  <strong>Meta Ads</strong>
                  <div>{formatCurrency(summary?.metaAdsCost)}</div>
                </div>
                <div className="col-md-4">
                  <strong>Google Ads</strong>
                  <div>{formatCurrency(summary?.googleAdsCost)}</div>
                </div>
                <div className="col-md-4">
                  <strong>Total Performance Marketing</strong>
                  <div>{formatCurrency(derived.totalPerformanceMarketing)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">Variable Ops Cost</h6>
                <button
                  type="button"
                  className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                  onClick={() => setIsVariableModalOpen(true)}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
                  <span>{variableRowId ? "Edit" : "Add"}</span>
                </button>
              </div>
              <div className="row g-3">
                {VARIABLE_FIELDS.map((field) => (
                  <div className="col-md-4" key={field.key}>
                    <label className="form-label">{field.label}</label>
                    <div className="fw-semibold text-dark">
                      {formatCurrency(formValues[field.key])}
                    </div>
                  </div>
                ))}
                <div className="col-md-4">
                  <label className="form-label">Total Variable Ops Cost</label>
                  <div className="fw-semibold text-dark">
                    {formatCurrency(derived.totalVariableOpsCost)}
                  </div>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Contribution Before Fixed Cost</label>
                  <div className="fw-semibold text-dark">
                    {formatCurrency(derived.contributionBeforeFixedCost)}
                  </div>
                </div>
                <div className="col-md-4">
                  <label className="form-label">
                    Contribution Before Fixed Cost %
                  </label>
                  <div className="fw-semibold text-dark">
                    {formatPercent(derived.contributionBeforeFixedCostPct)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h6 className="mb-3">Fixed Cost ({selectedMonth})</h6>
              <div className="row g-3">
                {FIXED_FIELDS.map((field) => (
                  <div className="col-md-4" key={field.key}>
                    <label className="form-label">{field.label}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control"
                      value={fixedFormValues[field.key]}
                      onChange={(e) =>
                        handleFixedInputChange(field.key, e.target.value)
                      }
                    />
                  </div>
                ))}
                <div className="col-md-4">
                  <label className="form-label">
                    Operating Expenses Before Contingency
                  </label>
                  <input
                    className="form-control"
                    value={formatCurrency(
                      fixedDerived.operatingExpensesBeforeContingency
                    )}
                    readOnly
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Total Fixed / Operating Expenses</label>
                  <input
                    className="form-control"
                    value={formatCurrency(fixedDerived.totalFixedOperatingExpenses)}
                    readOnly
                  />
                </div>
              </div>

              <div className="mt-3 d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveFixed}
                  disabled={savingFixed || loading}
                >
                  {savingFixed ? "Saving..." : `Save Fixed Cost (${selectedMonth})`}
                </button>
              </div>
            </div>
          </div>
        </div>

        {isVariableModalOpen && (
          <>
            <div
              className="modal fade show"
              style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
              tabIndex="-1"
              role="dialog"
              aria-modal="true"
            >
              <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      {variableRowId ? "Edit" : "Add"} Variable Ops Cost
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setIsVariableModalOpen(false)}
                      aria-label="Close"
                    />
                  </div>
                  <div className="modal-body">
                    <div className="row g-3">
                      {VARIABLE_FIELDS.map((field) => (
                        <div className="col-md-6" key={field.key}>
                          <label className="form-label">{field.label}</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-control"
                            value={formValues[field.key]}
                            onChange={(e) =>
                              handleInputChange(field.key, e.target.value)
                            }
                          />
                        </div>
                      ))}
                      <div className="col-md-4">
                        <label className="form-label">Total Variable Ops Cost</label>
                        <input
                          className="form-control"
                          value={formatCurrency(derived.totalVariableOpsCost)}
                          readOnly
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Contribution Before Fixed Cost
                        </label>
                        <input
                          className="form-control"
                          value={formatCurrency(derived.contributionBeforeFixedCost)}
                          readOnly
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Contribution Before Fixed Cost %
                        </label>
                        <input
                          className="form-control"
                          value={formatPercent(derived.contributionBeforeFixedCostPct)}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsVariableModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSave}
                      disabled={saving || loading}
                    >
                      {saving ? "Saving..." : variableRowId ? "Update" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show" />
          </>
        )}
        </MasterLayout>
      </CustomProvider>
    </SidebarPermissionGuard>
  );
}

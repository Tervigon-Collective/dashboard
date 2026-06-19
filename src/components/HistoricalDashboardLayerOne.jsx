"use client";

import React, { useMemo, useState } from "react";
import { DateRangePicker, CustomProvider } from "rsuite";
import enUS from "rsuite/locales/en_US";
import "rsuite/dist/rsuite.min.css";
import UnitCountOne from "./child/UnitCountOne";
import DashboardRefreshButton from "./dashboard/DashboardRefreshButton";
import { useDashboardRefresh } from "@/hooks/dashboard/useDashboardRefresh";
import {
  buildDashboardMetricsParams,
  getDefaultHistoricalDateRange,
  getHistoricalPickerPresets,
  getIstHourNow,
  getIstTodayDate,
  isAfterIstToday,
  isSameIstDay,
} from "@/hooks/dashboard/dateRangeUtils";

function formatLocalISO(date) {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}`;
}

const MAX_SECTIONS = 10;
const PICKER_PRESETS = getHistoricalPickerPresets();

const Section = ({ dateRange, setDateRange }) => {
  const { refreshAll, refreshMetrics } = useDashboardRefresh();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pickerValue = useMemo(() => {
    if (Array.isArray(dateRange) && dateRange[0] && dateRange[1]) {
      return dateRange;
    }
    return getDefaultHistoricalDateRange();
  }, [dateRange]);

  const isoRange = useMemo(
    () => ({
      startDate: pickerValue[0] ? formatLocalISO(pickerValue[0]) : null,
      endDate: pickerValue[1] ? formatLocalISO(pickerValue[1]) : null,
    }),
    [pickerValue]
  );

  const metricsParams = useMemo(
    () => buildDashboardMetricsParams(isoRange, { historicalMode: true }),
    [isoRange?.startDate, isoRange?.endDate]
  );

  const handlePickerChange = (range) => {
    if (!range || !range[0] || !range[1]) {
      setDateRange(getDefaultHistoricalDateRange());
      return;
    }
    setDateRange(range);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshMetrics(metricsParams);
      await refreshAll();
    } finally {
      setIsRefreshing(false);
    }
  };

  const shouldDisableHour = (hour, date) => {
    if (!date || isAfterIstToday(date)) return true;
    if (!isSameIstDay(date, getIstTodayDate())) return false;
    return hour > getIstHourNow();
  };

  return (
    <>
      <div className="d-flex justify-content-end align-items-center flex-wrap gap-2 mb-3 w-100 position-relative">
        <div style={{ position: "relative", zIndex: 20 }}>
          <DateRangePicker
            value={pickerValue}
            onChange={handlePickerChange}
            onOk={handlePickerChange}
            format="yyyy-MM-dd HH:00"
            showMeridian={false}
            ranges={PICKER_PRESETS}
            defaultCalendarValue={getDefaultHistoricalDateRange()}
            editable={false}
            disabledDate={isAfterIstToday}
            shouldDisableHour={shouldDisableHour}
            placeholder="Select date and hour range"
            style={{
              width: "min(100%, 360px)",
              borderRadius: 8,
              border: "1px solid #ccc",
              fontSize: 16,
            }}
            appearance="subtle"
            cleanable={false}
            container={() =>
              typeof document !== "undefined" ? document.body : null
            }
            menuStyle={{
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              borderRadius: 8,
              padding: 8,
              zIndex: 9999,
            }}
            placement="bottomEnd"
            oneTap={false}
            block
          />
        </div>
        <DashboardRefreshButton
          onRefresh={handleRefresh}
          isFetching={isRefreshing}
          label="Refresh section"
          className="mb-0"
        />
      </div>
      <UnitCountOne
        dateRange={isoRange}
        showRefresh={false}
        historicalMode
      />
    </>
  );
};

const HistoricalDashBoardLayerOne = () => {
  const [sections, setSections] = useState([
    { dateRange: getDefaultHistoricalDateRange() },
  ]);

  const setSectionDateRange = (idx, value) => {
    setSections((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], dateRange: value };
      return updated;
    });
  };

  const addSection = () => {
    if (sections.length < MAX_SECTIONS) {
      setSections((prev) => [
        ...prev,
        { dateRange: getDefaultHistoricalDateRange() },
      ]);
    }
  };

  return (
    <CustomProvider locale={enUS}>
      <div>
        {sections.map((section, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: 32,
              border: "1px solid #eee",
              borderRadius: 8,
              padding: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              background: "#fff",
              overflow: "visible",
            }}
          >
            <Section
              dateRange={section.dateRange}
              setDateRange={(val) => setSectionDateRange(idx, val)}
            />
          </div>
        ))}
        <div
          className="d-flex align-items-center justify-content-center"
          style={{ margin: "32px 0 0 0", gap: 16 }}
        >
          <hr style={{ flex: 1, borderTop: "2px solid #bbb" }} />
          {sections.length < MAX_SECTIONS && (
            <button
              className="btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background:
                  "linear-gradient(90deg, #4e54c8 0%, #8f94fb 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 24,
                boxShadow: "0 2px 8px rgba(78,84,200,0.15)",
                fontWeight: 600,
                fontSize: 18,
                padding: "8px 20px",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onClick={addSection}
              aria-label="Add comparison section"
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)",
                  marginRight: 6,
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                +
              </span>
              Add Comparison
            </button>
          )}
          <hr style={{ flex: 1, borderTop: "2px solid #bbb" }} />
        </div>
      </div>
    </CustomProvider>
  );
};

export default HistoricalDashBoardLayerOne;

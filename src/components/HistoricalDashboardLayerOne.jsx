"use client";
import React, { useState, useEffect } from "react";
import { DateRangePicker, CustomProvider } from 'rsuite';
import enUS from 'rsuite/locales/en_US';
import 'rsuite/dist/rsuite.min.css';
import UnitCountOne from "./child/UnitCountOne";

// Helper to format date as yyyy-mm-dd HH
function formatLocalISO(date) {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}`;
}

// Get today's date for default calendar value
const getDefaultDateRange = () => {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 0, 0, 0);
  return [startOfDay, endOfDay];
};

const MAX_SECTIONS = 10;

const Section = ({ dateRange, setDateRange }) => {
  const [value, setValue] = useState(dateRange);

  useEffect(() => {
    setValue(dateRange);
  }, [dateRange]);

  const handleChange = (range) => {
    setValue(range);
    setDateRange(range);
  };

  const isoRange = {
    startDate: value && value[0] ? formatLocalISO(value[0]) : null,
    endDate: value && value[1] ? formatLocalISO(value[1]) : null,
  };

  return (
    <>
      <div className="d-flex justify-content-end mb-3 align-items-center" style={{ gap: 8 }}>
        <DateRangePicker
          value={value}
          onChange={handleChange}
          format="yyyy-MM-dd HH:00"
          showMeridian={false}
          ranges={[]}
          defaultCalendarValue={getDefaultDateRange()}
          disabledDate={date => {
            const now = new Date();
            // Remove minutes and seconds for comparison
            now.setMinutes(0, 0, 0);
            const d = new Date(date);
            d.setMinutes(0, 0, 0);
            // Disable future dates
            return d > now;
          }}
          placeholder="Select date and hour range"
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
      <UnitCountOne dateRange={isoRange} />
    </>
  );
};

const HistoricalDashBoardLayerOne = () => {
  const [sections, setSections] = useState([
    { dateRange: null }
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
        { dateRange: null }
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
              background: "#fff"
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

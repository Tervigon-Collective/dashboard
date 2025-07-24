"use client";
import React, { useState, useEffect, useMemo } from "react";
import { DateRangePicker, CustomProvider } from 'rsuite';
import enUS from 'rsuite/locales/en_US';
import 'rsuite/dist/rsuite.min.css';

const API_BASE = "https://skuspendsales-aghtewckaqbdfqep.centralindia-01.azurewebsites.net/api/product_spend";
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function formatLocalISO(date) {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}`;
}

function getDefaultDateRange() {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 0, 0, 0);
  return [startOfDay, endOfDay];
}

const ProductSpendSummaryLayer = () => {
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);

  const fetchSummary = async (range) => {
    setLoading(true);
    setError("");
    setSummary([]);
    const start_datetime = formatLocalISO(range[0]);
    const end_datetime = formatLocalISO(range[1]);
    try {
      const url = `${API_BASE}?start_datetime=${encodeURIComponent(start_datetime)}&end_datetime=${encodeURIComponent(end_datetime)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = await res.json();
      setSummary(data.summary_by_title || []);
    } catch (err) {
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      fetchSummary(dateRange);
      setCurrentPage(1); // Reset to first page on date change
    }
  }, [dateRange]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page on items per page change
  }, [itemsPerPage]);

  // Sort summary by total_quantity_sold descending
  const sortedSummary = useMemo(() => {
    if (!summary) return [];
    return [...summary].sort((a, b) => (b.total_quantity_sold || 0) - (a.total_quantity_sold || 0));
  }, [summary]);

  // Pagination logic
  const totalPages = Math.ceil(sortedSummary.length / itemsPerPage);
  const pagedSummary = sortedSummary.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const maxQuantity = sortedSummary.length > 0 ? sortedSummary[0].total_quantity_sold : null;

  // Pagination controls
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };
  const goToPrevious = () => goToPage(currentPage - 1);
  const goToNext = () => goToPage(currentPage + 1);
  const getPaginationNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }
    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }
    rangeWithDots.push(...range);
    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }
    return rangeWithDots;
  };

  // Range text (e.g. Showing 1 to 10 of 37 entries)
  const startIdx = sortedSummary.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, sortedSummary.length);

  return (
    <CustomProvider locale={enUS}>
      <div className="mb-4">
        <h2 className="fw-bold mb-2" style={{letterSpacing: 1, fontSize: 28, color: '#4e54c8'}}>Product Spend Dashboard</h2>
      </div>
      <div className="card basic-data-table border-0 rounded-4 overflow-hidden">
        <div className="card-body">
          <div className="row mb-3 align-items-center">
            <div className="col-md-6 d-flex align-items-center" style={{gap: 12}}>
              <label className="me-2 fw-semibold">Show</label>
              <select
                className="form-select form-select-sm"
                style={{ width: 80, borderRadius: 6 }}
                value={itemsPerPage}
                onChange={e => setItemsPerPage(Number(e.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <label className="ms-2">entries</label>
            </div>
            <div className="col-md-6 d-flex justify-content-end align-items-center" style={{gap: 12}}>
              <label htmlFor="date-range-picker" className="form-label mb-0 fw-semibold">Select Date & Hour Range:</label>
              <DateRangePicker
                id="date-range-picker"
                value={dateRange}
                onChange={setDateRange}
                format="yyyy-MM-dd HH:00"
                showMeridian={false}
                ranges={[]}
                defaultCalendarValue={getDefaultDateRange()}
                disabledDate={date => {
                  const now = new Date();
                  now.setMinutes(0, 0, 0);
                  const d = new Date(date);
                  d.setMinutes(0, 0, 0);
                  return d > now;
                }}
                placeholder="Select date and hour range"
                style={{ width: 320, borderRadius: 8, border: "1px solid #ccc", fontSize: 16 }}
                appearance="subtle"
                cleanable
                menuStyle={{ boxShadow: "0 8px 24px rgba(0,0,0,0.2)", borderRadius: 8, padding: 8 }}
                placement="bottomEnd"
                oneTap={false}
              />
            </div>
          </div>
          <div className="mb-2 text-muted" style={{fontSize: 14}}>
            Showing {startIdx} to {endIdx} of {sortedSummary.length} entries
          </div>
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle rounded-4 overflow-hidden" style={{borderRadius: 16, boxShadow: '0 2px 12px rgba(78,84,200,0.07)'}}>
              <thead className="table-light rounded-4">
                <tr style={{fontWeight: 700, fontSize: 16}}>
                  <th style={{minWidth: 220}}>Product Title</th>
                  <th style={{minWidth: 120}}>Meta Ad Spend</th>
                  <th style={{minWidth: 120}}>Total Quantity Sold</th>
                  <th style={{minWidth: 140}}>Total Sales Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-4">Loading...</td></tr>
                ) : error ? (
                  <tr><td colSpan={4} className="text-center text-danger py-4">{error}</td></tr>
                ) : pagedSummary.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-4">No data found for this range.</td></tr>
                ) : pagedSummary.map((row, idx) => {
                  const isTop = row.total_quantity_sold === maxQuantity && maxQuantity > 0 && (currentPage === 1 && idx === 0);
                  return (
                    <tr key={row.product_title + idx} className={isTop ? "table-success" : ""} style={isTop ? {fontWeight: 700, fontSize: 16, background: 'linear-gradient(90deg, #e0eafc 0%, #cfdef3 100%)'} : {}}>
                      <td>
                        {row.product_title}
                        {isTop && <span className="badge bg-success ms-2" style={{fontSize: 13, verticalAlign: 'middle'}}>Top Seller</span>}
                      </td>
                      <td>₹{Number(row.total_ad_spend).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={isTop ? {color: '#388e3c', fontWeight: 800, fontSize: 18} : {}}>{row.total_quantity_sold}</td>
                      <td>₹{Number(row.total_sales_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-end align-items-center mt-3">
              <ul className="pagination pagination-sm mb-0" style={{gap: 2}}>
                <li className={`page-item${currentPage === 1 ? ' disabled' : ''}`}>
                  <button className="page-link" onClick={goToPrevious} disabled={currentPage === 1}>Previous</button>
                </li>
                {getPaginationNumbers().map((number, idx) => (
                  <li key={idx} className={`page-item${number === currentPage ? ' active' : ''} ${number === '...' ? 'disabled' : ''}`}>
                    {number === '...' ? (
                      <span className="page-link">...</span>
                    ) : (
                      <button className="page-link" onClick={() => goToPage(number)}>{number}</button>
                    )}
                  </li>
                ))}
                <li className={`page-item${currentPage === totalPages ? ' disabled' : ''}`}>
                  <button className="page-link" onClick={goToNext} disabled={currentPage === totalPages}>Next</button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </CustomProvider>
  );
};

export default ProductSpendSummaryLayer;

'use client'
import React, { useEffect, useState, useMemo } from 'react'
import { Icon } from '@iconify/react';
import config from '../../config';
import axios from 'axios';

// Utility to get today's date in YYYY-MM-DD format
const getToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// Helper to check if a date range is today
const isTodayRange = (start, end) => {
    const today = getToday();
    return start === today && end === today;
};

const UnitCountOne = ({ dateRange }) => {
    const [adSpend, setAdSpend] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState({}); // error per card
    const [googleSpend, setGoogleSpend] = useState(null);
    const [facebookSpend, setFacebookSpend] = useState(null);
    const [totalCogs, setTotalCogs] = useState(null);
    const [googleCogs, setGoogleCogs] = useState(null);
    const [metaCogs, setMetaCogs] = useState(null);
    const [totalSales, setTotalSales] = useState(null);
    const [googleSales, setGoogleSales] = useState(null);
    const [metaSales, setMetaSales] = useState(null);
    const [organicSales, setOrganicSales] = useState(null);
    const [totalNetProfit, setTotalNetProfit] = useState(null);
    const [googleNetProfit, setGoogleNetProfit] = useState(null);
    const [metaNetProfit, setMetaNetProfit] = useState(null);
    const [totalQuantity, setTotalQuantity] = useState(null);
    const [googleQuantity, setGoogleQuantity] = useState(null);
    const [metaQuantity, setMetaQuantity] = useState(null);
    const [organicQuantity, setOrganicQuantity] = useState(null);
    const [grossRoas, setGrossRoas] = useState({ total: null, google: null, meta: null });
    const [netRoas, setNetRoas] = useState({ total: null, google: null, meta: null });
    const [beRoas, setBeRoas] = useState({ total: null, google: null, meta: null });

    // Helper to sort breakdowns by value descending
    const sortBreakdown = (arr) => arr.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    // Helper for consistent card content
    const getCardContent = (value, loading, error, formatter = (v) => v) => {
        if (loading) return <span className="text-muted"><span className="spinner-border spinner-border-sm me-1" /> Loading...</span>;
        if (error) return (
            <span className="text-danger d-flex align-items-center gap-1 small fw-semibold" style={{lineHeight: 1.2, maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                <Icon icon="mdi:alert-circle" className="me-1" style={{fontSize: 16}} />
                Failed to load data
            </span>
        );
        if (value === null || value === undefined) return <span className="text-muted">—</span>;
        return formatter(value);
    };

    // Memoize the effective date range
    const effectiveDateRange = useMemo(() => {
        const today = getToday();
        return {
            startDate: dateRange?.startDate || today,
            endDate: dateRange?.endDate || today
        };
    }, [dateRange?.startDate, dateRange?.endDate]);

    useEffect(() => {
        setLoading(true);
        setError({});
        setAdSpend(null);
        setGoogleSpend(null);
        setFacebookSpend(null);
        setTotalCogs(null);
        setGoogleCogs(null);
        setMetaCogs(null);
        setTotalSales(null);
        setGoogleSales(null);
        setMetaSales(null);
        setOrganicSales(null);
        setTotalNetProfit(null);
        setGoogleNetProfit(null);
        setMetaNetProfit(null);
        setTotalQuantity(null);
        setGoogleQuantity(null);
        setMetaQuantity(null);
        setOrganicQuantity(null);
        setGrossRoas({ total: null, google: null, meta: null });
        setNetRoas({ total: null, google: null, meta: null });
        setBeRoas({ total: null, google: null, meta: null });

        const { startDate, endDate } = effectiveDateRange;
        const today = getToday();
        const useTodayApi = isTodayRange(startDate, endDate);

        if (useTodayApi) {
            // Use existing GET endpoints for today
            let query = '';
            if (startDate && endDate) {
                query = `?startDate=${startDate}&endDate=${endDate}`;
            }
            Promise.allSettled([
                axios.get(`${config.api.baseURL}/api/ad_spend${query}`),
                axios.get(`${config.api.baseURL}/api/cogs${query}`),
                axios.get(`${config.api.baseURL}/api/sales${query}`),
                axios.get(`${config.api.baseURL}/api/net_profit${query}`),
                axios.get(`${config.api.baseURL}/api/order_count${query}`),
                axios.get(`${config.api.baseURL}/api/roas${query}`)
            ]).then((results) => {
                // ad_spend
                if (results[0].status === 'fulfilled') {
                    setAdSpend(results[0].value.data.totalSpend ?? null);
                    setGoogleSpend(results[0].value.data.googleSpend ?? null);
                    setFacebookSpend(results[0].value.data.facebookSpend ?? null);
                } else {
                    setError(e => ({ ...e, adSpend: 'Failed to load data' }));
                }
                // cogs
                if (results[1].status === 'fulfilled') {
                    setTotalCogs(results[1].value.data.totalCogs ?? null);
                    setGoogleCogs(results[1].value.data.googleCogs ?? null);
                    setMetaCogs(results[1].value.data.metaCogs ?? null);
                } else {
                    setError(e => ({ ...e, cogs: 'Failed to load data' }));
                }
                // sales
                if (results[2].status === 'fulfilled') {
                    setTotalSales(results[2].value.data.totalSales ?? null);
                    setGoogleSales(results[2].value.data.googleSales ?? null);
                    setMetaSales(results[2].value.data.metaSales ?? null);
                    setOrganicSales(results[2].value.data.organicSales ?? null);
                } else {
                    setError(e => ({ ...e, sales: 'Failed to load data' }));
                }
                // net_profit
                if (results[3].status === 'fulfilled') {
                    // No longer set totalNetProfit from API, use formula below
                    setGoogleNetProfit(results[3].value.data.googleNetProfit ?? null);
                    setMetaNetProfit(results[3].value.data.metaNetProfit ?? null);
                } else {
                    setError(e => ({ ...e, netProfit: 'Failed to load data' }));
                }
                // order_count
                if (results[4].status === 'fulfilled') {
                    setTotalQuantity(results[4].value.data.totalQuantity ?? null);
                    setGoogleQuantity(results[4].value.data.googleQuantity ?? null);
                    setMetaQuantity(results[4].value.data.metaQuantity ?? null);
                    setOrganicQuantity(results[4].value.data.organicQuantity ?? null);
                } else {
                    setError(e => ({ ...e, orderCount: 'Failed to load data' }));
                }
                // roas
                if (results[5].status === 'fulfilled') {
                    setGrossRoas({
                        total: results[5].value.data.total?.grossRoas ?? null,
                        google: results[5].value.data.google?.grossRoas ?? null,
                        meta: results[5].value.data.meta?.grossRoas ?? null
                    });
                    setNetRoas({
                        total: results[5].value.data.total?.netRoas ?? null,
                        google: results[5].value.data.google?.netRoas ?? null,
                        meta: results[5].value.data.meta?.netRoas ?? null
                    });
                    setBeRoas({
                        total: results[5].value.data.total?.beRoas ?? null,
                        google: results[5].value.data.google?.beRoas ?? null,
                        meta: results[5].value.data.meta?.beRoas ?? null
                    });
                } else {
                    setError(e => ({ ...e, roas: 'Failed to load data' }));
                }
                // Use correct net profit formula: total net profit = total sales - total cogs - total ad spend
                const totalSales = Number(results[2].status === 'fulfilled' ? results[2].value.data.totalSales ?? 0 : 0);
                const totalCogs = Number(results[1].status === 'fulfilled' ? results[1].value.data.totalCogs ?? 0 : 0);
                const totalAdSpend = Number(results[0].status === 'fulfilled' ? results[0].value.data.totalSpend ?? 0 : 0);
                setTotalNetProfit(totalSales - totalCogs - totalAdSpend);
                setLoading(false);
            });
        } else {
            // Use new POST endpoint for historical
            axios.post(
                `${config.api.baseURL}/api/historical_stats_by_date`,
                { startDate, endDate },
                { headers: { 'Content-Type': 'application/json' } }
            ).then((res) => {
                const data = res.data || {};
                // Top-level fields
                setTotalSales(data.totalRevenue ?? null);
                setTotalCogs(data.totalCogs ?? null);
                setTotalQuantity(data.totalQuantity ?? null);
                setAdSpend(data.adSpend?.totalSpend ?? null);
                setGoogleSpend(data.adSpend?.googleSpend ?? null);
                setFacebookSpend(data.adSpend?.facebookSpend ?? null);
                // Use correct net profit formula: total net profit = total sales - total cogs - total ad spend
                const totalSales = Number(data.totalRevenue ?? 0);
                const totalCogs = Number(data.totalCogs ?? 0);
                const totalAdSpend = Number(data.adSpend?.totalSpend ?? 0);
                setTotalNetProfit(totalSales - totalCogs - totalAdSpend);
                setGoogleNetProfit(data.google?.netProfit ?? null);
                setMetaNetProfit(data.meta?.netProfit ?? null);
                setGoogleCogs(data.google?.totalCogs ?? null);
                setMetaCogs(data.meta?.totalCogs ?? null);
                setGoogleSales(data.google?.totalRevenue ?? null);
                setMetaSales(data.meta?.totalRevenue ?? null);
                setOrganicSales(data.organic?.totalRevenue ?? null);
                setGoogleQuantity(data.google?.totalQuantity ?? null);
                setMetaQuantity(data.meta?.totalQuantity ?? null);
                setOrganicQuantity(data.organic?.totalQuantity ?? null);
                setGrossRoas({
                    total: data.totalGrossRoas ?? null,
                    google: data.google?.grossRoas ?? null,
                    meta: data.meta?.grossRoas ?? null
                });
                setNetRoas({
                    total: data.totalNetRoas ?? null,
                    google: data.google?.netRoas ?? null,
                    meta: data.meta?.netRoas ?? null
                });
                setBeRoas({
                    total: data.totalBeRoas ?? null,
                    google: data.google?.beRoas ?? null,
                    meta: data.meta?.beRoas ?? null
                });
                setLoading(false);
            }).catch((err) => {
                setError(e => ({ ...e, historical: 'Failed to load data' }));
                setLoading(false);
            });
        }
    }, [effectiveDateRange.startDate, effectiveDateRange.endDate]);

    return (
        <div className="row row-cols-xxxl-5 row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4">
            {/* Card 1: Net Profit (with Google & Meta breakdown) */}
            <div className="col">
                <div className="card shadow-none border bg-gradient-start-10 h-100 position-relative" style={{overflow: 'visible'}}>
                    <div className="card-body p-20">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                            <div>
                                <p className="fw-medium text-black mb-1">Net Profit</p>
                                <h6
                                  className="mb-0 display-6 fw-bold"
                                  style={{
                                    letterSpacing: '1px',
                                    color: totalNetProfit < 0 ? '#d32f2f' : '#388e3c'
                                  }}
                                >
                                  {getCardContent(totalNetProfit, loading, error.netProfit, v => `Rs.${Number(v).toFixed(2)}`)}
                                </h6>
                            </div>
                            <div className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                                 style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                                <Icon
                                    icon="mdi:cash"
                                    className="text-white text-2xl mb-0"
                                />
                            </div>
                        </div>
                        <div className="my-3" style={{height: '1px', background: 'linear-gradient(90deg, #43cea2 0%, #185a9d 100%)', opacity: 0.4}}></div>
                        <div className="d-flex flex-column align-items-center mt-2" style={{ gap: 4, marginTop: 8 }}>
                            {sortBreakdown([
                                { label: 'Google', icon: <Icon icon="logos:google-icon" style={{ fontSize: 20, minWidth: 40 }} />, value: googleNetProfit, color: googleNetProfit < 0 ? '#d32f2f' : '#388e3c', error: error.netProfit },
                                { label: 'Meta', icon: <Icon icon="logos:meta-icon" style={{ fontSize: 20, minWidth: 40 }} />, value: metaNetProfit, color: metaNetProfit < 0 ? '#d32f2f' : '#388e3c', error: error.netProfit }
                            ]).map((item, idx) => (
                                <div className="d-flex align-items-center" style={{ gap: 6, minWidth: 50 }} key={item.label}>
                                    {item.icon}
                                    <span className="fw-medium text-black mb-1" style={{ fontWeight: 600, fontSize: 14, color: '#222', minWidth: 78 }}>{item.label}</span>
                                    <span style={{ fontWeight: 600, fontSize: 15, minWidth: 90, color: item.color }}>{getCardContent(item.value, loading, item.error, v => `Rs.${Number(v).toFixed(2)}`)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* card end */}
            </div>
            {/* Card 2: Total Sales (with Google, Meta & Organic breakdown) */}
            <div className="col">
                <div className="card shadow-none border bg-gradient-start-8 h-100 position-relative" style={{overflow: 'visible'}}>
                    <div className="card-body p-20">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                            <div>
                                <p className="fw-medium text-black mb-1">Total Sales</p>
                                <h6 className="mb-0 display-6 fw-bold" style={{letterSpacing: '1px'}}>{getCardContent(totalSales, loading, error.sales, v => `Rs.${Number(v).toFixed(2)}`)}</h6>
                            </div>
                            <div className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                                 style={{background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'}}>
                                <Icon
                                    icon="mdi:cart"
                                    className="text-white text-2xl mb-0"
                                />
                            </div>
                        </div>
                        <div className="my-3" style={{height: '1px', background: 'linear-gradient(90deg, #43cea2 0%, #185a9d 100%)', opacity: 0.4}}></div>
                        <div className="d-flex flex-column align-items-center mt-2" style={{ gap: 4, marginTop: 8 }}>
                            {sortBreakdown([
                                { label: 'Google', icon: <Icon icon="logos:google-icon" style={{ fontSize: 20, minWidth: 40 }} />, value: googleSales, error: error.sales },
                                { label: 'Meta', icon: <Icon icon="logos:meta-icon" style={{ fontSize: 20, minWidth: 40 }} />, value: metaSales, error: error.sales },
                                { label: 'Organic', icon: <Icon icon="mdi:leaf" style={{ fontSize: 20, minWidth: 40, color: '#388e3c' }} />, value: organicSales, error: error.sales }
                            ]).map((item, idx) => (
                                <div className="d-flex align-items-center" style={{ gap: 6, minWidth: 50 }} key={item.label}>
                                    {item.icon}
                                    <span className="fw-medium text-black mb-1" style={{ fontWeight: 600, fontSize: 14, color: '#222', minWidth: 78 }}>{item.label}</span>
                                    <span style={{ fontWeight: 600, fontSize: 15, color: '#1976d2', minWidth: 90 }}>{getCardContent(item.value, loading, item.error, v => `Rs.${Number(v).toFixed(2)}`)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* card end */}
            </div>
            {/* Card 3: Total Ad Spend (with Google & Meta breakdown) */}
            <div className="col">
                <div className="card shadow-none border bg-gradient-start-6 h-100 interactive-adspend-card position-relative" style={{overflow: 'visible'}}>
                    <div className="card-body p-20">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                            <div>
                                <p className="fw-medium text-black mb-1">Total Ad Spend</p>
                                <h6 className="mb-0 display-6 fw-bold" style={{letterSpacing: '1px'}}>{getCardContent(adSpend, loading, error.adSpend, v => `Rs.${Number(v).toFixed(2)}`)}</h6>
                            </div>
                            <div className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                                 style={{background: 'linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)'}}>
                                <Icon
                                    icon="mdi:currency-usd"
                                    className="text-white text-2xl mb-0"
                                />
                            </div>
                        </div>
                        <div className="my-3" style={{height: '1px', background: 'linear-gradient(90deg, #f9d423 0%, #ff4e50 100%)', opacity: 0.4}}></div>
                        <div
                            className="d-flex flex-column align-items-center mt-2"
                            style={{ gap: 4, marginTop: 8 }}
                        >
                            {sortBreakdown([
                                { label: 'Google', icon: <Icon icon="logos:google-icon" style={{ fontSize: 20, minWidth: 40 }} />, value: googleSpend, error: error.adSpend },
                                { label: 'Meta', icon: <Icon icon="logos:meta-icon" style={{ fontSize: 20, minWidth: 40 }} />, value: facebookSpend, error: error.adSpend }
                            ]).map((item, idx) => (
                                <div className="d-flex align-items-center" style={{ gap: 6, minWidth: 50 }} key={item.label}>
                                    {item.icon}
                                    <span  className="fw-medium text-black mb-1" style={{ fontWeight: 600, fontSize: 14, color: '#222', minWidth: 78 }}>{item.label}</span>
                                    <span style={{ fontWeight: 600, fontSize: 15, color: '#1976d2', minWidth: 90 }}>{getCardContent(item.value, loading, item.error, v => `Rs.${Number(v).toFixed(2)}`)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* card end */}
            </div>
            {/* Card 4: Total COGS (with Google & Meta breakdown) */}
            <div className="col">
                <div className="card shadow-none border bg-gradient-start-7 h-100 position-relative" style={{overflow: 'visible'}}>
                    <div className="card-body p-20">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                            <div>
                                <p className="fw-medium text-black mb-1">Total COGS</p>
                                <h6 className="mb-0 display-6 fw-bold" style={{letterSpacing: '1px'}}>{getCardContent(totalCogs, loading, error.cogs, v => `Rs.${Number(v).toFixed(2)}`)}</h6>
                            </div>
                            <div className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                                 style={{background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)'}}>
                                <Icon
                                    icon="mdi:finance"
                                    className="text-white text-2xl mb-0"
                                />
                            </div>
                        </div>
                        <div className="my-3" style={{height: '1px', background: 'linear-gradient(90deg, #43cea2 0%, #185a9d 100%)', opacity: 0.4}}></div>
                        <div className="d-flex flex-column align-items-center mt-2" style={{ gap: 4, marginTop: 8 }}>
                            {sortBreakdown([
                                { label: 'Google', icon: <Icon icon="logos:google-icon" style={{ fontSize: 20, minWidth: 40 }} />, value: googleCogs, error: error.cogs },
                                { label: 'Meta', icon: <Icon icon="logos:meta-icon" style={{ fontSize: 20, minWidth: 40 }} />, value: metaCogs, error: error.cogs }
                            ]).map((item, idx) => (
                                <div className="d-flex align-items-center" style={{ gap: 6, minWidth: 50 }} key={item.label}>
                                    {item.icon}
                                    <span className="fw-medium text-black mb-1" style={{ fontWeight: 600, fontSize: 14, color: '#222', minWidth: 78 }}>{item.label}</span>
                                    <span style={{ fontWeight: 600, fontSize: 15, color: '#1976d2', minWidth: 90 }}>{getCardContent(item.value, loading, item.error, v => `Rs.${Number(v).toFixed(2)}`)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* card end */}
            </div>
            {/* Card 5: Total Orders (with Google, Meta & Organic breakdown) */}
            <div className="col">
                <div className="card shadow-none border h-100 position-relative"
                     style={{overflow: 'visible', color: '#222'}}>
                    <div className="card-body p-20">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                            <div>
                                <p className="fw-medium text-black mb-1">Total Orders</p>
                                <h6 className="mb-0 display-6 fw-bold" style={{letterSpacing: '1px'}}>{getCardContent(totalQuantity, loading, error.orderCount)}</h6>
                            </div>
                            <div className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                                 style={{background: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)'}}>
                                <Icon
                                    icon="mdi:package-variant-closed"
                                    className="text-white text-2xl mb-0"
                                />
                            </div>
                        </div>
                        <div className="my-3" style={{height: '1px', background: 'linear-gradient(90deg, #f7971e 0%, #ffd200 100%)', opacity: 0.4}}></div>
                        <div className="d-flex flex-column align-items-center mt-2" style={{ gap: 4, marginTop: 8 }}>
                            {sortBreakdown([
                                { label: 'Google', icon: <Icon icon="logos:google-icon" style={{ fontSize: 20, minWidth: 40 }} />, value: googleQuantity, error: error.orderCount },
                                { label: 'Meta', icon: <Icon icon="logos:meta-icon" style={{ fontSize: 20, minWidth: 40 }} />, value: metaQuantity, error: error.orderCount },
                                { label: 'Organic', icon: <Icon icon="mdi:leaf" style={{ fontSize: 20, minWidth: 40, color: '#388e3c' }} />, value: organicQuantity, error: error.orderCount }
                            ]).map((item, idx) => (
                                <div className="d-flex align-items-center" style={{ gap: 6, minWidth: 50 }} key={item.label}>
                                    {item.icon}
                                    <span className="fw-medium text-black mb-1" style={{ fontWeight: 600, fontSize: 14, color: '#222', minWidth: 78 }}>{item.label}</span>
                                    <span style={{ fontWeight: 600, fontSize: 15, color: '#1976d2', minWidth: 90 }}>{getCardContent(item.value, loading, item.error)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* card end */}
            </div>
            {/* Card 6: Gross ROAS (with Google & Meta breakdown) */}
            <div className="col">
                <div className="card shadow-none border bg-gradient-start-11 h-100 position-relative" style={{overflow: 'visible'}}>
                    <div className="card-body p-20">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                            <div>
                                <p className="fw-medium text-black mb-1">Gross ROAS</p>
                                <h6 className="mb-0 display-6 fw-bold" style={{letterSpacing: '1px'}}>{getCardContent(grossRoas.total, loading, error.roas, v => Number(v).toFixed(2))}</h6>
                            </div>
                            <div className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                                 style={{background: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)'}}>
                                <Icon
                                    icon="mdi:chart-bar"
                                    className="text-white text-2xl mb-0"
                                />
                            </div>
                        </div>
                        <div className="my-3" style={{height: '1px', background: 'linear-gradient(90deg, #f7971e 0%, #ffd200 100%)', opacity: 0.4}}></div>
                        <div className="d-flex flex-column align-items-center mt-2" style={{ gap: 4, marginTop: 8 }}>
                            {sortBreakdown([
                                { label: 'Google', icon: <Icon icon="logos:google-icon" style={{ fontSize: 20, minWidth: 40 }} />, value: grossRoas.google, error: error.roas },
                                { label: 'Meta', icon: <Icon icon="logos:meta-icon" style={{ fontSize: 20, minWidth: 40 }} />, value: grossRoas.meta, error: error.roas }
                            ]).map((item, idx) => (
                                <div className="d-flex align-items-center" style={{ gap: 6, minWidth: 50 }} key={item.label}>
                                    {item.icon}
                                    <span className="fw-medium text-black mb-1" style={{ fontWeight: 600, fontSize: 14, color: '#222', minWidth: 78 }}>{item.label}</span>
                                    <span style={{ fontWeight: 600, fontSize: 15, color: '#1976d2', minWidth: 90 }}>{getCardContent(item.value, loading, item.error, v => Number(v).toFixed(2))}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* card end */}
            </div>
            {/* Card 7: Net ROAS (with Google & Meta breakdown) */}
            <div className="col">
                <div className="card shadow-none border bg-gradient-start-12 h-100 position-relative" style={{overflow: 'visible'}}>
                    <div className="card-body p-20">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                            <div>
                                <p className="fw-medium text-black mb-1">Net ROAS</p>
                                <h6 className="mb-0 display-6 fw-bold" style={{letterSpacing: '1px'}}>{getCardContent(netRoas.total, loading, error.roas, v => Number(v).toFixed(2))}</h6>
                            </div>
                            <div className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                                 style={{background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)'}}>
                                <Icon
                                    icon="mdi:chart-line"
                                    className="text-white text-2xl mb-0"
                                />
                            </div>
                        </div>
                        <div className="my-3" style={{height: '1px', background: 'linear-gradient(90deg, #43cea2 0%, #185a9d 100%)', opacity: 0.4}}></div>
                        <div className="d-flex flex-column align-items-center mt-2" style={{ gap: 4, marginTop: 8 }}>
                            {sortBreakdown([
                                { label: 'Google', icon: <Icon icon="logos:google-icon" style={{ fontSize: 20, minWidth: 40 }} />, value: netRoas.google, error: error.roas },
                                { label: 'Meta', icon: <Icon icon="logos:meta-icon" style={{ fontSize: 20, minWidth: 40 }} />, value: netRoas.meta, error: error.roas }
                            ]).map((item, idx) => (
                                <div className="d-flex align-items-center" style={{ gap: 6, minWidth: 50 }} key={item.label}>
                                    {item.icon}
                                    <span className="fw-medium text-black mb-1" style={{ fontWeight: 600, fontSize: 14, color: '#222', minWidth: 78 }}>{item.label}</span>
                                    <span style={{ fontWeight: 600, fontSize: 15, color: '#1976d2', minWidth: 90 }}>{getCardContent(item.value, loading, item.error, v => Number(v).toFixed(2))}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* card end */}
            </div>
            {/* Card 8: BE ROAS (with Google & Meta breakdown) */}
            <div className="col">
                <div className="card shadow-none border bg-gradient-start-13 h-100 position-relative" style={{overflow: 'visible'}}>
                    <div className="card-body p-20">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                            <div>
                                <p className="fw-medium text-black mb-1">BE ROAS</p>
                                <h6 className="mb-0 display-6 fw-bold" style={{letterSpacing: '1px'}}>{getCardContent(beRoas.total, loading, error.roas, v => Number(v).toFixed(2))}</h6>
                            </div>
                            <div className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                                 style={{background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'}}>
                                <Icon
                                    icon="mdi:chart-areaspline"
                                    className="text-white text-2xl mb-0"
                                />
                            </div>
                        </div>
                        <div className="my-3" style={{height: '1px', background: 'linear-gradient(90deg, #11998e 0%, #38ef7d 100%)', opacity: 0.4}}></div>
                        <div className="d-flex flex-column align-items-center mt-2" style={{ gap: 4, marginTop: 8 }}>
                            {sortBreakdown([
                                { label: 'Google', icon: <Icon icon="logos:google-icon" style={{ fontSize: 20, minWidth: 40 }} />, value: beRoas.google, error: error.roas },
                                { label: 'Meta', icon: <Icon icon="logos:meta-icon" style={{ fontSize: 20, minWidth: 40 }} />, value: beRoas.meta, error: error.roas }
                            ]).map((item, idx) => (
                                <div className="d-flex align-items-center" style={{ gap: 6, minWidth: 50 }} key={item.label}>
                                    {item.icon}
                                    <span className="fw-medium text-black mb-1" style={{ fontWeight: 600, fontSize: 14, color: '#222', minWidth: 78 }}>{item.label}</span>
                                    <span style={{ fontWeight: 600, fontSize: 15, color: '#1976d2', minWidth: 90 }}>{getCardContent(item.value, loading, item.error, v => Number(v).toFixed(2))}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* card end */}
            </div>
        </div>
    )
}

export default UnitCountOne
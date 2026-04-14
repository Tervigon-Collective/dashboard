"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import brandMasterApi from "../services/brandMasterApi";

const BrandMasterLayer = () => {
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [shopDomain, setShopDomain] = useState("");
  const [brandName, setBrandName] = useState("");
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [oauthStatus, setOauthStatus] = useState(null);

  const parsedOAuthMessage = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("oauth_status");
    const message = params.get("oauth_message");
    return status && message ? { status, message } : null;
  }, []);

  useEffect(() => {
    if (parsedOAuthMessage) {
      setOauthStatus(parsedOAuthMessage);
      const params = new URLSearchParams(window.location.search);
      params.delete("oauth_status");
      params.delete("oauth_message");
      const queryString = params.toString();
      const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    }
  }, [parsedOAuthMessage]);

  const loadBrands = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const result = await brandMasterApi.getAllBrands(1, 100, search);
      setBrands(result?.data || []);
    } catch (error) {
      console.error("Failed to load brands:", error);
      setErrorMessage(error.message || "Failed to load brands.");
      setBrands([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    await loadBrands();
  };

  const handleConnect = async () => {
    const normalizedDomain = (shopDomain || "").trim().toLowerCase();
    if (!normalizedDomain) {
      setErrorMessage("Please enter a Shopify shop domain.");
      return;
    }

    try {
      setIsConnecting(true);
      setErrorMessage("");
      const result = await brandMasterApi.startOAuth({
        shop_domain: normalizedDomain,
        brand_name: (brandName || "").trim(),
      });

      const authUrl = result?.data?.authUrl;
      if (!authUrl) {
        throw new Error("Failed to generate Shopify auth URL.");
      }

      window.location.href = authUrl;
    } catch (error) {
      console.error("Failed to start OAuth:", error);
      setErrorMessage(error.message || "Failed to start Shopify OAuth.");
      setIsConnecting(false);
    }
  };

  return (
    <div>
      {oauthStatus && (
        <div
          className={`alert ${
            oauthStatus.status === "success" ? "alert-success" : "alert-danger"
          }`}
          role="alert"
        >
          {oauthStatus.message}
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="card border mb-4">
        <div className="card-body">
          <h6 className="fw-semibold mb-3">Connect Shopify Brand</h6>
          <div className="row g-2">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="Brand name (optional)"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>
            <div className="col-md-5">
              <input
                type="text"
                className="form-control"
                placeholder="your-store.myshopify.com"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
              />
            </div>
            <div className="col-md-3 d-grid">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? "Redirecting..." : "Connect Shopify"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
        <h6 className="fw-semibold mb-0">Connected Brands</h6>
        <form className="d-flex gap-2" onSubmit={handleSearch}>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search brand/domain"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-outline-secondary btn-sm">
            <Icon icon="lucide:search" width="14" height="14" />
          </button>
        </form>
      </div>

      <div className="table-responsive border rounded">
        <table className="table mb-0">
          <thead>
            <tr>
              <th>Brand</th>
              <th>Shop Domain</th>
              <th>Shop Name</th>
              <th>Mode</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" className="text-center py-4 text-muted">
                  Loading brands...
                </td>
              </tr>
            ) : brands.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-4 text-muted">
                  No brands found.
                </td>
              </tr>
            ) : (
              brands.map((brand) => (
                <tr key={brand.brand_id}>
                  <td>{brand.brand_name}</td>
                  <td>{brand.shop_domain}</td>
                  <td>{brand.shop_name || "-"}</td>
                  <td>{brand.auth_mode || "-"}</td>
                  <td>
                    <span className={`badge ${brand.is_active ? "bg-success" : "bg-secondary"}`}>
                      {brand.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BrandMasterLayer;

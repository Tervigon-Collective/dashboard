"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import config from "../../config.js";
import { useUser } from "@/helper/UserContext";

const ShippingManager = ({ order, onShippingUpdate }) => {
  const { hasOperation } = useUser();
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [selectedCourier, setSelectedCourier] = useState("bluedart");
  const [couriers, setCouriers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCouriers();
  }, []);

  const fetchCouriers = async () => {
    try {
      const response = await fetch(
        `${config.api.baseURL}/api/shipping/couriers`
      );
      const data = await response.json();
      if (data.success) {
        setCouriers(data.data);
      }
    } catch (error) {
      console.error("Error fetching couriers:", error);
    }
  };

  const generateAWB = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${config.api.baseURL}/api/shipping/generate-awb`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            order_id: order.order_id,
            courier: selectedCourier,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setTrackingData(data.data);
        onShippingUpdate && onShippingUpdate(data.data);
        alert("AWB generated successfully!");
      } else {
        setError(data.error || "Failed to generate AWB");
      }
    } catch (error) {
      setError("Network error occurred");
      console.error("Generate AWB error:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateEWaybill = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${config.api.baseURL}/api/shipping/generate-ewaybill`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            order_id: order.order_id,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setTrackingData(data.data);
        onShippingUpdate && onShippingUpdate(data.data);
        alert("eWaybill generated successfully!");
      } else {
        setError(data.error || "Failed to generate eWaybill");
      }
    } catch (error) {
      setError("Network error occurred");
      console.error("Generate eWaybill error:", error);
    } finally {
      setLoading(false);
    }
  };

  const trackShipment = async (awbNumber, courier = "bluedart") => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${config.api.baseURL}/api/shipping/track/${awbNumber}?courier=${courier}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setTrackingData(data.data);
      } else {
        setError(data.error || "Failed to track shipment");
      }
    } catch (error) {
      setError("Network error occurred");
      console.error("Track shipment error:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateAddress = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${config.api.baseURL}/api/shipping/validate-address`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            shipping_name: order.shipping_name,
            shipping_address1: order.shipping_address1,
            shipping_address2: order.shipping_address2,
            shipping_city: order.shipping_city,
            shipping_zip: order.shipping_zip,
            shipping_province_name: order.shipping_province_name,
            phone: order.phone,
            email: order.email,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        alert("Address validated successfully!");
      } else {
        setError(data.error || "Address validation failed");
      }
    } catch (error) {
      setError("Network error occurred");
      console.error("Validate address error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shipping-manager">
      <div className="card">
        <div className="card-header">
          <h6 className="card-title mb-0">
            <Icon icon="lucide:truck" className="me-2" />
            Shipping Management
          </h6>
        </div>
        <div className="card-body">
          {error && (
            <div
              className="alert alert-danger alert-dismissible fade show"
              role="alert"
            >
              {error}
              <button
                type="button"
                className="btn-close"
                onClick={() => setError(null)}
              ></button>
            </div>
          )}

          {/* Order Information */}
          <div className="row mb-3">
            <div className="col-md-6">
              <h6>Order Details</h6>
              <p className="mb-1">
                <strong>Order ID:</strong> {order.order_id}
              </p>
              <p className="mb-1">
                <strong>Customer:</strong> {order.shipping_name}
              </p>
              <p className="mb-1">
                <strong>Phone:</strong> {order.phone}
              </p>
              <p className="mb-1">
                <strong>Pincode:</strong> {order.shipping_zip}
              </p>
            </div>
            <div className="col-md-6">
              <h6>Shipping Address</h6>
              <p className="mb-1">{order.shipping_address1}</p>
              {order.shipping_address2 && (
                <p className="mb-1">{order.shipping_address2}</p>
              )}
              <p className="mb-1">
                {order.shipping_city}, {order.shipping_province_name}
              </p>
            </div>
          </div>

          {/* Courier Selection */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label">Select Courier</label>
              <select
                className="form-select"
                value={selectedCourier}
                onChange={(e) => setSelectedCourier(e.target.value)}
              >
                {couriers.map((courier) => (
                  <option key={courier.id} value={courier.id}>
                    {courier.name} - {courier.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Actions</label>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={validateAddress}
                  disabled={loading}
                >
                  <Icon icon="lucide:check-circle" className="me-1" />
                  Validate Address
                </button>
              </div>
            </div>
          </div>

          {/* Shipping Actions */}
          <div className="row mb-3">
            <div className="col-12">
              <h6>Generate Shipping Documents</h6>
              <div className="d-flex gap-2 flex-wrap">
                {hasOperation("shipping", "create") && (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={generateAWB}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-1"></span>
                    ) : (
                      <Icon icon="lucide:file-text" className="me-1" />
                    )}
                    Generate AWB (BlueDart)
                  </button>
                )}

                {hasOperation("shipping", "create") && (
                  <button
                    className="btn btn-info btn-sm"
                    onClick={generateEWaybill}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-1"></span>
                    ) : (
                      <Icon icon="lucide:file-text" className="me-1" />
                    )}
                    Generate eWaybill (DHL)
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tracking Information */}
          {trackingData && (
            <div className="row">
              <div className="col-12">
                <h6>Tracking Information</h6>
                <div className="card bg-light">
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <p>
                          <strong>Tracking Number:</strong>{" "}
                          {trackingData.awb_number ||
                            trackingData.tracking_number}
                        </p>
                        <p>
                          <strong>Courier:</strong> {trackingData.courier}
                        </p>
                        <p>
                          <strong>Status:</strong>{" "}
                          {trackingData.status || "Generated"}
                        </p>
                      </div>
                      <div className="col-md-6">
                        <a
                          href={trackingData.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-primary btn-sm"
                        >
                          <Icon icon="lucide:external-link" className="me-1" />
                          Track Shipment
                        </a>
                        {trackingData.label_url && (
                          <a
                            href={trackingData.label_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline-secondary btn-sm ms-2"
                          >
                            <Icon icon="lucide:download" className="me-1" />
                            Download Label
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Existing Tracking Info */}
          {(order.awb_number || order.ewaybill_number) && (
            <div className="row mt-3">
              <div className="col-12">
                <h6>Existing Tracking</h6>
                <div className="card bg-light">
                  <div className="card-body">
                    {order.awb_number && (
                      <div className="mb-2">
                        <strong>BlueDart AWB:</strong> {order.awb_number}
                        {hasOperation("shipping", "update") && (
                          <button
                            className="btn btn-sm btn-outline-primary ms-2"
                            onClick={() =>
                              trackShipment(order.awb_number, "bluedart")
                            }
                          >
                            Track
                          </button>
                        )}
                      </div>
                    )}
                    {order.ewaybill_number && (
                      <div>
                        <strong>DHL eWaybill:</strong> {order.ewaybill_number}
                        {hasOperation("shipping", "update") && (
                          <button
                            className="btn btn-sm btn-outline-primary ms-2"
                            onClick={() =>
                              trackShipment(order.ewaybill_number, "dhl")
                            }
                          >
                            Track
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShippingManager;

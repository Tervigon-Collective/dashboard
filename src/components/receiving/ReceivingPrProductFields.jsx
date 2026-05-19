"use client";

import React from "react";
import { Combobox } from "@headlessui/react";

const formatHsnForInput = (hsn) => {
  if (hsn == null || hsn === "") return "";
  if (typeof hsn === "string" || typeof hsn === "number") return String(hsn);
  if (typeof hsn === "object") {
    const nested = hsn.code ?? hsn.value ?? hsn.hsn ?? hsn.hsn_code;
    if (nested != null && typeof nested !== "object") return String(nested);
  }
  return "";
};

export default function ReceivingPrProductFields({
  productEntry,
  productIndex,
  masterBrandFilter,
  setMasterBrandFilter,
  masterBrands,
  masterProductOptions,
  masterProductLoading,
  handleProductFieldChange,
  handleMasterProductSelect,
  updateVariantField,
}) {
  return (
    <>
      <div className="row mb-3">
        <div className="col-md-3">
          <label className="form-label">Brand filter</label>
          <select
            className="form-select"
            value={masterBrandFilter}
            onChange={(e) => setMasterBrandFilter(e.target.value)}
          >
            <option value="">All brands</option>
            {masterBrands.map((brand) => (
              <option key={brand.brand_id} value={brand.brand_id}>
                {brand.brand_name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-9 position-relative">
          <label className="form-label">
            Product (Manage Master) <span className="text-danger">*</span>
          </label>
          <Combobox
            value={
              productEntry.product_id
                ? {
                    product_id: productEntry.product_id,
                    product_name: productEntry.product_name,
                  }
                : null
            }
            onChange={(selected) =>
              handleMasterProductSelect(productIndex, selected)
            }
          >
            <Combobox.Input
              className="form-control"
              displayValue={(item) =>
                item?.product_name || productEntry.masterQuery || ""
              }
              onChange={(e) =>
                handleProductFieldChange(
                  productIndex,
                  "masterQuery",
                  e.target.value
                )
              }
              placeholder="Search product from master catalog..."
            />
            <Combobox.Options className="list-group position-absolute w-100 shadow-sm z-3 max-h-240 overflow-auto">
              {masterProductLoading && (
                <div className="list-group-item small text-muted">
                  Searching...
                </div>
              )}
              {!masterProductLoading && masterProductOptions.length === 0 && (
                <div className="list-group-item small text-muted">
                  Type at least 2 characters to search
                </div>
              )}
              {masterProductOptions.map((option) => (
                <Combobox.Option
                  key={option.product_id}
                  value={option}
                  className="list-group-item list-group-item-action"
                >
                  <div className="fw-semibold text-break">
                    {option.product_name}
                  </div>
                  <div className="small text-muted">
                    {option.brand_name ? `${option.brand_name} · ` : ""}
                    ID {option.product_id}
                    {formatHsnForInput(option.hsn_code)
                      ? ` · HSN ${formatHsnForInput(option.hsn_code)}`
                      : ""}
                  </div>
                </Combobox.Option>
              ))}
            </Combobox.Options>
          </Combobox>
          {productEntry.suffixLoading && (
            <div className="small text-muted mt-1">
              Loading cross-brand variant groups...
            </div>
          )}
          {productEntry.brand_name && (
            <div className="small text-muted mt-1">
              Listing brand: {productEntry.brand_name}
            </div>
          )}
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-6">
          <label className="form-label">Product name</label>
          <input
            type="text"
            className="form-control"
            value={productEntry.product_name || ""}
            disabled
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Product Category</label>
          <input
            type="text"
            className="form-control"
            placeholder="Category"
            value={productEntry.product_category || ""}
            onChange={(e) =>
              handleProductFieldChange(
                productIndex,
                "product_category",
                e.target.value
              )
            }
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">
            HSN Code <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="HSN"
            value={formatHsnForInput(productEntry.hsn_code)}
            onChange={(e) =>
              handleProductFieldChange(productIndex, "hsn_code", e.target.value)
            }
            required
          />
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-2">
        <label className="form-label mb-0">
          Warehouse variants (suffix groups)
        </label>
      </div>
      <div
        className="border rounded p-3 overflow-hidden"
        style={{ backgroundColor: "white" }}
      >
        {productEntry.selectedVariants.length === 0 && (
          <p className="small text-muted mb-0">
            Select a product from master to load variant groups.
          </p>
        )}
        {productEntry.selectedVariants.map((variant, variantIndex) => (
          <div
            key={variantIndex}
            className="border rounded p-2 mb-3 overflow-hidden"
          >
            <div className="mb-2">
              <strong className="small d-block text-break">
                {variant.variant_display_name || `Variant #${variantIndex + 1}`}
                {variant.sku_variant_suffix
                  ? ` · ${variant.sku_variant_suffix}`
                  : ""}
              </strong>
            </div>
            {Array.isArray(variant.linked_skus) &&
              variant.linked_skus.length > 0 && (
                <div className="small text-muted mb-2 text-break">
                  SKUs:{" "}
                  {variant.linked_skus
                    .map(
                      (row) =>
                        `${row.brand_name ? `${row.brand_name}: ` : ""}${row.sku}`
                    )
                    .join(" · ")}
                </div>
              )}
            <div className="row g-2 align-items-end">
              <div className="col-6 col-md-4">
                <label className="form-label small mb-1">Quantity</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  min="0"
                  value={
                    variant.quantity === 0 || variant.quantity
                      ? variant.quantity
                      : ""
                  }
                  onChange={(e) =>
                    updateVariantField(
                      productIndex,
                      variantIndex,
                      "quantity",
                      parseInt(e.target.value, 10) || 0
                    )
                  }
                  required
                />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label small mb-1">Rate</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control form-control-sm"
                  min="0"
                  value={variant.rate || ""}
                  onChange={(e) =>
                    updateVariantField(
                      productIndex,
                      variantIndex,
                      "rate",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small mb-1">Net amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control form-control-sm"
                  value={variant.net_amount || ""}
                  readOnly
                />
              </div>
            </div>
            <div className="row g-2 align-items-end mt-1">
              <div className="col-6 col-md-3">
                <label className="form-label small mb-1">IGST %</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control form-control-sm"
                  min="0"
                  value={variant.igst_percent || ""}
                  onChange={(e) =>
                    updateVariantField(
                      productIndex,
                      variantIndex,
                      "igst_percent",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small mb-1">SGST %</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control form-control-sm"
                  min="0"
                  value={variant.sgst_percent || ""}
                  onChange={(e) =>
                    updateVariantField(
                      productIndex,
                      variantIndex,
                      "sgst_percent",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small mb-1">CGST %</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control form-control-sm"
                  min="0"
                  value={variant.cgst_percent || ""}
                  onChange={(e) =>
                    updateVariantField(
                      productIndex,
                      variantIndex,
                      "cgst_percent",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small mb-1">GST amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control form-control-sm"
                  value={variant.gst_amt || ""}
                  readOnly
                />
              </div>
            </div>
            <div className="row g-2 mt-1">
              <div className="col-12 col-md-4">
                <label className="form-label small mb-1">Freight (share)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control form-control-sm bg-light"
                  value={
                    variant.freight_amount === 0 || variant.freight_amount
                      ? variant.freight_amount
                      : ""
                  }
                  readOnly
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

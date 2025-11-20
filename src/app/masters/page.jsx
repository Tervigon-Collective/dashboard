"use client";
import React, { useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import MasterLayout from "../../masterLayout/MasterLayout";
import SidebarPermissionGuard from "../../components/SidebarPermissionGuard";
import VendorMasterLayer from "../../components/VendorMasterLayer";
import ProductMasterLayer from "../../components/ProductMasterLayer";

const MastersLayer = () => {
  const [activeTab, setActiveTab] = useState("vendor");

  const tabs = [
    {
      id: "vendor",
      label: "VENDOR",
      icon: "mdi:storefront",
    },
    {
      id: "product",
      label: "PRODUCT",
      icon: "mdi:package-variant",
    },
  ];

  const getActiveTabLabel = () => {
    const activeTabData = tabs.find((tab) => tab.id === activeTab);
    return activeTabData ? activeTabData.label : "";
  };

  return (
    <div className="card h-100 radius-8 border">
      <div className="card-body p-24">
        {/* Header with Dynamic Title */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center">
            <h5 className="mb-0 fw-semibold">
              Manage Master - {getActiveTabLabel()}
            </h5>
          </div>
        </div>

        {/* Tab Navigation - Responsive */}
        <div
          className="mb-4 border-bottom pb-0"
          style={{ overflowX: "auto", overflowY: "hidden" }}
        >
          <div
            className="d-flex gap-2 gap-md-4"
            style={{ minWidth: "max-content", flexWrap: "nowrap" }}
          >
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`d-flex align-items-center gap-2 px-2 px-md-3 py-2 cursor-pointer position-relative ${
                  activeTab === tab.id ? "text-primary" : "text-muted"
                }`}
                onClick={() => setActiveTab(tab.id)}
                style={{ cursor: "pointer", whiteSpace: "nowrap" }}
              >
                <Icon
                  icon={tab.icon}
                  className="icon"
                  style={{ flexShrink: 0 }}
                />
                <span
                  className="fw-medium"
                  style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
                >
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <div
                    className="position-absolute bottom-0 start-0 end-0"
                    style={{
                      height: "2px",
                      backgroundColor: "#0d6efd",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === "vendor" && <VendorMasterLayer />}
          {activeTab === "product" && <ProductMasterLayer />}
        </div>
      </div>
    </div>
  );
};

const MastersPage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="masters">
        {/* MasterLayout */}
        <MasterLayout>
          {/* MastersLayer */}
          <MastersLayer />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default MastersPage;

"use client";
import React, { useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import Breadcrumb from "../../components/Breadcrumb";
import MasterLayout from "../../masterLayout/MasterLayout";
import SidebarPermissionGuard from "../../components/SidebarPermissionGuard";

const ReceivingManagementLayer = () => {
  const [activeTab, setActiveTab] = useState("purchase-request");

  const tabs = [
    {
      id: "purchase-request",
      label: "PURCHASE REQUEST",
      icon: "mdi:file-document-outline",
    },
    {
      id: "to-be-delivered",
      label: "TO BE DELIVERED",
      icon: "mdi:truck-delivery",
    },
    {
      id: "receipt-details",
      label: "RECEIPT DETAILS",
      icon: "mdi:file-cabinet",
    },
  ];

  return (
    <div className="card h-100 radius-8 border">
      <div className="card-body p-24">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-20">
          <div className="d-flex align-items-center">
            <h6 className="mb-0 me-2">Receiving Management</h6>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="d-flex gap-4 mb-4 border-bottom pb-0">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`d-flex align-items-center gap-2 px-3 py-2 cursor-pointer position-relative ${
                activeTab === tab.id ? "text-primary" : "text-muted"
              }`}
              onClick={() => setActiveTab(tab.id)}
              style={{ cursor: "pointer" }}
            >
              <Icon icon={tab.icon} className="icon" />
              <span className="fw-medium">{tab.label}</span>
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

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === "purchase-request" && (
            <div>{/* Purchase Request content will go here */}</div>
          )}
          {activeTab === "to-be-delivered" && (
            <div>{/* To Be Delivered content will go here */}</div>
          )}
          {activeTab === "receipt-details" && (
            <div>{/* Receipt Details content will go here */}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReceivingManagementPage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="receivingManagement">
        {/* MasterLayout */}
        <MasterLayout>
          {/* Breadcrumb */}
          <Breadcrumb title="Components / Receiving Management" />

          {/* ReceivingManagementLayer */}
          <ReceivingManagementLayer />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default ReceivingManagementPage;

"use client";
import React from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import Breadcrumb from "../../components/Breadcrumb";
import MasterLayout from "../../masterLayout/MasterLayout";
import SidebarPermissionGuard from "../../components/SidebarPermissionGuard";

const MastersLayer = () => {
  const masterCards = [
    {
      id: "vendor",
      label: "Vendor",
      icon: "mdi:storefront",
    },
    {
      id: "product",
      label: "Product",
      icon: "mdi:package-variant",
    },
  ];

  const handleCardClick = (cardId) => {
    console.log(`Clicked on ${cardId} master`);
    // Logic will be added later
  };

  return (
    <div className="card h-100 radius-8 border">
      <div className="card-body p-24">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-20">
          <div className="d-flex align-items-center">
            <h6 className="mb-0 me-2">Manage Master</h6>
          </div>
        </div>

        {/* Master Cards Grid */}
        <div className="row g-3">
          {masterCards.map((card) => (
            <div key={card.id} className="col-lg-2 col-md-3 col-sm-4 col-6">
              <div
                className="master-card d-flex flex-column align-items-center justify-content-center p-3 border rounded cursor-pointer"
                onClick={() => handleCardClick(card.id)}
                style={{
                  minHeight: "120px",
                  backgroundColor: "#fff",
                  border: "1px solid #e9ecef",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                  e.target.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                <Icon
                  icon={card.icon}
                  className="mb-2"
                  style={{ fontSize: "32px", color: "#495057" }}
                />
                <span
                  className="text-center fw-medium"
                  style={{ fontSize: "14px", color: "#495057" }}
                >
                  {card.label}
                </span>
              </div>
            </div>
          ))}
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
          {/* Breadcrumb */}
          <Breadcrumb title="Components / Manage Masters" />

          {/* MastersLayer */}
          <MastersLayer />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default MastersPage;

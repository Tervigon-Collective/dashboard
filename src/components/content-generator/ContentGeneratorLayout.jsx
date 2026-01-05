"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import BrandkitSelector from "@/components/BrandkitSelector";
import BrandkitFormModal from "@/components/BrandkitFormModal";
import BrandkitManagementModal from "@/components/BrandkitManagementModal";
import BrandkitLogoUpload from "@/components/BrandkitLogoUpload";
import BrandkitModeSelectionModal from "@/components/BrandkitModeSelectionModal";
import NewBrandkitForm from "@/components/NewBrandkitForm";
import ExistingBrandkitForm from "@/components/ExistingBrandkitForm";
import { useBrandkit } from "@/contexts/BrandkitContext";
import Studio from "./Studio";
import Playground from "./Playground";
import GenerationQueue from "./GenerationQueue";
import "./ContentGeneratorLayout.css";

export default function ContentGeneratorLayout({ children }) {
  const [activeTab, setActiveTab] = useState("studio");
  const [showBrandkitFormModal, setShowBrandkitFormModal] = useState(false);
  const [showBrandkitManagementModal, setShowBrandkitManagementModal] = useState(false);
  const [showLogoUploadModal, setShowLogoUploadModal] = useState(false);
  const [showModeSelectionModal, setShowModeSelectionModal] = useState(false);
  const [showNewBrandkitForm, setShowNewBrandkitForm] = useState(false);
  const [showExistingBrandkitForm, setShowExistingBrandkitForm] = useState(false);
  const [editingBrandkit, setEditingBrandkit] = useState(null);
  const [uploadingLogoBrandkit, setUploadingLogoBrandkit] = useState(null);

  const { activeBrandkit, refresh: refreshBrandkit } = useBrandkit();

  const handleCreateNewBrandkit = () => {
    setShowModeSelectionModal(true);
  };

  const handleManageBrandkits = () => {
    setShowBrandkitManagementModal(true);
  };

  return (
    <div className="content-generator-layout">
      {/* Global Top Bar */}
      <div className="content-generator-topbar">
        <div className="content-generator-topbar__left">
          <div className="content-generator-logo">
            <Icon icon="solar:magic-stick-3-bold" className="logo-icon" />
            <span className="logo-text">Content Generator</span>
          </div>
          
          {/* Main Tabs */}
          <div className="content-generator-tabs">
            <button
              className={`content-generator-tab ${activeTab === "studio" ? "active" : ""}`}
              onClick={() => setActiveTab("studio")}
            >
              Studio
            </button>
            <button
              className={`content-generator-tab ${activeTab === "playground" ? "active" : ""}`}
              onClick={() => setActiveTab("playground")}
            >
              Playground
            </button>
          </div>
        </div>

        <div className="content-generator-topbar__right">
          {/* Brandkit Selector */}
          <div className="content-generator-brandkit">
            <BrandkitSelector
              onCreateNew={handleCreateNewBrandkit}
              onManage={handleManageBrandkits}
            />
          </div>

          {/* Search */}
          <div className="content-generator-search">
            <Icon icon="solar:magnifer-outline" className="search-icon" />
            <input
              type="text"
              placeholder="Search history & library..."
              className="search-input"
            />
          </div>

          {/* User Menu */}
          <div className="content-generator-user-menu">
            <button className="user-menu-button">
              <Icon icon="solar:user-circle-bold" className="user-icon" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="content-generator-main">
        {activeTab === "studio" ? <Studio /> : <Playground />}
      </div>

      {/* Generation Queue (Floating) */}
      <GenerationQueue />

      {/* Brandkit Modals */}
      <BrandkitModeSelectionModal
        isOpen={showModeSelectionModal}
        onClose={() => setShowModeSelectionModal(false)}
        onSelectMode={(mode) => {
          setShowModeSelectionModal(false);
          if (mode === "new_brand") {
            setShowNewBrandkitForm(true);
          } else if (mode === "existing_brand") {
            setShowExistingBrandkitForm(true);
          }
        }}
      />

      <NewBrandkitForm
        isOpen={showNewBrandkitForm}
        onClose={() => {
          setShowNewBrandkitForm(false);
          refreshBrandkit();
        }}
        onSuccess={() => {
          setShowNewBrandkitForm(false);
          refreshBrandkit();
        }}
      />

      <ExistingBrandkitForm
        isOpen={showExistingBrandkitForm}
        onClose={() => {
          setShowExistingBrandkitForm(false);
          refreshBrandkit();
        }}
        onSuccess={() => {
          setShowExistingBrandkitForm(false);
          refreshBrandkit();
        }}
      />

      <BrandkitFormModal
        isOpen={showBrandkitFormModal}
        onClose={() => {
          setShowBrandkitFormModal(false);
          setEditingBrandkit(null);
          refreshBrandkit();
        }}
        brandkit={editingBrandkit}
        onSuccess={() => {
          setShowBrandkitFormModal(false);
          setEditingBrandkit(null);
          refreshBrandkit();
        }}
      />

      <BrandkitManagementModal
        isOpen={showBrandkitManagementModal}
        onClose={() => setShowBrandkitManagementModal(false)}
        onEdit={(brandkit) => {
          setEditingBrandkit(brandkit);
          setShowBrandkitManagementModal(false);
          setShowBrandkitFormModal(true);
        }}
        onUploadLogo={(brandkit) => {
          setUploadingLogoBrandkit(brandkit);
          setShowBrandkitManagementModal(false);
          setShowLogoUploadModal(true);
        }}
      />

      <BrandkitLogoUpload
        isOpen={showLogoUploadModal}
        onClose={() => {
          setShowLogoUploadModal(false);
          setUploadingLogoBrandkit(null);
          refreshBrandkit();
        }}
        brandkit={uploadingLogoBrandkit}
        onSuccess={() => {
          setShowLogoUploadModal(false);
          setUploadingLogoBrandkit(null);
          refreshBrandkit();
        }}
      />
    </div>
  );
}


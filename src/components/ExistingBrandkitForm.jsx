"use client";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import * as brandkitApi from "@/services/contentGenerationApi";
import ICPConfiguration from "./ICPConfiguration/ICPConfiguration";

const ExistingBrandkitForm = ({ isOpen, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1: Website/Description, 2: Fields, 3: ICP
  const [inputMethod, setInputMethod] = useState("url"); // "url" or "description"
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [extractedData, setExtractedData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [formData, setFormData] = useState({
    brand_name: "",
    tagline: "",
    target_audience: "",
    color_palette: [],
    typography: {
      primary: "",
      secondary: null,
      fallback_stack: "Arial, sans-serif",
    },
    logo_path: null,
    brand_description: "",
    niche: "",
  });
  const [icp, setIcp] = useState(null);
  const [icpSource, setIcpSource] = useState("generic"); // "generic" or "specific"
  const [icpMethod, setIcpMethod] = useState("manual"); // "manual" or "database"
  const [icpFields, setIcpFields] = useState({
    name: "",
    age_range: "",
    region: "",
    gender: "",
    title: "",
  });
  const [fonts, setFonts] = useState([]);
  const [fontsError, setFontsError] = useState(false);
  const [typoMode, setTypoMode] = useState("dropdown");
  const [loading, setLoading] = useState(false);
  const [generatingField, setGeneratingField] = useState(null);
  const [errors, setErrors] = useState({});
  const [dbSchema, setDbSchema] = useState(null);

  // Database ICP configuration
  const [dbConfig, setDbConfig] = useState({
    db_type: "mysql",
    host: "",
    port: 3306,
    username: "",
    password: "",
    database: "",
    db_schema: "",
    table_name: "",
    age_column: "",
    gender_column: "",
    location_column: "",
    title_column: "",
    created_at_column: "",
  });
  const [timeRange, setTimeRange] = useState({
    range_type: "last_30_days",
    month: null,
    year: null,
  });

  // Fetch Google Fonts on mount
  useEffect(() => {
    const fetchFonts = async () => {
      try {
        const response = await brandkitApi.getGoogleFonts();
        if (response.success && response.fonts) {
          setFonts(response.fonts);
          setFontsError(false);
          setTypoMode("dropdown");
        } else {
          setFontsError(true);
          setTypoMode("manual");
        }
      } catch (error) {
        console.error("Error fetching fonts:", error);
        setFontsError(true);
        setTypoMode("manual");
      }
    };
    if (isOpen) {
      fetchFonts();
    }
  }, [isOpen]);

  // Auto-fetch database schema when table_name is set
  useEffect(() => {
    const fetchSchema = async () => {
      if (dbConfig.table_name && dbConfig.host && dbConfig.database && dbConfig.username && dbConfig.password) {
        try {
          const schema = await brandkitApi.fetchDatabaseSchema({
            db_type: dbConfig.db_type,
            host: dbConfig.host,
            port: dbConfig.port,
            username: dbConfig.username,
            password: dbConfig.password,
            database: dbConfig.database,
            db_schema: dbConfig.db_schema || null,
          });
          setDbSchema(schema);

          // Auto-suggest column mappings
          const tableColumns = schema.columns[dbConfig.table_name] || [];
          if (tableColumns.length > 0) {
            const columnNames = tableColumns.map((col) => col.name.toLowerCase());
            setDbConfig((prev) => ({
              ...prev,
              age_column: columnNames.find((c) => c.includes("age")) || prev.age_column,
              gender_column: columnNames.find((c) => c.includes("gender") || c.includes("sex")) || prev.gender_column,
              location_column: columnNames.find((c) => c.includes("location") || c.includes("city") || c.includes("region")) || prev.location_column,
              title_column: columnNames.find((c) => c.includes("title") || c.includes("job") || c.includes("role")) || prev.title_column,
              created_at_column: columnNames.find((c) => c.includes("created") || c.includes("date")) || prev.created_at_column,
            }));
          }
        } catch (error) {
          console.error("Error fetching schema:", error);
        }
      }
    };
    fetchSchema();
  }, [dbConfig.table_name, dbConfig.host, dbConfig.database, dbConfig.username, dbConfig.password]);

  // Extract website data
  const handleExtractWebsite = async () => {
    if (!websiteUrl.trim()) {
      alert("Please enter a website URL");
      return;
    }

    setIsExtracting(true);
    try {
      const data = await brandkitApi.extractWebsiteData(websiteUrl);
      setExtractedData(data);

      // Auto-fill form with extracted data
      setFormData({
        brand_name: data.brand_name || "",
        tagline: data.tagline || "",
        target_audience: "",
        color_palette: data.color_palette || [],
        typography: data.typography || {
          primary: "",
          secondary: null,
          fallback_stack: "Arial, sans-serif",
        },
        logo_path: data.logo_url || null,
        brand_description: "",
        niche: "",
      });

      alert(`Website data extracted successfully using ${data.extraction_method || "beautifulsoup"}!`);
    } catch (error) {
      console.error("Error extracting website:", error);
      alert(`Failed to extract website: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Generate from description
  const handleGenerateFromDescription = async () => {
    if (!brandDescription.trim()) {
      alert("Please enter a brand description");
      return;
    }

    setIsExtracting(true);
    try {
      const data = await brandkitApi.generateFromDescription(brandDescription.trim());
      setExtractedData(data);

      // Auto-fill form with generated data
      setFormData({
        brand_name: data.brand_name || "",
        tagline: data.tagline || "",
        target_audience: "",
        color_palette: data.color_palette || [],
        typography: data.typography || {
          primary: "",
          secondary: null,
          fallback_stack: "Arial, sans-serif",
        },
        logo_path: null,
        brand_description: brandDescription.trim(),
        niche: data.brand_type || brandDescription.trim(),
      });

      alert("Brand information generated successfully!");
    } catch (error) {
      console.error("Error generating from description:", error);
      alert(`Failed to generate: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Generate single field
  const handleGenerateField = async (fieldName, extraParams = {}) => {
    setGeneratingField(fieldName);
    try {
      const response = await brandkitApi.generateField(
        fieldName,
        formData.niche || brandDescription.trim() || "",
        {
          industry: formData.niche || "",
        },
        fieldName.startsWith("icp_") ? { icp: { persona: icpFields } } : formData,
        extraParams
      );

      if (fieldName === "color_palette") {
        setFormData((prev) => ({
          ...prev,
          color_palette: response.color_palette || [],
        }));
      } else if (fieldName === "typography") {
        setFormData((prev) => ({
          ...prev,
          typography: response.typography || prev.typography,
        }));
      } else if (fieldName.startsWith("icp_")) {
        // Handle ICP field generation
        if (fieldName === "icp_all_fields") {
          setIcpFields({
            name: response.icp_name || "",
            age_range: response.icp_age_range || "",
            region: response.icp_region || "",
            gender: response.icp_gender || "",
            title: response.icp_title || "",
          });
        } else {
          const fieldKey = fieldName.replace("icp_", "");
          setIcpFields((prev) => ({
            ...prev,
            [fieldKey]: response[fieldName] || prev[fieldKey],
          }));
        }
      } else {
        setFormData((prev) => ({
          ...prev,
          [fieldName]: response[fieldName] || prev[fieldName],
        }));
      }
    } catch (error) {
      console.error(`Error generating ${fieldName}:`, error);
      alert(`Failed to generate ${fieldName}: ${error.response?.data?.detail || error.message}`);
    } finally {
      setGeneratingField(null);
    }
  };

  // Generate ICP from database
  const handleGenerateICPFromDB = async () => {
    // Validate database config
    if (!dbConfig.host || !dbConfig.database || !dbConfig.table_name) {
      alert("Please fill in all required database fields");
      return;
    }

    setLoading(true);
    try {
      const response = await brandkitApi.generateICPFromDatabase(
        dbConfig,
        timeRange,
        formData.niche || ""
      );

      setIcp(response);
      setIcpSource("specific_database");
      alert("ICP generated successfully from database!");
    } catch (error) {
      console.error("Error generating ICP from database:", error);
      alert(`Failed to generate ICP: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Validate step 2
  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.brand_name.trim()) {
      newErrors.brand_name = "Brand name is required";
    }
    if (!formData.tagline.trim()) {
      newErrors.tagline = "Tagline is required";
    }
    if (!formData.color_palette || formData.color_palette.length === 0) {
      newErrors.color_palette = "At least one color is required";
    }
    if (!formData.typography?.primary) {
      newErrors.typography = "Primary typography is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (file) => {
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          logo_path: reader.result,
        }));
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert(`Failed to upload logo: ${error.message}`);
      setLoading(false);
    }
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }

    setLoading(true);

    try {
      const brandId = formData.brand_name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      // Build ICP object
      let finalIcp = null;
      if (icpSource === "specific") {
        if (icpMethod === "manual") {
          if (icpFields.name && icpFields.age_range && icpFields.region && icpFields.gender) {
            finalIcp = {
              enabled: true,
              type: "specific",
              persona: {
                name: icpFields.name,
                age_range: icpFields.age_range,
                location: icpFields.region,
                gender: icpFields.gender,
                title: icpFields.title || null,
              },
            };
          }
        } else if (icpMethod === "database" && icp) {
          finalIcp = icp;
        }
      } else if (icpSource === "generic" && icp) {
        finalIcp = icp;
      }

      const payload = {
        brand_id: brandId,
        brand_name: formData.brand_name.trim(),
        brand_description: formData.brand_description || formData.tagline,
        niche: formData.niche || "",
        color_palette: formData.color_palette,
        typography: formData.typography,
        logo_path: formData.logo_path,
        brand_essence: {
          core_message: formData.brand_description || "",
          tagline: formData.tagline.trim(),
          archetype_blend: null,
        },
        target_audience: formData.target_audience || "",
        icp: finalIcp || undefined,
      };

      const response = await brandkitApi.createExistingBrandkit(payload);
      onSuccess(response);
      onClose();
    } catch (error) {
      console.error("Error creating brandkit:", error);
      alert(`Failed to create brandkit: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-xl modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header" style={{ padding: "20px", borderBottom: "1px solid #e9ecef" }}>
            <h5 className="modal-title" style={{ fontSize: "1.125rem", fontWeight: "600", margin: 0 }}>
              Existing Brand Continuation
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body" style={{ padding: "24px" }}>
            {/* Step Indicator */}
            <div className="d-flex align-items-center justify-content-center mb-4">
              <div className="d-flex align-items-center gap-2">
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: currentStep >= 1 ? "#0d6efd" : "#dee2e6",
                    color: currentStep >= 1 ? "#fff" : "#6c757d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "600",
                    fontSize: "0.875rem",
                  }}
                >
                  1
                </div>
                <div
                  style={{
                    width: "60px",
                    height: "2px",
                    backgroundColor: currentStep >= 2 ? "#0d6efd" : "#dee2e6",
                  }}
                />
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: currentStep >= 2 ? "#0d6efd" : "#dee2e6",
                    color: currentStep >= 2 ? "#fff" : "#6c757d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "600",
                    fontSize: "0.875rem",
                  }}
                >
                  2
                </div>
                <div
                  style={{
                    width: "60px",
                    height: "2px",
                    backgroundColor: currentStep >= 3 ? "#0d6efd" : "#dee2e6",
                  }}
                />
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: currentStep >= 3 ? "#0d6efd" : "#dee2e6",
                    color: currentStep >= 3 ? "#fff" : "#6c757d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "600",
                    fontSize: "0.875rem",
                  }}
                >
                  3
                </div>
              </div>
            </div>

            {/* Step 1: Website URL or Description */}
            {currentStep === 1 && (
              <div>
                <h6 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "12px" }}>
                  Input Method
                </h6>
                <p style={{ fontSize: "0.875rem", color: "#6c757d", marginBottom: "20px" }}>
                  Choose how you want to provide brand information.
                </p>

                {/* Input Method Selection */}
                <div className="mb-3">
                  <div
                    onClick={() => setInputMethod("url")}
                    style={{
                      padding: "16px",
                      marginBottom: "12px",
                      border: `2px solid ${inputMethod === "url" ? "#0d6efd" : "#dee2e6"}`,
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: inputMethod === "url" ? "#f0f7ff" : "#fff",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="radio"
                        name="input-method"
                        checked={inputMethod === "url"}
                        onChange={() => setInputMethod("url")}
                      />
                      <div>
                        <strong>Website URL</strong>
                        <p style={{ fontSize: "0.875rem", color: "#6c757d", margin: "4px 0 0 0" }}>
                          Extract brand information from a website URL.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setInputMethod("description")}
                    style={{
                      padding: "16px",
                      border: `2px solid ${inputMethod === "description" ? "#0d6efd" : "#dee2e6"}`,
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: inputMethod === "description" ? "#f0f7ff" : "#fff",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="radio"
                        name="input-method"
                        checked={inputMethod === "description"}
                        onChange={() => setInputMethod("description")}
                      />
                      <div>
                        <strong>Describe Your Brand</strong>
                        <p style={{ fontSize: "0.875rem", color: "#6c757d", margin: "4px 0 0 0" }}>
                          Describe what you sell or your brand's specialty.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Website URL Option */}
                {inputMethod === "url" && (
                  <div>
                    <div className="input-group mb-3">
                      <input
                        type="url"
                        className="form-control"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://example.com"
                        disabled={isExtracting}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleExtractWebsite}
                        disabled={isExtracting || !websiteUrl.trim()}
                      >
                        {isExtracting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Extracting...
                          </>
                        ) : (
                          "Extract"
                        )}
                      </button>
                    </div>

                    {extractedData && (
                      <div className="alert alert-success" style={{ fontSize: "0.875rem" }}>
                        <strong>Extraction successful!</strong> Using method: {extractedData.extraction_method || "beautifulsoup"}
                        <br />
                        Form fields have been pre-filled with extracted data.
                      </div>
                    )}
                  </div>
                )}

                {/* Brand Description Option */}
                {inputMethod === "description" && (
                  <div>
                    <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                      What do you sell, or what is the speciality of your brand?
                    </label>
                    <textarea
                      className="form-control mb-3"
                      value={brandDescription}
                      onChange={(e) => setBrandDescription(e.target.value)}
                      placeholder="e.g., pet accessories, home décor, bakery services, fitness coaching"
                      rows={3}
                      disabled={isExtracting}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleGenerateFromDescription}
                      disabled={isExtracting || !brandDescription.trim()}
                    >
                      {isExtracting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Generating...
                        </>
                      ) : (
                        "Generate Brand Info"
                      )}
                    </button>

                    {extractedData && (
                      <div className="alert alert-success mt-3" style={{ fontSize: "0.875rem" }}>
                        <strong>Generation successful!</strong>
                        <br />
                        Form fields have been pre-filled with generated data.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Brand Fields */}
            {currentStep === 2 && (
              <div>
                <h6 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "20px" }}>
                  Brand Information
                </h6>

                {/* Brand Name */}
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                    Brand Name <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      value={formData.brand_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, brand_name: e.target.value }))
                      }
                      placeholder="Enter brand name"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => handleGenerateField("brand_name")}
                      disabled={loading || generatingField === "brand_name"}
                      title="Generate with AI"
                    >
                      {generatingField === "brand_name" ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                      )}
                    </button>
                  </div>
                  {errors.brand_name && (
                    <div className="text-danger" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                      {errors.brand_name}
                    </div>
                  )}
                </div>

                {/* Tagline */}
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                    Tagline <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      value={formData.tagline}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, tagline: e.target.value }))
                      }
                      placeholder="Enter tagline"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => handleGenerateField("tagline")}
                      disabled={loading || generatingField === "tagline"}
                      title="Generate with AI"
                    >
                      {generatingField === "tagline" ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                      )}
                    </button>
                  </div>
                  {errors.tagline && (
                    <div className="text-danger" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                      {errors.tagline}
                    </div>
                  )}
                </div>

                {/* Typography */}
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                    Typography <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <select
                      className="form-select"
                      value={formData.typography?.primary || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          typography: { ...prev.typography, primary: e.target.value },
                        }))
                      }
                      disabled={loading}
                    >
                      <option value="">Select font</option>
                      {fonts.map((font) => (
                        <option key={font.family} value={font.family}>
                          {font.family}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => handleGenerateField("typography")}
                      disabled={loading || generatingField === "typography"}
                      title="Generate with AI"
                    >
                      {generatingField === "typography" ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                      )}
                    </button>
                  </div>
                  {errors.typography && (
                    <div className="text-danger" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                      {errors.typography}
                    </div>
                  )}
                </div>

                {/* Color Palette */}
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                    Color Palette <span className="text-danger">*</span>
                  </label>
                  <div className="d-flex gap-2 align-items-center flex-wrap mb-2">
                    {formData.color_palette.map((color, index) => (
                      <div
                        key={index}
                        style={{
                          width: "60px",
                          height: "60px",
                          backgroundColor: color,
                          borderRadius: "6px",
                          border: "2px solid #dee2e6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                          position: "relative",
                        }}
                      >
                        {color}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              color_palette: prev.color_palette.filter((_, i) => i !== index),
                            }));
                          }}
                          style={{
                            position: "absolute",
                            top: "-8px",
                            right: "-8px",
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            backgroundColor: "#dc3545",
                            border: "none",
                            color: "#fff",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => handleGenerateField("color_palette")}
                      disabled={loading || generatingField === "color_palette"}
                      title="Generate with AI"
                    >
                      {generatingField === "color_palette" ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        <>
                          <Icon icon="solar:magic-stick-3-bold" width="16" height="16" /> Generate
                        </>
                      )}
                    </button>
                  </div>
                  {errors.color_palette && (
                    <div className="text-danger" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                      {errors.color_palette}
                    </div>
                  )}
                </div>

                {/* Logo */}
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                    Logo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e.target.files[0])}
                    disabled={loading}
                    className="form-control"
                    style={{ maxWidth: "300px" }}
                  />
                  {formData.logo_path && (
                    <div className="mt-2">
                      <img
                        src={formData.logo_path}
                        alt="Logo preview"
                        style={{ maxWidth: "200px", maxHeight: "100px", objectFit: "contain" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: ICP Selection */}
            {currentStep === 3 && (
              <div>
                <h6 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "12px" }}>
                  ICP Source
                </h6>
                <p style={{ fontSize: "0.875rem", color: "#6c757d", marginBottom: "20px" }}>
                  Choose how you want to generate your Ideal Customer Profile.
                </p>

                <div className="mb-3">
                  {/* Generic ICP */}
                  <div
                    onClick={() => setIcpSource("generic")}
                    style={{
                      padding: "16px",
                      marginBottom: "12px",
                      border: `2px solid ${icpSource === "generic" ? "#0d6efd" : "#dee2e6"}`,
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: icpSource === "generic" ? "#f0f7ff" : "#fff",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="radio"
                        checked={icpSource === "generic"}
                        onChange={() => setIcpSource("generic")}
                      />
                      <div>
                        <strong>Generic ICP</strong>
                        <p style={{ fontSize: "0.875rem", color: "#6c757d", margin: "4px 0 0 0" }}>
                          AI generates based on brand information.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Specific Manual */}
                  <div
                    onClick={() => setIcpSource("specific_manual")}
                    style={{
                      padding: "16px",
                      marginBottom: "12px",
                      border: `2px solid ${icpSource === "specific_manual" ? "#0d6efd" : "#dee2e6"}`,
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: icpSource === "specific_manual" ? "#f0f7ff" : "#fff",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="radio"
                        checked={icpSource === "specific_manual"}
                        onChange={() => setIcpSource("specific_manual")}
                      />
                      <div>
                        <strong>Specific Manual</strong>
                        <p style={{ fontSize: "0.875rem", color: "#6c757d", margin: "4px 0 0 0" }}>
                          Fill persona details manually.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Specific Database */}
                  <div
                    onClick={() => setIcpSource("specific_database")}
                    style={{
                      padding: "16px",
                      border: `2px solid ${icpSource === "specific_database" ? "#0d6efd" : "#dee2e6"}`,
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: icpSource === "specific_database" ? "#f0f7ff" : "#fff",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="radio"
                        checked={icpSource === "specific_database"}
                        onChange={() => setIcpSource("specific_database")}
                      />
                      <div>
                        <strong>Specific Database</strong>
                        <p style={{ fontSize: "0.875rem", color: "#6c757d", margin: "4px 0 0 0" }}>
                          Generate from database analysis.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generic ICP Generation */}
                {icpSource === "generic" && !icp && (
                  <button
                    type="button"
                    className="btn btn-primary mb-3"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const response = await brandkitApi.generateField(
                          "icp_generic",
                          formData.niche || "",
                          {},
                          formData
                        );
                        setIcp(response.icp);
                      } catch (error) {
                        console.error("Error generating ICP:", error);
                        alert(`Failed to generate ICP: ${error.response?.data?.detail || error.message}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? "Generating..." : "Generate Generic ICP"}
                  </button>
                )}

                {/* Specific Manual Form */}
                {icpSource === "specific_manual" && (
                  <ICPConfiguration
                    icp={icp}
                    onChange={setIcp}
                    mode="create"
                  />
                )}

                {/* Database Configuration */}
                {icpSource === "specific_database" && (
                  <div className="border rounded p-3" style={{ backgroundColor: "#f8f9fa" }}>
                    <h6 style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "16px" }}>
                      Database Connection
                    </h6>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>
                          Database Type <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select form-select-sm"
                          value={dbConfig.db_type}
                          onChange={(e) =>
                            setDbConfig((prev) => ({ ...prev, db_type: e.target.value }))
                          }
                        >
                          <option value="mysql">MySQL</option>
                          <option value="postgresql">PostgreSQL</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>
                          Host <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={dbConfig.host}
                          onChange={(e) =>
                            setDbConfig((prev) => ({ ...prev, host: e.target.value }))
                          }
                          placeholder="localhost"
                        />
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>
                          Port <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={dbConfig.port}
                          onChange={(e) =>
                            setDbConfig((prev) => ({ ...prev, port: parseInt(e.target.value) || 3306 }))
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>
                          Username <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={dbConfig.username}
                          onChange={(e) =>
                            setDbConfig((prev) => ({ ...prev, username: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>
                          Password <span className="text-danger">*</span>
                        </label>
                        <input
                          type="password"
                          className="form-control form-control-sm"
                          value={dbConfig.password}
                          onChange={(e) =>
                            setDbConfig((prev) => ({ ...prev, password: e.target.value }))
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>
                          Database <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={dbConfig.database}
                          onChange={(e) =>
                            setDbConfig((prev) => ({ ...prev, database: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    {dbConfig.db_type === "postgresql" && (
                      <div className="mb-3">
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>
                          Schema
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={dbConfig.db_schema}
                          onChange={(e) =>
                            setDbConfig((prev) => ({ ...prev, db_schema: e.target.value }))
                          }
                          placeholder="public"
                        />
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label" style={{ fontSize: "0.75rem" }}>
                        Table Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={dbConfig.table_name}
                        onChange={(e) =>
                          setDbConfig((prev) => ({ ...prev, table_name: e.target.value }))
                        }
                        placeholder="customers"
                      />
                    </div>

                    <h6 style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "12px", marginTop: "20px" }}>
                      Column Mappings
                    </h6>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>
                          Age Column
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={dbConfig.age_column}
                          onChange={(e) =>
                            setDbConfig((prev) => ({ ...prev, age_column: e.target.value }))
                          }
                          placeholder="age"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>
                          Gender Column
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={dbConfig.gender_column}
                          onChange={(e) =>
                            setDbConfig((prev) => ({ ...prev, gender_column: e.target.value }))
                          }
                          placeholder="gender"
                        />
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>
                          Location Column
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={dbConfig.location_column}
                          onChange={(e) =>
                            setDbConfig((prev) => ({ ...prev, location_column: e.target.value }))
                          }
                          placeholder="location"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>
                          Title Column
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={dbConfig.title_column}
                          onChange={(e) =>
                            setDbConfig((prev) => ({ ...prev, title_column: e.target.value }))
                          }
                          placeholder="job_title"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label" style={{ fontSize: "0.75rem" }}>
                        Created At Column
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={dbConfig.created_at_column}
                        onChange={(e) =>
                          setDbConfig((prev) => ({ ...prev, created_at_column: e.target.value }))
                        }
                        placeholder="created_at"
                      />
                    </div>

                    <h6 style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "12px", marginTop: "20px" }}>
                      Time Range
                    </h6>

                    <div className="mb-3">
                      <label className="form-label" style={{ fontSize: "0.75rem" }}>
                        Range Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={timeRange.range_type}
                        onChange={(e) =>
                          setTimeRange((prev) => ({
                            ...prev,
                            range_type: e.target.value,
                            month: null,
                            year: null,
                          }))
                        }
                      >
                        <option value="last_30_days">Last 30 days</option>
                        <option value="this_year">This year</option>
                        <option value="specific_month">Specific month</option>
                        <option value="specific_year">Specific year</option>
                      </select>
                    </div>

                    {timeRange.range_type === "specific_month" && (
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <label className="form-label" style={{ fontSize: "0.75rem" }}>
                            Month (1-12) <span className="text-danger">*</span>
                          </label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            min="1"
                            max="12"
                            value={timeRange.month || ""}
                            onChange={(e) =>
                              setTimeRange((prev) => ({
                                ...prev,
                                month: parseInt(e.target.value) || null,
                              }))
                            }
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label" style={{ fontSize: "0.75rem" }}>
                            Year <span className="text-danger">*</span>
                          </label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={timeRange.year || ""}
                            onChange={(e) =>
                              setTimeRange((prev) => ({
                                ...prev,
                                year: parseInt(e.target.value) || null,
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}

                    {timeRange.range_type === "specific_year" && (
                      <div className="mb-3">
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>
                          Year <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={timeRange.year || ""}
                          onChange={(e) =>
                            setTimeRange((prev) => ({
                              ...prev,
                              year: parseInt(e.target.value) || null,
                            }))
                          }
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleGenerateICPFromDB}
                      disabled={loading}
                    >
                      {loading ? "Generating..." : "Generate ICP from Database"}
                    </button>
                  </div>
                )}

                {icp && icpSource === "generic" && (
                  <div className="mt-3 p-3 border rounded" style={{ backgroundColor: "#f8f9fa" }}>
                    <h6 style={{ fontSize: "0.875rem", fontWeight: "600" }}>Generated ICP:</h6>
                    <pre style={{ fontSize: "0.75rem", margin: 0 }}>
                      {JSON.stringify(icp, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ padding: "16px 20px", borderTop: "1px solid #e9ecef" }}>
            <button
              type="button"
              onClick={currentStep === 1 ? onClose : handlePrevious}
              disabled={loading}
              className="btn btn-secondary"
            >
              {currentStep === 1 ? "Cancel" : "Previous"}
            </button>
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="btn btn-primary"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? "Creating..." : "Create Brandkit"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExistingBrandkitForm;


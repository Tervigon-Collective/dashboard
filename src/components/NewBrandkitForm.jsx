"use client";
import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import * as brandkitApi from "@/services/contentGenerationApi";
import ICPConfiguration from "./ICPConfiguration/ICPConfiguration";
import { normalizeLogoUrlFromString } from "@/utils/logoUtils";

// Font Combobox Component - Text field with dropdown
const FontCombobox = ({ value, fonts, fontsError, typoMode, loading, onChange, onRemove }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredFonts, setFilteredFonts] = useState(fonts);
  const [inputValue, setInputValue] = useState(value || "");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter fonts based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = fonts.filter((font) =>
        font.family.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredFonts(filtered.slice(0, 10)); // Limit to 10 results
    } else {
      setFilteredFonts(fonts.slice(0, 20)); // Show first 20 when empty
    }
  }, [inputValue, fonts]);

  // Update input when value prop changes
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsDropdownOpen(true);
  };

  const handleSelectFont = (fontFamily) => {
    setInputValue(fontFamily);
    onChange(fontFamily);
    setIsDropdownOpen(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  return (
    <div className="mb-2 position-relative" ref={dropdownRef}>
      <div className="input-group">
        <input
          ref={inputRef}
          type="text"
          className="form-control"
          placeholder="Type font name or select from dropdown..."
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsDropdownOpen(true)}
          disabled={loading}
        />
        {typoMode === "dropdown" && !fontsError && fonts.length > 0 && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={loading}
            style={{ borderLeft: "none" }}
          >
            <Icon icon={isDropdownOpen ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"} width="16" height="16" />
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={onRemove}
            disabled={loading}
            title="Remove font"
          >
            ×
          </button>
        )}
      </div>
      {isDropdownOpen && typoMode === "dropdown" && !fontsError && fonts.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: "200px",
            overflowY: "auto",
            backgroundColor: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "0 0 6px 6px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            marginTop: "-1px",
          }}
        >
          {filteredFonts.length > 0 ? (
            filteredFonts.map((font) => (
              <div
                key={font.family}
                onClick={() => handleSelectFont(font.family)}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  borderBottom: "1px solid #f0f0f0",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#fff";
                }}
              >
                {font.family}
                {font.is_material_symbols && (
                  <span style={{ color: "#6c757d", fontSize: "0.75rem", marginLeft: "8px" }}>(Icons)</span>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: "8px 12px", fontSize: "0.875rem", color: "#6c757d" }}>
              No fonts found. Type to search or enter custom font name.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const NewBrandkitForm = ({ isOpen, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1: Brand Type, 2: Fields, 3: ICP
  const [brandType, setBrandType] = useState("");
  const [formData, setFormData] = useState({
    brand_name: "",
    tagline: "",
    target_audience: "",
    color_palette: [],
    typography: {
      fonts: [],
      primary: "",
      secondary: null,
      fallback_stack: "Arial, sans-serif",
    },
    logo_path: null,
    logo_url: null,
    brand_description: "",
    niche: "",
  });
  const [icp, setIcp] = useState(null);
  const [icpType, setIcpType] = useState("generic"); // "generic" or "specific"
  const [icpFields, setIcpFields] = useState({
    name: "",
    age_range: "",
    region: "",
    gender: "",
    title: "",
  });
  const [fonts, setFonts] = useState([]);
  const [fontsError, setFontsError] = useState(false);
  const [typoMode, setTypoMode] = useState("dropdown"); // "dropdown" or "manual"
  const [colorMode, setColorMode] = useState("ai"); // "manual" or "ai"
  const [colorTone, setColorTone] = useState("");
  const [manualColor, setManualColor] = useState("");
  const [aiGeneratedColors, setAiGeneratedColors] = useState([]);
  const [colorInputError, setColorInputError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingField, setGeneratingField] = useState(null);
  const [errors, setErrors] = useState({});

  // Ensure a clean slate whenever the modal is opened for a new brand
  useEffect(() => {
    if (!isOpen) return;

    // Reset wizard to initial step and clear all user-entered data
    setCurrentStep(1);
    setBrandType("");
    setFormData({
      brand_name: "",
      tagline: "",
      target_audience: "",
      color_palette: [],
      typography: {
        fonts: [],
        primary: "",
        secondary: null,
        fallback_stack: "Arial, sans-serif",
      },
      logo_path: null,
      logo_url: null,
      logo_paths: [],
      logo_urls: [],
      brand_description: "",
      niche: "",
    });
    setIcp(null);
    setIcpType("generic");
    setIcpFields({
      name: "",
      age_range: "",
      region: "",
      gender: "",
      title: "",
    });
    setColorTone("");
    setManualColor("");
    setAiGeneratedColors([]);
    setColorInputError("");
    setGeneratingField(null);
    setErrors({});
  }, [isOpen]);

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

  // Validate step 1 (Brand Type)
  const validateStep1 = () => {
    if (!brandType.trim()) {
      setErrors({ brand_type: "Brand type is required" });
      return false;
    }
    setErrors({});
    return true;
  };

  // Validate step 2 (Fields)
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
    // Validate typography - at least one font is required
    const hasPrimaryFont = formData.typography?.fonts?.[0]?.family || formData.typography?.primary;
    if (!hasPrimaryFont) {
      newErrors.typography = "At least one font is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
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

  // Generate single field
  const handleGenerateField = async (fieldName, extraParams = {}, isRegenerate = false) => {
    if (!brandType.trim()) {
      alert("Please enter a brand type first");
      return;
    }

    setGeneratingField(fieldName);
    try {
      // Build existing data - for regeneration, include existing values
      let existingData = fieldName.startsWith("icp_") ? { icp: { persona: icpFields } } : formData;
      
      // For color regeneration, include existing color palette to avoid duplicates
      if (fieldName === "color_palette" && isRegenerate) {
        const allExistingColors = [
          ...(formData.color_palette || []),
          ...aiGeneratedColors,
        ];
        existingData = {
          ...existingData,
          color_palette: allExistingColors.length > 0 ? allExistingColors : undefined,
        };
      }
      
      // Add regenerate flag to extraParams
      const paramsWithRegenerate = {
        ...extraParams,
        regenerate: isRegenerate,
      };

      const response = await brandkitApi.generateField(
        fieldName,
        brandType.trim(),
        {
          industry: formData.niche || "",
        },
        existingData,
        paramsWithRegenerate
      );

      if (fieldName === "color_palette") {
        // Handle response - it might be an array of colors or an object with colors
        let generatedColors = [];
        if (Array.isArray(response)) {
          generatedColors = response;
        } else if (response.color_palette && Array.isArray(response.color_palette)) {
          generatedColors = response.color_palette;
        } else if (response.colors && Array.isArray(response.colors)) {
          generatedColors = response.colors;
        } else if (typeof response === 'string') {
          // If it's a JSON string, parse it
          try {
            const parsed = JSON.parse(response);
            generatedColors = Array.isArray(parsed) ? parsed : (parsed.color_palette || []);
          } catch {
            // If parsing fails, try to extract hex colors from the string
            const hexMatches = response.match(/#[0-9A-Fa-f]{6}/gi);
            generatedColors = hexMatches || [];
          }
        }

        // Normalize all colors to uppercase hex
        generatedColors = generatedColors
          .map(color => normalizeHexColor(color))
          .filter(color => color !== null);

        if (generatedColors.length > 0) {
          setAiGeneratedColors(generatedColors);
        } else {
          alert("No colors were generated. Please try again.");
        }
      } else if (fieldName === "typography") {
        // Handle new typography structure with fonts array
        const newTypography = response.typography || prev.typography;
        setFormData((prev) => ({
          ...prev,
          typography: {
            fonts: newTypography.fonts || (newTypography.primary ? [{ family: newTypography.primary }] : []),
            primary: newTypography.primary || newTypography.fonts?.[0]?.family || "",
            secondary: newTypography.secondary || newTypography.fonts?.[1]?.family || null,
            fallback_stack: newTypography.fallback_stack || "Arial, sans-serif",
          },
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

  // Generate all fields
  const handleGenerateAll = async () => {
    if (!brandType.trim()) {
      alert("Please enter a brand type first");
      return;
    }

    setLoading(true);
    try {
      const response = await brandkitApi.generateGlobalBrandkit(
        brandType.trim(),
        {
          industry: formData.niche || "",
          target_market: formData.target_audience || "",
        },
        {}
      );

      setFormData({
        brand_name: response.brand_name || "",
        tagline: response.tagline || response.brand_essence?.tagline || "",
        target_audience: response.target_audience || "",
        color_palette: response.color_palette || [],
        typography: response.typography || {
          primary: "",
          secondary: null,
          fallback_stack: "Arial, sans-serif",
        },
        logo_path: response.logo_path || null, // Keep for backward compatibility
        logo_url: response.logo_url || null, // Keep for backward compatibility
        logo_paths: response.logo_paths || (response.logo_path ? [response.logo_path] : []),
        logo_urls: response.logo_urls || (response.logo_url ? [response.logo_url] : []),
        brand_description: response.brand_description || "",
        niche: response.niche || "",
      });

      // If ICP is generated, set it
      if (response.icp) {
        setIcp(response.icp);
        setIcpType(response.icp.type || "generic");
      }
    } catch (error) {
      console.error("Error generating brandkit:", error);
      alert(`Failed to generate brandkit: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate logo
  const handleGenerateLogo = async (method = "gemini") => {
    if (!formData.brand_name.trim()) {
      alert("Please enter a brand name first");
      return;
    }

    setLoading(true);
    try {
      const response = await brandkitApi.generateLogo(
        formData.brand_name,
        brandType.trim(),
        formData.color_palette,
        "",
        method
      );

      if (response.success) {
        // Prefer logo_url if available (normalized by backend), otherwise use logo_path
        const logoDisplayUrl = response.logo_url || response.logo_path;
        
        if (logoDisplayUrl) {
          setFormData((prev) => ({
            ...prev,
            logo_path: response.logo_path || logoDisplayUrl, // Keep logo_path for submission
            logo_url: response.logo_url || null, // Store logo_url if available
          }));
          alert("Logo generated successfully!");
        } else {
          console.warn("Logo generation succeeded but no logo URL/path returned:", response);
          alert("Logo generation completed, but the logo path is not available. Please try again.");
        }
      } else {
        alert(`Logo generation failed: ${response.error || response.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error generating logo:", error);
      alert(`Failed to generate logo: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (file) => {
    if (!file) return;

    setLoading(true);
    try {
      // For now, we'll need to create a temporary brandkit or use a different endpoint
      // This will be handled after brandkit creation
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          logo_path: reader.result, // Temporary, will be uploaded after creation
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

  // Handle manual color addition
  // Color validation and normalization helpers
  const normalizeHexColor = (color) => {
    if (!color || typeof color !== 'string') return null;
    
    // Remove whitespace
    color = color.trim();
    
    // Handle RGB format: rgb(255, 0, 0) or rgba(255, 0, 0, 1)
    const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/i);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
      const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
      const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`.toUpperCase();
    }
    
    // Handle hex with or without #
    if (!color.startsWith('#')) {
      color = '#' + color;
    }
    
    // Handle 3-digit hex (#FFF -> #FFFFFF)
    if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
      return color.toUpperCase().replace(/^#([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])$/, '#$1$1$2$2$3$3');
    }
    
    // Handle 6-digit hex
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return color.toUpperCase();
    }
    
    return null;
  };

  const handleAddManualColor = () => {
    const normalized = normalizeHexColor(manualColor);
    if (normalized) {
      setFormData((prev) => ({
        ...prev,
        color_palette: [...prev.color_palette, normalized],
      }));
      setManualColor("");
      setColorInputError("");
    } else {
      setColorInputError("Use 3 or 6-digit hex, e.g. #FF5733");
    }
  };

  // Remove logo
  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logo_path: null,
      logo_url: null,
      logo_paths: [],
      logo_urls: [],
    }));
  };

  // Normalize typography for new backend structure (fonts array) while keeping legacy fields
  const buildTypographyPayload = (typography) => {
    if (!typography) return undefined;

    // If fonts already exist, ensure legacy fields are populated and return as-is
    if (Array.isArray(typography.fonts) && typography.fonts.length > 0) {
      const primary = typography.primary || typography.fonts[0]?.family || "";
      const secondary =
        typography.secondary || typography.fonts[1]?.family || "";
      return {
        ...typography,
        primary,
        secondary,
      };
    }

    const fonts = [];
    if (typography.primary) {
      fonts.push({ family: typography.primary });
    }
    if (typography.secondary) {
      fonts.push({ family: typography.secondary });
    }

    return {
      ...typography,
      fonts,
    };
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }

    // Build ICP object if specific
    let finalIcp = null;
    if (icpType === "specific") {
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
    } else if (icpType === "generic" && icp) {
      finalIcp = icp;
    }

    setLoading(true);

    try {
      const brandId = formData.brand_name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      // Prepare logo data - prefer arrays, fallback to single values
      const logoPaths = formData.logo_paths && formData.logo_paths.length > 0
        ? formData.logo_paths
        : formData.logo_path
        ? [formData.logo_path]
        : [];
      
      const logoUrls = formData.logo_urls && formData.logo_urls.length > 0
        ? formData.logo_urls
        : formData.logo_url
        ? [formData.logo_url]
        : [];

      const payload = {
        brand_type: brandType.trim(),
        brand_id: brandId,
        brand_name: formData.brand_name.trim(),
        brand_description: formData.brand_description || formData.tagline,
        niche: formData.niche || finalBrandType,
        color_palette: formData.color_palette,
        typography: buildTypographyPayload(formData.typography),
        logo_path: formData.logo_path, // Keep for backward compatibility
        logo_paths: logoPaths, // New array format
        logo_urls: logoUrls, // New array format
        tagline: formData.tagline.trim(),
        target_audience: formData.target_audience || "",
        icp: finalIcp || undefined,
      };

      const response = await brandkitApi.createNewBrandkit(payload);
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
              Create New Brandkit
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

            {/* Step 1: Brand Type */}
            {currentStep === 1 && (
              <div>
                <h6 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "12px" }}>
                  What do you sell, or what is the speciality of your brand? <span className="text-danger">*</span>
                </h6>
                <p style={{ fontSize: "0.875rem", color: "#6c757d", marginBottom: "20px" }}>
                  e.g., pet accessories, home décor, bakery services, fitness coaching
                </p>

                <div className="mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., pet accessories, home décor, bakery services"
                    value={brandType}
                    onChange={(e) => {
                      setBrandType(e.target.value);
                      setErrors({});
                    }}
                    required
                    style={{ maxWidth: "600px" }}
                  />
                </div>

                {errors.brand_type && (
                  <div className="text-danger" style={{ fontSize: "0.875rem" }}>
                    {errors.brand_type}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Brand Fields */}
            {currentStep === 2 && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 style={{ fontSize: "1rem", fontWeight: "600", margin: 0 }}>
                    Brand Information
                  </h6>
                  <button
                    type="button"
                    onClick={handleGenerateAll}
                    disabled={loading || generatingField}
                    className="btn btn-primary btn-sm"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                    Generate All with AI
                  </button>
                </div>

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

                {/* Target Audience */}
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                    Target Audience
                  </label>
                  <div className="input-group">
                    <textarea
                      className="form-control"
                      value={formData.target_audience}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, target_audience: e.target.value }))
                      }
                      placeholder="Describe your target audience"
                      rows={3}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => handleGenerateField("target_audience")}
                      disabled={loading || generatingField === "target_audience"}
                      title="Generate with AI"
                    >
                      {generatingField === "target_audience" ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Color Palette */}
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                    Color Palette <span className="text-danger">*</span>
                  </label>
                  
                  {/* Mode Toggle */}
                  <div className="mb-3">
                    <div
                      style={{
                        display: "flex",
                        gap: "0",
                        backgroundColor: "#f8f9fa",
                        borderRadius: "8px",
                        padding: "4px",
                        border: "1px solid #e9ecef",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setColorMode("manual")}
                        disabled={loading}
                        style={{
                          flex: 1,
                          padding: "8px 16px",
                          fontSize: "0.8125rem",
                          fontWeight: "500",
                          borderRadius: "6px",
                          cursor: loading ? "not-allowed" : "pointer",
                          transition: "all 0.2s ease",
                          backgroundColor: colorMode === "manual" ? "#0d6efd" : "transparent",
                          color: colorMode === "manual" ? "#fff" : "#495057",
                          border: colorMode === "manual" ? "1px solid #0b5ed7" : "1px solid #dee2e6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <span>🎨</span>
                        <span>Manual</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setColorMode("ai")}
                        disabled={loading}
                        style={{
                          flex: 1,
                          padding: "8px 16px",
                          fontSize: "0.8125rem",
                          fontWeight: "500",
                          borderRadius: "6px",
                          cursor: loading ? "not-allowed" : "pointer",
                          transition: "all 0.2s ease",
                          backgroundColor: colorMode === "ai" ? "#0d6efd" : "transparent",
                          color: colorMode === "ai" ? "#fff" : "#495057",
                          border: colorMode === "ai" ? "1px solid #0b5ed7" : "1px solid #dee2e6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <span>⚡</span>
                        <span>AI Generate</span>
                      </button>
                    </div>
                  </div>

                  {/* Manual Mode */}
                  {colorMode === "manual" && (
                    <div className="mb-3">
                      <div className="d-flex gap-2 align-items-center">
                        {/* Live Color Preview Circle */}
                        <div
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const input = document.createElement("input");
                            input.type = "color";
                            const normalized = normalizeHexColor(manualColor) || "#FF5733";
                            input.value = normalized;
                            input.style.position = "fixed";
                            input.style.left = (rect.left + rect.width / 2) + "px";
                            input.style.top = (rect.top + rect.height / 2) + "px";
                            input.style.width = "1px";
                            input.style.height = "1px";
                            input.style.opacity = "0";
                            input.style.pointerEvents = "none";
                            input.style.zIndex = "10000";
                            input.onchange = (ev) => {
                              const newColor = normalizeHexColor(ev.target.value) || "#FF5733";
                              setManualColor(newColor);
                              setColorInputError("");
                              if (document.body.contains(input)) {
                                document.body.removeChild(input);
                              }
                            };
                            input.onblur = () => {
                              if (document.body.contains(input)) {
                                document.body.removeChild(input);
                              }
                            };
                            document.body.appendChild(input);
                            setTimeout(() => {
                              input.focus();
                              input.click();
                            }, 10);
                          }}
                          style={{
                            width: "44px",
                            height: "44px",
                            backgroundColor: normalizeHexColor(manualColor) || "#FF5733",
                            border: "2px solid #e9ecef",
                            borderRadius: "50%",
                            cursor: "pointer",
                            flexShrink: 0,
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.1)";
                            e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                          }}
                          title="Click to open color picker"
                        />
                        <input
                          type="text"
                          className={`form-control ${colorInputError ? "is-invalid" : ""}`}
                          placeholder="#FF5733"
                          value={manualColor}
                          onChange={(e) => {
                            const value = e.target.value;
                            setManualColor(value);
                            // Validate on change
                            if (value.trim()) {
                              const normalized = normalizeHexColor(value);
                              if (!normalized) {
                                setColorInputError("Use 3 or 6-digit hex, e.g. #FF5733");
                              } else {
                                setColorInputError("");
                              }
                            } else {
                              setColorInputError("");
                            }
                          }}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddManualColor();
                            }
                          }}
                          style={{
                            maxWidth: "200px",
                            border: colorInputError ? "1px solid #dc3545" : "1px solid #dee2e6",
                            color: manualColor ? "#212529" : "#6c757d",
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={handleAddManualColor}
                        >
                          Add Color
                        </button>
                      </div>
                      {colorInputError && (
                        <div className="text-danger mt-1" style={{ fontSize: "0.6875rem" }}>
                          {colorInputError}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Mode */}
                  {colorMode === "ai" && (
                    <div
                      style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e9ecef",
                        borderRadius: "8px",
                        padding: "20px",
                        marginBottom: "16px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          color: "#6c757d",
                          marginBottom: "16px",
                        }}
                      >
                        Let AI suggest a palette based on your brand.
                      </p>

                      {/* Style Options Chips */}
                      <div className="mb-3">
                        <div
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "500",
                            color: "#495057",
                            marginBottom: "8px",
                          }}
                        >
                          Style (Optional):
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {["Vibrant", "Minimal", "Earthy", "Luxury", "Warm", "Cool", "Modern", "Vintage"].map((style) => {
                            const styleValue = style.toLowerCase();
                            return (
                              <button
                                key={style}
                                type="button"
                                onClick={() => setColorTone(colorTone === styleValue ? "" : styleValue)}
                                disabled={loading || generatingField === "color_palette"}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "0.75rem",
                                  fontWeight: "500",
                                  border: "1px solid #dee2e6",
                                  borderRadius: "20px",
                                  backgroundColor: colorTone === styleValue ? "#0d6efd" : "#ffffff",
                                  color: colorTone === styleValue ? "#fff" : "#495057",
                                  cursor: loading || generatingField === "color_palette" ? "not-allowed" : "pointer",
                                  transition: "all 0.2s ease",
                                  opacity: loading || generatingField === "color_palette" ? 0.6 : 1,
                                }}
                              >
                                {style}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Generate Button */}
                      <button
                        type="button"
                        onClick={() => handleGenerateField("color_palette", colorTone ? { color_tone: colorTone } : {})}
                        disabled={loading || generatingField === "color_palette"}
                        style={{
                          width: "100%",
                          padding: "10px 20px",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          backgroundColor: "#0d6efd",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: loading || generatingField === "color_palette" ? "not-allowed" : "pointer",
                          transition: "all 0.2s ease",
                          opacity: loading || generatingField === "color_palette" ? 0.6 : 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        {generatingField === "color_palette" ? (
                          <>
                            <span className="spinner-border spinner-border-sm" style={{ width: "14px", height: "14px" }} />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Icon icon="solar:magic-stick-3-bold" width="18" height="18" />
                            <span>Generate Palette</span>
                          </>
                        )}
                      </button>

                      {/* Generated Colors Display */}
                      {aiGeneratedColors.length > 0 && (
                        <div style={{ marginTop: "20px" }}>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              color: "#495057",
                              marginBottom: "12px",
                            }}
                          >
                            Generated Colors:
                          </div>
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            {aiGeneratedColors.map((color, index) => (
                              <div
                                key={index}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <div
                                  style={{
                                    width: "60px",
                                    height: "60px",
                                    backgroundColor: color,
                                    border: "3px solid #fff",
                                    borderRadius: "8px",
                                    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                                  }}
                                />
                                <span
                                  style={{
                                    fontSize: "0.6875rem",
                                    fontFamily: "monospace",
                                    color: "#6c757d",
                                  }}
                                >
                                  {color.toUpperCase()}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleGenerateField("color_palette", colorTone ? { color_tone: colorTone } : {}, true)}
                              disabled={loading || generatingField === "color_palette"}
                              style={{
                                flex: 1,
                                padding: "8px 16px",
                                fontSize: "0.8125rem",
                                fontWeight: "500",
                                backgroundColor: "#ffffff",
                                color: "#0d6efd",
                                border: "1px solid #0d6efd",
                                borderRadius: "6px",
                                cursor: loading || generatingField === "color_palette" ? "not-allowed" : "pointer",
                                transition: "all 0.2s ease",
                                opacity: loading || generatingField === "color_palette" ? 0.6 : 1,
                              }}
                            >
                              Regenerate
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  color_palette: [...prev.color_palette, ...aiGeneratedColors],
                                }));
                                setAiGeneratedColors([]);
                                setColorMode("manual");
                              }}
                              disabled={loading}
                              style={{
                                flex: 1,
                                padding: "8px 16px",
                                fontSize: "0.8125rem",
                                fontWeight: "500",
                                backgroundColor: "#28a745",
                                color: "#fff",
                                border: "none",
                                borderRadius: "6px",
                                cursor: loading ? "not-allowed" : "pointer",
                                transition: "all 0.2s ease",
                              }}
                            >
                              Accept Palette
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Color Chips */}
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
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {errors.color_palette && (
                    <div className="text-danger" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                      {errors.color_palette}
                    </div>
                  )}
                </div>

                {/* Typography */}
                <div className="mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500", margin: 0 }}>
                      Typography <span className="text-danger">*</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => handleGenerateField("typography")}
                      disabled={loading || generatingField === "typography"}
                      title="Generate with AI"
                      style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                    >
                      {generatingField === "typography" ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" style={{ width: "10px", height: "10px" }} />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Icon icon="solar:magic-stick-3-bold" width="14" height="14" className="me-1" />
                          AI Generate
                        </>
                      )}
                    </button>
                  </div>

                  {/* Font Entries */}
                  {(formData.typography?.fonts || []).length > 0 ? (
                    formData.typography.fonts.map((font, index) => (
                      <FontCombobox
                        key={index}
                        value={font.family || ""}
                        fonts={fonts}
                        fontsError={fontsError}
                        typoMode={typoMode}
                        loading={loading}
                        onChange={(newValue) => {
                          const newFonts = [...formData.typography.fonts];
                          newFonts[index] = { ...newFonts[index], family: newValue };
                          setFormData((prev) => ({
                            ...prev,
                            typography: {
                              ...prev.typography,
                              fonts: newFonts,
                              primary: newFonts[0]?.family || "",
                              secondary: newFonts[1]?.family || null,
                            },
                          }));
                        }}
                        onRemove={() => {
                          const newFonts = formData.typography.fonts.filter((_, i) => i !== index);
                          setFormData((prev) => ({
                            ...prev,
                            typography: {
                              ...prev.typography,
                              fonts: newFonts,
                              primary: newFonts[0]?.family || "",
                              secondary: newFonts[1]?.family || null,
                            },
                          }));
                        }}
                      />
                    ))
                  ) : (
                    <FontCombobox
                      value={formData.typography?.primary || ""}
                      fonts={fonts}
                      fontsError={fontsError}
                      typoMode={typoMode}
                      loading={loading}
                      onChange={(newValue) => {
                        setFormData((prev) => ({
                          ...prev,
                          typography: {
                            fonts: newValue ? [{ family: newValue }] : [],
                            primary: newValue,
                            secondary: null,
                            fallback_stack: prev.typography?.fallback_stack || "Arial, sans-serif",
                          },
                        }));
                      }}
                    />
                  )}

                  {/* Add Font Button */}
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm mt-2"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        typography: {
                          ...prev.typography,
                          fonts: [...(prev.typography?.fonts || []), { family: "" }],
                        },
                      }));
                    }}
                    disabled={loading}
                    style={{ fontSize: "0.75rem", padding: "4px 12px" }}
                  >
                    + Add Another Font
                  </button>

                  {fontsError && (
                    <small className="text-warning" style={{ fontSize: "0.75rem", display: "block", marginTop: "4px" }}>
                      Google Fonts failed to load. Using manual input.
                    </small>
                  )}
                  {errors.typography && (
                    <div className="text-danger" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                      {errors.typography}
                    </div>
                  )}
                </div>

                {/* Logo */}
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                    Logo
                  </label>
                  <div className="d-flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e.target.files[0])}
                      disabled={loading}
                      className="form-control"
                      style={{ maxWidth: "300px" }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => handleGenerateLogo("gemini")}
                      disabled={loading}
                    >
                      <Icon icon="solar:magic-stick-3-bold" width="16" height="16" /> Generate
                    </button>
                  </div>
                  {formData.logo_path && (
                    <div className="mt-2 d-flex align-items-center gap-2">
                      <img
                        src={normalizeLogoUrlFromString(formData.logo_url || formData.logo_path)}
                        alt="Logo preview"
                        style={{ maxWidth: "200px", maxHeight: "100px", objectFit: "contain" }}
                        onError={(e) => {
                          // Fallback: try using logo_path directly if logo_url fails
                          if (formData.logo_url && formData.logo_path !== formData.logo_url) {
                            e.target.src = normalizeLogoUrlFromString(formData.logo_path);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={handleRemoveLogo}
                        disabled={loading}
                      >
                        Remove Logo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: ICP Selection */}
            {currentStep === 3 && (
              <div>
                <h6 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "12px" }}>
                  Ideal Customer Profile (ICP)
                </h6>
                <p style={{ fontSize: "0.875rem", color: "#6c757d", marginBottom: "20px" }}>
                  Choose how you want to define your ideal customer profile.
                </p>

                {/* ICP Type Selection */}
                <div className="mb-3">
                  <div
                    onClick={() => setIcpType("generic")}
                    style={{
                      padding: "16px",
                      marginBottom: "12px",
                      border: `2px solid ${icpType === "generic" ? "#0d6efd" : "#dee2e6"}`,
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: icpType === "generic" ? "#f0f7ff" : "#fff",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="radio"
                        name="icp-type"
                        checked={icpType === "generic"}
                        onChange={() => setIcpType("generic")}
                      />
                      <div>
                        <strong>Generic ICP</strong>
                        <p style={{ fontSize: "0.875rem", color: "#6c757d", margin: "4px 0 0 0" }}>
                          Skip - AI will generate based on brand information.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setIcpType("specific")}
                    style={{
                      padding: "16px",
                      border: `2px solid ${icpType === "specific" ? "#0d6efd" : "#dee2e6"}`,
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: icpType === "specific" ? "#f0f7ff" : "#fff",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="radio"
                        name="icp-type"
                        checked={icpType === "specific"}
                        onChange={() => setIcpType("specific")}
                      />
                      <div>
                        <strong>Specific ICP</strong>
                        <p style={{ fontSize: "0.875rem", color: "#6c757d", margin: "4px 0 0 0" }}>
                          Fill 5 fields (Name, Age Range, Region, Gender, Title).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generic ICP - Skip (no form) */}
                {icpType === "generic" && (
                  <div className="alert alert-info" style={{ fontSize: "0.875rem" }}>
                    Generic ICP will be automatically generated when you create the brandkit.
                  </div>
                )}

                {/* Specific ICP - 5 Fields */}
                {icpType === "specific" && (
                  <div>
                    {/* Global AI Button */}
                    <div className="mb-3">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleGenerateField("icp_all_fields")}
                        disabled={loading || generatingField === "icp_all_fields"}
                      >
                        {generatingField === "icp_all_fields" ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Icon icon="solar:magic-stick-3-bold" width="16" height="16" className="me-2" />
                            Generate All ICP Fields
                          </>
                        )}
                      </button>
                    </div>

                    {/* Name Field */}
                    <div className="mb-3">
                      <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                        Name <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={icpFields.name}
                          onChange={(e) => setIcpFields({ ...icpFields, name: e.target.value })}
                          placeholder="e.g., Alex"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => handleGenerateField("icp_name")}
                          disabled={loading || generatingField === "icp_name"}
                        >
                          {generatingField === "icp_name" ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Age Range Field */}
                    <div className="mb-3">
                      <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                        Age Range <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={icpFields.age_range}
                          onChange={(e) => setIcpFields({ ...icpFields, age_range: e.target.value })}
                          placeholder="e.g., 25-35"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => handleGenerateField("icp_age_range")}
                          disabled={loading || generatingField === "icp_age_range"}
                        >
                          {generatingField === "icp_age_range" ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Region Field */}
                    <div className="mb-3">
                      <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                        Region <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={icpFields.region}
                          onChange={(e) => setIcpFields({ ...icpFields, region: e.target.value })}
                          placeholder="e.g., Urban areas, New York"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => handleGenerateField("icp_region")}
                          disabled={loading || generatingField === "icp_region"}
                        >
                          {generatingField === "icp_region" ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Gender Field */}
                    <div className="mb-3">
                      <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                        Gender <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={icpFields.gender}
                          onChange={(e) => setIcpFields({ ...icpFields, gender: e.target.value })}
                          placeholder="e.g., Diverse, Female, Male"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => handleGenerateField("icp_gender")}
                          disabled={loading || generatingField === "icp_gender"}
                        >
                          {generatingField === "icp_gender" ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Title Field */}
                    <div className="mb-3">
                      <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                        Title
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={icpFields.title}
                          onChange={(e) => setIcpFields({ ...icpFields, title: e.target.value })}
                          placeholder="e.g., Marketing Manager, Professional"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => handleGenerateField("icp_title")}
                          disabled={loading || generatingField === "icp_title"}
                        >
                          {generatingField === "icp_title" ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                          )}
                        </button>
                      </div>
                    </div>
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

export default NewBrandkitForm;


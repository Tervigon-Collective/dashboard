"use client";
import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import * as brandkitApi from "@/services/contentGenerationApi";
import ICPConfiguration from "./ICPConfiguration/ICPConfiguration";
import { normalizeLogoUrlFromString, normalizeLogoUrlsFromArray } from "@/utils/logoUtils";

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
  const [icp, setIcp] = useState(null);
  // icpSource controls whether the user wants to configure a specific ICP at all
  // "generic"  -> no ICP provided, system will infer generically from brand info
  // "specific" -> user will provide / generate a concrete ICP via one of the methods below
  const [icpSource, setIcpSource] = useState("generic");
  // icpMethod is only relevant when icpSource === "specific"
  // "manual"   -> Manual + AI ICP (form with 5 key fields + AI helpers)
  // "database" -> Generate ICP From Database
  const [icpMethod, setIcpMethod] = useState("manual");
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
  const [colorMode, setColorMode] = useState("ai"); // "manual" or "ai"
  const [colorTone, setColorTone] = useState("");
  const [manualColor, setManualColor] = useState("");
  const [aiGeneratedColors, setAiGeneratedColors] = useState([]);
  const [colorInputError, setColorInputError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingField, setGeneratingField] = useState(null);
  const [errors, setErrors] = useState({});

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
  });
  const [timeRange, setTimeRange] = useState({
    range_type: "last_30_days",
    month: null,
    year: null,
  });

  // Ensure each new "Existing Brand Continuation" session starts from a clean state
  useEffect(() => {
    if (!isOpen) return;

    setCurrentStep(1);
    setInputMethod("url");
    setWebsiteUrl("");
    setBrandDescription("");
    setExtractedData(null);
    setIsExtracting(false);
    setFormData({
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
      logo_url: null,
      brand_description: "",
      niche: "",
    });
    setIcp(null);
    setIcpSource("generic");
    setIcpMethod("manual");
    setIcpFields({
      name: "",
      age_range: "",
      region: "",
      gender: "",
      title: "",
    });
    setColorMode("ai");
    setColorTone("");
    setManualColor("");
    setAiGeneratedColors([]);
    setColorInputError("");
    setFontsError(false);
    setGeneratingField(null);
    setErrors({});
    setDbConfig({
      db_type: "mysql",
      host: "",
      port: 3306,
      username: "",
      password: "",
      database: "",
      db_schema: "",
      table_name: "",
    });
    setTimeRange({
      range_type: "last_30_days",
      month: null,
      year: null,
    });
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
      // Handle both new (logo_urls array) and old (logo_url/logo_path) formats
      const logoUrls = data.logo_urls && Array.isArray(data.logo_urls) && data.logo_urls.length > 0
        ? data.logo_urls
        : data.logo_paths && Array.isArray(data.logo_paths) && data.logo_paths.length > 0
        ? data.logo_paths
        : data.logo_url || data.logo_path
        ? [data.logo_url || data.logo_path]
        : [];

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
        logo_path: data.logo_path || data.logo_url || null, // Keep for backward compatibility
        logo_url: data.logo_url || null, // Keep for backward compatibility
        logo_paths: data.logo_paths || (data.logo_path ? [data.logo_path] : []),
        logo_urls: logoUrls,
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
        logo_path: data.logo_path || null,
        logo_url: data.logo_url || null,
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

  // Generate all brand information with AI
  const handleGenerateAllWithAI = async () => {
    if (!brandDescription.trim()) {
      alert("Please enter a brand description first");
      return;
    }

    setLoading(true);
    try {
      const data = await brandkitApi.generateFromDescription(brandDescription.trim());
      setExtractedData(data);

      // Auto-fill form with generated data
      setFormData({
        brand_name: data.brand_name || "",
        tagline: data.tagline || "",
        target_audience: data.target_audience || "",
        color_palette: data.color_palette || [],
        typography: data.typography || {
          primary: "",
          secondary: null,
          fallback_stack: "Arial, sans-serif",
        },
        logo_path: data.logo_path || data.logo_url || null, // Keep for backward compatibility
        logo_url: data.logo_url || null, // Keep for backward compatibility
        logo_paths: data.logo_paths || (data.logo_path ? [data.logo_path] : []),
        logo_urls: data.logo_urls || (data.logo_url ? [data.logo_url] : []),
        brand_description: brandDescription.trim(),
        niche: data.brand_type || brandDescription.trim(),
      });

      alert("All brand information generated successfully!");
    } catch (error) {
      console.error("Error generating all brand information:", error);
      alert(`Failed to generate: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

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

  // Generate single field
  const handleGenerateField = async (fieldName, extraParams = {}, isRegenerate = false) => {
    setGeneratingField(fieldName);
    try {
      // Build existing data - for regeneration, include existing values
      let existingData = fieldName.startsWith("icp_") ? { icp: { persona: icpFields } } : formData;
      
      // For ICP fields, include brand_type from formData or extractedData to help backend extraction
      if (fieldName.startsWith("icp_")) {
        existingData = {
          ...existingData,
          // Include brand_type from formData (which may have been set from extractedData.brand_type)
          brand_type: formData.niche || extractedData?.brand_type || "",
          // Also include niche as fallback (backend checks both)
          niche: formData.niche || "",
          // Include other relevant form data for context
          brand_name: formData.brand_name || "",
          tagline: formData.tagline || "",
          target_audience: formData.target_audience || "",
        };
      }
      
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
        formData.niche || brandDescription.trim() || "",
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

  // Generate ICP from database
  const handleGenerateICPFromDB = async () => {
    // Validate database config
    if (!dbConfig.host || !dbConfig.database || !dbConfig.table_name) {
      alert("Please fill in all required database fields");
      return;
    }

    setLoading(true);
    try {
      // Build existing_data with brand_type from multiple sources
      // Priority: formData.niche > extractedData.brand_type > brandDescription
      const brandType = 
        formData.niche || 
        extractedData?.brand_type || 
        brandDescription.trim() || 
        "";
      
      // Build comprehensive existing_data object for backend
      const existingData = {
        brand_type: brandType,
        // Include niche as fallback (backend checks both)
        niche: formData.niche || "",
        // Include other relevant brand information for context
        brand_name: formData.brand_name || "",
        tagline: formData.tagline || "",
        target_audience: formData.target_audience || "",
        brand_description: formData.brand_description || brandDescription.trim() || "",
        // Include extracted data if available
        ...(extractedData ? {
          extracted_brand_type: extractedData.brand_type,
          extracted_niche: extractedData.niche,
        } : {}),
      };
      
      // Debug logging
      console.log('[handleGenerateICPFromDB] Sending request with:', {
        brand_type: existingData.brand_type,
        niche: existingData.niche,
        has_brand_name: !!existingData.brand_name,
        has_tagline: !!existingData.tagline,
        existing_data_keys: Object.keys(existingData),
      });
      
      const response = await brandkitApi.generateICPFromDatabase(
        dbConfig,
        timeRange,
        existingData // Pass existing_data object instead of just brand_type string
      );

      setIcp(response);
      setIcpSource("specific");
      setIcpMethod("database");
      alert("ICP generated successfully from database!");
    } catch (error) {
      console.error("Error generating ICP from database:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
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
      // If no data has been extracted/generated in this session, clear formData to prevent showing stale data
      if (!extractedData) {
        setFormData({
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
          logo_url: null,
          logo_paths: [],
          logo_urls: [],
          brand_description: "",
          niche: "",
        });
        // Also clear any AI-generated colors that might be lingering
        setAiGeneratedColors([]);
      }
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
        formData.niche || brandDescription.trim() || "",
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

  // Handle logo upload (same behaviour as New Brand Creation)
  const handleLogoUpload = async (file) => {
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          logo_path: reader.result, // Temporary, will be stored as part of payload
          logo_url: null,
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

  // Remove logo (handles both single and array formats)
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

    setLoading(true);

    try {
      const brandId = formData.brand_name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      // Build ICP object
      // - When icpSource === "generic": no ICP is explicitly provided (system will infer generically)
      // - When icpSource === "specific":
      //     - icpMethod === "manual": use the 5-field Manual + AI ICP
      //     - icpMethod === "database": use the DB-generated ICP (if available)
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
          // Database ICP is expected to already be in the correct backend shape
          finalIcp = icp;
        }
      }

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
        brand_id: brandId,
        brand_name: formData.brand_name.trim(),
        brand_description: formData.brand_description || formData.tagline,
        niche: formData.niche || "",
        color_palette: formData.color_palette,
        typography: buildTypographyPayload(formData.typography),
        logo_path: formData.logo_path, // Keep for backward compatibility
        logo_paths: logoPaths, // New array format
        logo_urls: logoUrls, // New array format
        brand_essence: {
          core_message: formData.brand_description || "",
          tagline: formData.tagline.trim(),
          archetype_blend: null,
        },
        target_audience: formData.target_audience || "",
        // When finalIcp is null, omit ICP entirely so backend treats it as "no ICP configured"
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
                    onClick={() => {
                      // Switch to URL mode and clear description-based inputs/state
                      setInputMethod("url");
                      setBrandDescription("");
                      setExtractedData(null);
                    }}
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
                        onChange={() => {
                          setInputMethod("url");
                          setBrandDescription("");
                          setExtractedData(null);
                        }}
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
                    onClick={() => {
                      // Switch to description mode and clear URL-based inputs/state
                      setInputMethod("description");
                      setWebsiteUrl("");
                      setExtractedData(null);
                    }}
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
                        onChange={() => {
                          setInputMethod("description");
                          setWebsiteUrl("");
                          setExtractedData(null);
                        }}
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
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 style={{ fontSize: "1rem", fontWeight: "600", margin: 0 }}>
                    Brand Information
                  </h6>
                  {inputMethod === "description" && (
                    <button
                      type="button"
                      className="btn btn-primary d-inline-flex align-items-center gap-2"
                      onClick={handleGenerateAllWithAI}
                      disabled={loading || !brandDescription.trim()}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Icon icon="solar:magic-stick-3-bold" width="18" height="18" />
                          Generate All with AI
                        </>
                      )}
                    </button>
                  )}
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

                {/* Logo */}
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                    Logo
                  </label>
                  <div className="d-flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e.target.files?.[0])}
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
                  {/* Display multiple logos if available */}
                  {(formData.logo_urls?.length > 0 || formData.logo_paths?.length > 0 || formData.logo_path || formData.logo_url) && (
                    <div className="mt-2">
                      <div
                        className="logo-preview-grid"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                          gap: "1rem",
                        }}
                      >
                        {(formData.logo_urls || formData.logo_paths || (formData.logo_url || formData.logo_path ? [formData.logo_url || formData.logo_path] : [])).map((logoUrl, index) => {
                          const normalizedUrl = normalizeLogoUrlFromString(logoUrl);
                          return (
                            <div
                              key={index}
                              className="logo-preview"
                              style={{
                                position: "relative",
                                border: "1px solid #ddd",
                                borderRadius: "8px",
                                padding: "0.5rem",
                                backgroundColor: "#f8f9fa",
                              }}
                            >
                              <img
                                src={normalizedUrl}
                                alt={`Logo ${index + 1}`}
                                style={{
                                  width: "100%",
                                  height: "auto",
                                  maxHeight: "100px",
                                  objectFit: "contain",
                                  borderRadius: "4px",
                                }}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.parentElement.innerHTML = `
                                    <div class="text-muted text-center" style="padding: 1rem;">
                                      <i>Logo not found</i>
                                    </div>
                                  `;
                                }}
                              />
                              <div
                                style={{
                                  marginTop: "0.5rem",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "#6c757d",
                                  }}
                                >
                                  {index === 0 ? "Primary" : `Logo ${index + 1}`}
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => {
                                    const newUrls = formData.logo_urls || formData.logo_paths || [];
                                    const filtered = newUrls.filter((_, i) => i !== index);
                                    setFormData((prev) => ({
                                      ...prev,
                                      logo_urls: filtered,
                                      logo_paths: filtered,
                                      logo_path: filtered.length > 0 ? filtered[0] : null,
                                      logo_url: filtered.length > 0 ? filtered[0] : null,
                                    }));
                                  }}
                                  disabled={loading}
                                >
                                  <Icon icon="solar:trash-bin-2-bold" width="14" height="14" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {formData.logo_urls?.length > 0 || formData.logo_paths?.length > 0 ? (
                        <p className="text-muted mt-2" style={{ fontSize: "0.75rem" }}>
                          Found {formData.logo_urls?.length || formData.logo_paths?.length} logo(s) from website extraction
                        </p>
                      ) : null}
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
                  Choose how you want to handle your Ideal Customer Profile.
                </p>

                <div className="mb-3">
                  {/* Generic ICP (No ICP provided) */}
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
                          No ICP provided. The system will use generic targeting based on brand information.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Specific ICP */}
                  <div
                    onClick={() => setIcpSource("specific")}
                    style={{
                      padding: "16px",
                      border: `2px solid ${icpSource === "specific" ? "#0d6efd" : "#dee2e6"}`,
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: icpSource === "specific" ? "#f0f7ff" : "#fff",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="radio"
                        checked={icpSource === "specific"}
                        onChange={() => setIcpSource("specific")}
                      />
                      <div>
                        <strong>Specific ICP</strong>
                        <p style={{ fontSize: "0.875rem", color: "#6c757d", margin: "4px 0 0 0" }}>
                          Define a detailed ICP manually or generate it from your customer database.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Specific ICP Methods (only when icpSource === "specific") */}
                {icpSource === "specific" && (
                  <div className="mb-3">
                    <h6 style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "12px" }}>
                      Choose how to configure your specific ICP
                    </h6>

                    <div className="d-flex flex-column gap-2 mb-3">
                      {/* Option A: Manual + AI ICP */}
                      <div
                        onClick={() => setIcpMethod("manual")}
                        style={{
                          padding: "12px",
                          border: `2px solid ${icpMethod === "manual" ? "#0d6efd" : "#dee2e6"}`,
                          borderRadius: "6px",
                          cursor: "pointer",
                          backgroundColor: icpMethod === "manual" ? "#f0f7ff" : "#fff",
                        }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="radio"
                            checked={icpMethod === "manual"}
                            onChange={() => setIcpMethod("manual")}
                          />
                          <div>
                            <strong>Manual + AI ICP</strong>
                            <p style={{ fontSize: "0.875rem", color: "#6c757d", margin: "4px 0 0 0" }}>
                              Type in ICP fields manually, or use AI per field, or generate the entire ICP with one click.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Option B: Generate ICP From Database */}
                      <div
                        onClick={() => setIcpMethod("database")}
                        style={{
                          padding: "12px",
                          border: `2px solid ${icpMethod === "database" ? "#0d6efd" : "#dee2e6"}`,
                          borderRadius: "6px",
                          cursor: "pointer",
                          backgroundColor: icpMethod === "database" ? "#f0f7ff" : "#fff",
                        }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="radio"
                            checked={icpMethod === "database"}
                            onChange={() => setIcpMethod("database")}
                          />
                          <div>
                            <strong>Generate ICP From Database</strong>
                            <p style={{ fontSize: "0.875rem", color: "#6c757d", margin: "4px 0 0 0" }}>
                              Connect your customer database, fetch the schema, and let AI infer the best ICP.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual + AI ICP (5 core fields, shared with New Brandkit) */}
                {icpSource === "specific" && icpMethod === "manual" && (
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

                {/* Database Configuration */}
                {icpSource === "specific" && icpMethod === "database" && (
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
                          value={dbConfig.port === "" || dbConfig.port === null ? "" : dbConfig.port}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || value === null) {
                              setDbConfig((prev) => ({ ...prev, port: "" }));
                            } else {
                              const numValue = parseInt(value);
                              if (!isNaN(numValue)) {
                                setDbConfig((prev) => ({ ...prev, port: numValue }));
                              }
                            }
                          }}
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
                      {loading ? "Generating..." : "Generate ICP From Database"}
                    </button>

                    {/* Editable Generated ICP from Database */}
                    {icp && icpMethod === "database" && (
                      <div className="mt-4 p-3 border rounded" style={{ backgroundColor: "#f8f9fa" }}>
                        <h6 style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "16px" }}>
                          Generated ICP from Database
                        </h6>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                              Name
                            </label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={icp?.persona?.name || icp?.name || ""}
                              onChange={(e) => {
                                const updatedIcp = icp?.persona
                                  ? { ...icp, persona: { ...icp.persona, name: e.target.value } }
                                  : { ...icp, name: e.target.value };
                                setIcp(updatedIcp);
                              }}
                              placeholder="Enter name"
                              style={{ fontSize: "0.8125rem" }}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                              Age Range
                            </label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={icp?.persona?.age_range || icp?.age_range || ""}
                              onChange={(e) => {
                                const updatedIcp = icp?.persona
                                  ? { ...icp, persona: { ...icp.persona, age_range: e.target.value } }
                                  : { ...icp, age_range: e.target.value };
                                setIcp(updatedIcp);
                              }}
                              placeholder="e.g., 25-45"
                              style={{ fontSize: "0.8125rem" }}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                              Region
                            </label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={icp?.persona?.location || icp?.persona?.region || icp?.region || icp?.location || ""}
                              onChange={(e) => {
                                const updatedIcp = icp?.persona
                                  ? { ...icp, persona: { ...icp.persona, location: e.target.value, region: e.target.value } }
                                  : { ...icp, region: e.target.value, location: e.target.value };
                                setIcp(updatedIcp);
                              }}
                              placeholder="e.g., Mumbai"
                              style={{ fontSize: "0.8125rem" }}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                              Gender
                            </label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={icp?.persona?.gender || icp?.gender || ""}
                              onChange={(e) => {
                                const updatedIcp = icp?.persona
                                  ? { ...icp, persona: { ...icp.persona, gender: e.target.value } }
                                  : { ...icp, gender: e.target.value };
                                setIcp(updatedIcp);
                              }}
                              placeholder="e.g., Diverse"
                              style={{ fontSize: "0.8125rem" }}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                              Title
                            </label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={icp?.persona?.title || icp?.title || ""}
                              onChange={(e) => {
                                const updatedIcp = icp?.persona
                                  ? { ...icp, persona: { ...icp.persona, title: e.target.value } }
                                  : { ...icp, title: e.target.value };
                                setIcp(updatedIcp);
                              }}
                              placeholder="e.g., Active Consumer"
                              style={{ fontSize: "0.8125rem" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Note: For generic ICP we intentionally skip showing any ICP fields or preview,
                    since \"Generic ICP\" means no explicit ICP has been provided. */}
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


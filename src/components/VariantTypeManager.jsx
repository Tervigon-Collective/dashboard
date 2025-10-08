"use client";

import { useState, useEffect } from "react";

const VariantTypeManager = ({ variantIndex, variant, onVariantChange }) => {
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [customTypes, setCustomTypes] = useState([]);
  const [variantCategories, setVariantCategories] = useState({});
  const [customCategoryInputs, setCustomCategoryInputs] = useState({});
  const [customTypeName, setCustomTypeName] = useState("");

  // Predefined variant types
  const predefinedTypes = [
    { id: "color", label: "Color", icon: "🎨" },
    { id: "size", label: "Size", icon: "📏" },
    { id: "breed", label: "Breed", icon: "🐕" },
    { id: "custom", label: "Custom", icon: "➕" },
  ];

  // Predefined categories for each type
  const predefinedCategories = {
    color: [
      "Red",
      "Green",
      "Blue",
      "Yellow",
      "Black",
      "White",
      "Orange",
      "Purple",
      "Pink",
      "Brown",
      "Gray",
      "Silver",
    ],
    size: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
    breed: [
      "German Shepherd",
      "Golden Retriever",
      "Labrador",
      "Bulldog",
      "Poodle",
      "Beagle",
      "Rottweiler",
      "Siberian Husky",
      "Persian Cat",
      "Maine Coon",
      "Siamese",
      "British Shorthair",
    ],
  };

  // Load existing variant type data
  useEffect(() => {
    if (variant.variant_type && Object.keys(variant.variant_type).length > 0) {
      const types = Object.keys(variant.variant_type);
      setSelectedTypes(types);
      setVariantCategories(variant.variant_type);
    }
  }, [variant.variant_type]);

  // Handle type selection
  const handleTypeSelection = (typeId, isSelected) => {
    if (isSelected) {
      setSelectedTypes((prev) => [...prev, typeId]);
    } else {
      setSelectedTypes((prev) => prev.filter((t) => t !== typeId));
      setVariantCategories((prev) => {
        const updated = { ...prev };
        delete updated[typeId];
        return updated;
      });
    }
  };

  // Handle category selection
  const handleCategoryChange = (type, value) => {
    if (value === "__custom__") {
      setVariantCategories((prev) => ({
        ...prev,
        [type]: "__custom__",
      }));
    } else {
      setVariantCategories((prev) => ({
        ...prev,
        [type]: value,
      }));

      // Update parent variant
      const updatedVariantType = {
        ...variant.variant_type,
        [type]: value,
      };
      onVariantChange(variantIndex, {
        target: { name: "variant_type", value: updatedVariantType },
      });
    }
  };

  // Add custom type
  const addCustomType = () => {
    if (customTypeName.trim()) {
      setCustomTypes((prev) => [...prev, customTypeName.trim()]);
      setSelectedTypes((prev) => [...prev, customTypeName.trim()]);
      setCustomTypeName("");
    }
  };

  // Handle custom category input
  const handleCustomCategoryInput = (type, value) => {
    setCustomCategoryInputs((prev) => ({
      ...prev,
      [type]: value,
    }));
  };

  // Add custom category
  const addCustomCategory = (type) => {
    const customValue = customCategoryInputs[type];
    if (customValue && customValue.trim()) {
      setVariantCategories((prev) => ({
        ...prev,
        [type]: customValue.trim(),
      }));

      // Update parent variant
      const updatedVariantType = {
        ...variant.variant_type,
        [type]: customValue.trim(),
      };
      onVariantChange(variantIndex, {
        target: { name: "variant_type", value: updatedVariantType },
      });

      setCustomCategoryInputs((prev) => ({
        ...prev,
        [type]: "",
      }));
    }
  };

  return (
    <div className="variant-type-manager">
      {/* Variant Type Selection */}
      <div className="mb-3">
        <label className="form-label">Variant Types </label>
        <div className="variant-types-container">
          {predefinedTypes.map((type) => (
            <div key={type.id} className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="checkbox"
                id={`${variantIndex}-${type.id}`}
                checked={selectedTypes.includes(type.id)}
                onChange={(e) => handleTypeSelection(type.id, e.target.checked)}
              />
              <label
                className="form-check-label"
                htmlFor={`${variantIndex}-${type.id}`}
              >
                {type.icon} {type.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Type Input */}
      {selectedTypes.includes("custom") && (
        <div className="mb-3">
          <label className="form-label">Custom Type</label>
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Enter custom type name"
              value={customTypeName}
              onChange={(e) => setCustomTypeName(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={addCustomType}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Category Dropdowns */}
      {selectedTypes.length > 0 && (
        <div className="row">
          {selectedTypes.map((type) => (
            <div key={type} className="col-md-6 mb-3">
              <label className="form-label">
                {predefinedTypes.find((t) => t.id === type)?.label || type} *
              </label>

              {type === "custom" ? (
                // Custom type input
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter custom type name"
                    value={customTypeName}
                    onChange={(e) => setCustomTypeName(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={addCustomType}
                  >
                    Add
                  </button>
                </div>
              ) : (
                // Predefined categories with custom addition
                <div>
                  <select
                    className="form-select"
                    value={variantCategories[type] || ""}
                    onChange={(e) => handleCategoryChange(type, e.target.value)}
                  >
                    <option value="">
                      Select {predefinedTypes.find((t) => t.id === type)?.label}
                    </option>
                    {predefinedCategories[type]?.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                    <option value="__custom__">+ Add Custom</option>
                  </select>

                  {variantCategories[type] === "__custom__" && (
                    <div className="input-group mt-2">
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Enter custom ${predefinedTypes
                          .find((t) => t.id === type)
                          ?.label.toLowerCase()}`}
                        value={customCategoryInputs[type] || ""}
                        onChange={(e) =>
                          handleCustomCategoryInput(type, e.target.value)
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() => addCustomCategory(type)}
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Display Selected Variant Type */}
      {Object.keys(variantCategories).length > 0 && (
        <div className="mb-3">
          <label className="form-label">Selected Variant Type:</label>
          <div className="alert alert-info">
            {Object.entries(variantCategories)
              .filter(([key, value]) => value && value !== "__custom__")
              .map(([key, value]) => (
                <span key={key} className="badge bg-primary me-2">
                  {key}: {value}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantTypeManager;

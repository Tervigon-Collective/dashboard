"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

/**
 * Component to manage variant options (like Color, Size, etc.)
 * Allows selecting variant types and adding values for each type
 */
const VariantOptionsManager = ({
  onOptionsChange,
  initialOptions = [],
  hideHeader = false,
}) => {
  const [variantOptions, setVariantOptions] = useState(initialOptions);

  useEffect(() => {
    setVariantOptions(initialOptions);
  }, [initialOptions]);

  // Predefined variant types
  const VARIANT_TYPES = [
    { id: "color", label: "Color", icon: "mdi:palette" },
    { id: "size", label: "Size", icon: "mdi:ruler" },
    { id: "material", label: "Material", icon: "mdi:texture" },
    { id: "breed", label: "Breed", icon: "mdi:dog" },
    { id: "scent", label: "Scent", icon: "mdi:flower" },
    { id: "flavor", label: "Flavor", icon: "mdi:ice-cream" },
    { id: "volume", label: "Volume", icon: "mdi:cup" },
    { id: "weight", label: "Weight", icon: "mdi:weight-kilogram" },
  ];

  const [customOptionName, setCustomOptionName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const addVariantOption = (type) => {
    const typeInfo = VARIANT_TYPES.find((t) => t.id === type);
    if (!typeInfo) return;

    // Check if already added
    if (variantOptions.find((opt) => opt.type === type)) {
      return;
    }

    const newOption = {
      id: Date.now().toString(),
      type: type,
      label: typeInfo.label,
      icon: typeInfo.icon,
      values: [],
    };

    const updated = [...variantOptions, newOption];
    setVariantOptions(updated);
    onOptionsChange(updated);
  };

  const addCustomOption = () => {
    if (!customOptionName.trim()) {
      alert("Please enter a custom option name");
      return;
    }

    const newOption = {
      id: Date.now().toString(),
      type: customOptionName.toLowerCase().replace(/\s+/g, "_"),
      label: customOptionName,
      icon: "mdi:tag",
      values: [],
    };

    const updated = [...variantOptions, newOption];
    setVariantOptions(updated);
    onOptionsChange(updated);
    setCustomOptionName("");
    setShowCustomInput(false);
  };

  const removeVariantOption = (optionId) => {
    const updated = variantOptions.filter((opt) => opt.id !== optionId);
    setVariantOptions(updated);
    onOptionsChange(updated);
  };

  const addValueToOption = (optionId, value) => {
    if (!value.trim()) return;

    const updated = variantOptions.map((opt) => {
      if (opt.id === optionId) {
        // Check if value already exists
        if (opt.values.includes(value)) {
          return opt;
        }
        return {
          ...opt,
          values: [...opt.values, value],
        };
      }
      return opt;
    });

    setVariantOptions(updated);
    onOptionsChange(updated);
  };

  const removeValueFromOption = (optionId, value) => {
    const updated = variantOptions.map((opt) => {
      if (opt.id === optionId) {
        return {
          ...opt,
          values: opt.values.filter((v) => v !== value),
        };
      }
      return opt;
    });

    setVariantOptions(updated);
    onOptionsChange(updated);
  };

  return (
    <div>
      {!hideHeader && (
        <div className="mb-4">
          <h5 className="fw-semibold">
            <Icon icon="mdi:sitemap" className="me-2" width="20" />
            Variant Options
          </h5>
        </div>
      )}

      <div>
        {/* Variant Type Selector - Dropdown Style */}
        <div className="mb-3">
          <label className="form-label">Variant Type</label>
          <select
            className="form-select"
            onChange={(e) => {
              if (e.target.value === "custom") {
                setShowCustomInput(true);
              } else if (e.target.value) {
                addVariantOption(e.target.value);
              }
              e.target.value = ""; // Reset dropdown
            }}
            value=""
          >
            <option value="">Select variant type...</option>
            {VARIANT_TYPES.map((type) => {
              const isAdded = variantOptions.find(
                (opt) => opt.type === type.id
              );
              return (
                <option key={type.id} value={type.id} disabled={isAdded}>
                  {type.label} {isAdded ? "(Added)" : ""}
                </option>
              );
            })}
            <option value="custom">+ Custom</option>
          </select>

          {/* Custom Option Input */}
          {showCustomInput && (
            <div
              className="mt-3 p-3 border rounded"
              style={{ backgroundColor: "#f6f6f7", borderColor: "#c9cccf" }}
            >
              <label className="shopify-label">Custom Option Name</label>
              <div className="d-flex gap-2">
                <input
                  type="text"
                  className="shopify-input"
                  placeholder="e.g., Pattern, Style, etc."
                  value={customOptionName}
                  onChange={(e) => setCustomOptionName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomOption();
                    }
                  }}
                />
                <button
                  type="button"
                  className="shopify-btn shopify-btn-primary"
                  onClick={addCustomOption}
                >
                  Add
                </button>
                <button
                  type="button"
                  className="shopify-btn shopify-btn-secondary"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomOptionName("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Selected Options with Values */}
        {variantOptions.length > 0 && (
          <div
            className="border rounded p-3"
            style={{ backgroundColor: "#f6f6f7", borderColor: "#c9cccf" }}
          >
            <h6 className="shopify-text-muted mb-3">
              Add Values for Each Option ({variantOptions.length}):
            </h6>

            {variantOptions.map((option) => (
              <VariantOptionEditor
                key={option.id}
                option={option}
                onAddValue={(value) => addValueToOption(option.id, value)}
                onRemoveValue={(value) =>
                  removeValueFromOption(option.id, value)
                }
                onRemoveOption={() => removeVariantOption(option.id)}
              />
            ))}
          </div>
        )}

        {variantOptions.length === 0 && (
          <div className="border rounded px-3 py-2 bg-white text-muted small d-flex align-items-center gap-2">
            <Icon icon="mdi:information" width="16" />
            <span>Select variant types above to get started.</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Predefined options for common variant types
 */
const PREDEFINED_OPTIONS = {
  color: [
    "Black",
    "White",
    "Gray",
    "Red",
    "Blue",
    "Green",
    "Yellow",
    "Orange",
    "Purple",
    "Pink",
    "Brown",
    "Beige",
    "Navy",
    "Maroon",
    "Olive",
    "Teal",
    "Silver",
    "Gold",
    "Rose Gold",
    "Charcoal",
    "Aqua",
  ],
  size: [
    "XXXS",
    "XXS",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "XXXL",
    "XXXXL",
    "One Size",
    "Free Size",
  ],
  material: [
    "Cotton",
    "Polyester",
    "Wool",
    "Silk",
    "Leather",
    "Denim",
    "Linen",
    "Nylon",
    "Velvet",
    "Satin",
    "Canvas",
    "Rubber",
    "Plastic",
    "Metal",
    "Wood",
    "Glass",
    "Ceramic",
  ],
  breed: [
    "Labrador",
    "German Shepherd",
    "Golden Retriever",
    "Bulldog",
    "Poodle",
    "Beagle",
    "Rottweiler",
    "Yorkshire Terrier",
    "Boxer",
    "Dachshund",
    "Persian Cat",
    "Siamese Cat",
    "Maine Coon",
    "Ragdoll",
  ],
  scent: [
    "Lavender",
    "Rose",
    "Vanilla",
    "Citrus",
    "Mint",
    "Jasmine",
    "Sandalwood",
    "Ocean Breeze",
    "Fresh Linen",
    "Coconut",
    "Strawberry",
    "Apple",
    "Unscented",
  ],
  flavor: [
    "Vanilla",
    "Chocolate",
    "Strawberry",
    "Mint",
    "Coffee",
    "Caramel",
    "Banana",
    "Mango",
    "Berry",
    "Coconut",
    "Peanut Butter",
    "Chicken",
    "Beef",
    "Fish",
    "Cheese",
  ],
  volume: [
    "50ml",
    "100ml",
    "150ml",
    "200ml",
    "250ml",
    "300ml",
    "500ml",
    "750ml",
    "1L",
    "1.5L",
    "2L",
    "3L",
    "5L",
  ],
  weight: [
    "100g",
    "200g",
    "250g",
    "500g",
    "750g",
    "1kg",
    "2kg",
    "5kg",
    "10kg",
    "15kg",
    "20kg",
    "25kg",
    "50kg",
  ],
};

/**
 * Component to edit a single variant option and its values
 */
const VariantOptionEditor = ({
  option,
  onAddValue,
  onRemoveValue,
  onRemoveOption,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const predefinedValues = PREDEFINED_OPTIONS[option.type] || [];
  const hasPredefined = predefinedValues.length > 0;

  const handleAddValue = () => {
    if (inputValue.trim()) {
      onAddValue(inputValue.trim());
      setInputValue("");
      setShowCustomInput(false);
    }
  };

  const handleSelectPredefined = (e) => {
    const value = e.target.value;
    if (value) {
      onAddValue(value);
      e.target.value = ""; // Reset dropdown
    }
  };

  return (
    <div
      className="border rounded p-3 mb-3"
      style={{ backgroundColor: "#f8f9fa", borderColor: "#dee2e6" }}
    >
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="fw-semibold mb-0" style={{ color: "#495057" }}>
          <Icon icon={option.icon} className="me-2" width="18" />
          {option.label}
        </h6>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          onClick={onRemoveOption}
          title="Remove this option"
          style={{ padding: "4px 8px" }}
        >
          <Icon icon="mdi:delete" width="16" />
        </button>
      </div>

      {/* Display Added Values */}
      {option.values.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-3">
          {option.values.map((value, index) => (
            <span
              key={index}
              className="badge bg-primary text-white"
              style={{ fontSize: "0.8rem", padding: "4px 8px" }}
            >
              {value}
              <button
                type="button"
                className="btn-close btn-close-white ms-2"
                onClick={() => onRemoveValue(value)}
                aria-label="Remove"
                style={{ fontSize: "0.7rem", padding: "0" }}
              ></button>
            </span>
          ))}
        </div>
      )}

      {/* Add Value Section */}
      <div className="mb-2">
        {hasPredefined && !showCustomInput ? (
          // Dropdown for predefined options
          <div>
            <select
              className="form-select mb-2"
              onChange={handleSelectPredefined}
              value=""
            >
              <option value="">Select {option.label.toLowerCase()}...</option>
              {predefinedValues
                .filter((val) => !option.values.includes(val))
                .map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
            </select>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => setShowCustomInput(true)}
            >
              <Icon icon="mdi:pencil" className="me-1" width="14" />
              Enter custom {option.label.toLowerCase()}
            </button>
          </div>
        ) : (
          // Manual input
          <div>
            <div className="d-flex gap-2 mb-2">
              <input
                type="text"
                className="form-control"
                placeholder={`Add ${option.label.toLowerCase()}...`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddValue();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddValue}
              >
                Add
              </button>
            </div>
            {hasPredefined && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  setShowCustomInput(false);
                  setInputValue("");
                }}
              >
                <Icon icon="mdi:arrow-left" className="me-1" width="14" />
                Back to dropdown
              </button>
            )}
          </div>
        )}
      </div>

      {option.values.length === 0 && (
        <small className="text-muted">No values added yet</small>
      )}
    </div>
  );
};

export default VariantOptionsManager;

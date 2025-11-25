/**
 * Generate all possible combinations from variant options
 * @param {Array} variantOptions - Array of { type, label, values }
 * @returns {Array} Array of variant combinations
 */
export const generateVariantCombinations = (variantOptions) => {
  // Filter out options with no values
  const validOptions = variantOptions.filter(
    (opt) => opt.values && opt.values.length > 0
  );

  if (validOptions.length === 0) {
    return [];
  }

  // Generate all combinations using cartesian product
  const combinations = cartesianProduct(validOptions.map((opt) => opt.values));

  // Map combinations to variant objects
  return combinations.map((combo, index) => {
    // Create variant_type object
    const variant_type = {};
    validOptions.forEach((opt, i) => {
      variant_type[opt.type] = combo[i];
    });

    // Create display name
    const displayName = combo.join(" × ");

    // Create grouping key (first option value)
    const groupBy = validOptions[0] ? combo[0] : "Ungrouped";

    return {
      id: `variant_${Date.now()}_${index}`,
      variant_type: variant_type,
      displayName: displayName,
      groupBy: groupBy,
      // Initialize empty fields
      mrp: "",
      cogs: "",
      moq: "",
      sample_quantity: "",
      sku: "",
      dimension_with_packing: "",
      dimension_without_packing: "",
      margin: "",
      vendor_pricing: [],
      images: [],
    };
  });
};

/**
 * Cartesian product of arrays
 * @param {Array} arrays - Array of arrays
 * @returns {Array} Cartesian product
 */
const cartesianProduct = (arrays) => {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return arrays[0].map((v) => [v]);

  return arrays.reduce(
    (acc, curr) => {
      return acc.flatMap((x) =>
        curr.map((y) => [...(Array.isArray(x) ? x : [x]), y])
      );
    },
    [[]]
  );
};

/**
 * Group variants by a specific key
 * @param {Array} variants - Array of variants
 * @param {String} key - Key to group by (default: groupBy)
 * @returns {Object} Grouped variants
 */
export const groupVariants = (variants, key = "groupBy") => {
  return variants.reduce((groups, variant) => {
    const groupKey = variant[key] || "Ungrouped";
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(variant);
    return groups;
  }, {});
};

/**
 * Calculate total number of combinations
 * @param {Array} variantOptions - Array of { type, label, values }
 * @returns {Number} Total combinations
 */
export const calculateTotalCombinations = (variantOptions) => {
  const validOptions = variantOptions.filter(
    (opt) => opt.values && opt.values.length > 0
  );

  if (validOptions.length === 0) return 0;

  return validOptions.reduce((total, opt) => total * opt.values.length, 1);
};

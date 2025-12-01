/**
 * Analytics Color Palette
 * 
 * A comprehensive collection of subtle, professional colors suitable for analytics dashboards.
 * These colors are designed to be:
 * - Subtle and not too catchy
 * - Distinguishable from each other
 * - Suitable for data visualization
 * - Professional and easy on the eyes
 * - Colorblind-friendly where possible
 */

// Primary Analytics Color Palette (30 colors)
// These are muted, professional colors perfect for line charts, bar charts, and heatmaps
export const ANALYTICS_COLORS = [
  // Blues (cool, trustworthy)
  "#4A90E2", // Soft blue
  "#5B9BD5", // Medium blue
  "#6BA3D8", // Light blue
  "#7DB3E0", // Pale blue
  "#8FC1E8", // Very light blue
  
  // Teals/Cyans (fresh, modern)
  "#4ECDC4", // Soft teal
  "#5DD5CC", // Medium teal
  "#6EDDD4", // Light teal
  "#7FE5DC", // Pale teal
  "#90EDE4", // Very light teal
  
  // Greens (growth, positive)
  "#6BBA8C", // Soft green
  "#7BC99C", // Medium green
  "#8BD8AC", // Light green
  "#9BE7BC", // Pale green
  "#ABF6CC", // Very light green
  
  // Purples (creative, premium)
  "#9B8FB8", // Soft purple
  "#AB9FC8", // Medium purple
  "#BBAFD8", // Light purple
  "#CBBFE8", // Pale purple
  "#DBCFF8", // Very light purple
  
  // Oranges/Ambers (energy, attention)
  "#E8A87C", // Soft orange
  "#F2B88C", // Medium orange
  "#FCC89C", // Light orange
  "#FFD8AC", // Pale orange
  "#FFE8BC", // Very light orange
  
  // Reds/Pinks (alert, important)
  "#D88A8A", // Soft red
  "#E29A9A", // Medium red
  "#ECAAAA", // Light red
  "#F6BABA", // Pale red
  "#FFCACA", // Very light red
  
  // Grays (neutral, professional)
  "#8E9AAF", // Soft gray-blue
  "#9EAAAF", // Medium gray
  "#AEBABF", // Light gray
  "#BECACF", // Pale gray
  "#CEDADF", // Very light gray
  
  // Yellows/Golds (optimism, value)
  "#D4C5A9", // Soft gold
  "#E4D5B9", // Medium gold
  "#F4E5C9", // Light gold
  "#FFF5D9", // Pale gold
  "#FFFFE9", // Very light gold
];

// Extended Palette (20 additional colors for more complex visualizations)
export const ANALYTICS_COLORS_EXTENDED = [
  // Additional muted tones
  "#7A8FA3", // Slate blue
  "#8B9FB3", // Light slate
  "#9CAFC3", // Pale slate
  "#ADBFD3", // Very pale slate
  
  "#A68BA6", // Muted lavender
  "#B69BB6", // Light lavender
  "#C6ABC6", // Pale lavender
  "#D6BBD6", // Very pale lavender
  
  "#B89F7A", // Muted tan
  "#C8AF8A", // Light tan
  "#D8BF9A", // Pale tan
  "#E8CFAA", // Very pale tan
  
  "#7FA37A", // Muted sage
  "#8FB38A", // Light sage
  "#9FC39A", // Pale sage
  "#AFD3AA", // Very pale sage
  
  "#A37A7A", // Muted rose
  "#B38A8A", // Light rose
  "#C39A9A", // Pale rose
  "#D3AAAA", // Very pale rose
];

// Complete Palette (combines both)
export const ANALYTICS_COLORS_COMPLETE = [
  ...ANALYTICS_COLORS,
  ...ANALYTICS_COLORS_EXTENDED,
];

// Semantic Color Sets (for specific use cases)

// Revenue/Positive metrics (greens and teals)
export const POSITIVE_COLORS = [
  "#6BBA8C", // Soft green
  "#4ECDC4", // Soft teal
  "#7BC99C", // Medium green
  "#5DD5CC", // Medium teal
  "#8BD8AC", // Light green
  "#6EDDD4", // Light teal
];

// Spend/Cost metrics (blues)
export const SPEND_COLORS = [
  "#4A90E2", // Soft blue
  "#5B9BD5", // Medium blue
  "#6BA3D8", // Light blue
  "#7DB3E0", // Pale blue
  "#8FC1E8", // Very light blue
];

// Alert/Warning metrics (oranges and ambers)
export const WARNING_COLORS = [
  "#E8A87C", // Soft orange
  "#F2B88C", // Medium orange
  "#FCC89C", // Light orange
  "#FFD8AC", // Pale orange
];

// Critical/Negative metrics (reds)
export const NEGATIVE_COLORS = [
  "#D88A8A", // Soft red
  "#E29A9A", // Medium red
  "#ECAAAA", // Light red
  "#F6BABA", // Pale red
];

// Neutral metrics (grays and purples)
export const NEUTRAL_COLORS = [
  "#9B8FB8", // Soft purple
  "#8E9AAF", // Soft gray-blue
  "#AB9FC8", // Medium purple
  "#9EAAAF", // Medium gray
];

// Heatmap Color Scales

// ROAS Heatmap Scale (Red to Green)
export const ROAS_HEATMAP_SCALE = [
  { value: 0, color: "#D88A8A" },    // Red (bad)
  { value: 0.5, color: "#E29A9A" },  // Light red
  { value: 1.0, color: "#F2B88C" },  // Orange (neutral/break-even)
  { value: 1.5, color: "#FCC89C" },  // Light orange
  { value: 2.0, color: "#6BBA8C" },  // Green (good)
  { value: 2.5, color: "#7BC99C" },  // Medium green
  { value: 3.0, color: "#8BD8AC" },  // Light green (excellent)
];

// Performance Heatmap Scale (Low to High)
export const PERFORMANCE_HEATMAP_SCALE = [
  "#E8E8E8", // Very light gray (low)
  "#D0D0D0", // Light gray
  "#B8B8B8", // Medium gray
  "#A0A0A0", // Dark gray
  "#888888", // Darker gray
  "#707070", // Very dark gray (high)
];

// Gradient Scales for Continuous Data

// Blue Gradient (for spend, costs)
export const BLUE_GRADIENT = [
  "#E3F2FD", // Very light blue
  "#BBDEFB", // Light blue
  "#90CAF9", // Medium light blue
  "#64B5F6", // Medium blue
  "#42A5F5", // Medium dark blue
  "#2196F3", // Dark blue
  "#1E88E5", // Very dark blue
];

// Green Gradient (for revenue, growth)
export const GREEN_GRADIENT = [
  "#E8F5E9", // Very light green
  "#C8E6C9", // Light green
  "#A5D6A7", // Medium light green
  "#81C784", // Medium green
  "#66BB6A", // Medium dark green
  "#4CAF50", // Dark green
  "#388E3C", // Very dark green
];

// Red Gradient (for losses, negative)
export const RED_GRADIENT = [
  "#FFEBEE", // Very light red
  "#FFCDD2", // Light red
  "#EF9A9A", // Medium light red
  "#E57373", // Medium red
  "#EF5350", // Medium dark red
  "#F44336", // Dark red
  "#D32F2F", // Very dark red
];

// Purple Gradient (for premium metrics)
export const PURPLE_GRADIENT = [
  "#F3E5F5", // Very light purple
  "#E1BEE7", // Light purple
  "#CE93D8", // Medium light purple
  "#BA68C8", // Medium purple
  "#AB47BC", // Medium dark purple
  "#9C27B0", // Dark purple
  "#7B1FA2", // Very dark purple
];

// Utility Functions

/**
 * Get a color from the palette by index (with wrapping)
 * @param {number} index - The index of the color
 * @returns {string} The color hex code
 */
export function getColorByIndex(index) {
  return ANALYTICS_COLORS_COMPLETE[index % ANALYTICS_COLORS_COMPLETE.length];
}

/**
 * Get a color for a specific metric type
 * @param {string} metricType - 'spend', 'revenue', 'orders', 'aov', 'negative', 'warning', 'neutral'
 * @param {number} index - Optional index for multiple series of same type
 * @returns {string} The color hex code
 */
export function getColorForMetric(metricType, index = 0) {
  const typeMap = {
    spend: SPEND_COLORS,
    revenue: POSITIVE_COLORS,
    orders: NEUTRAL_COLORS,
    aov: PURPLE_GRADIENT.slice(2, 6),
    negative: NEGATIVE_COLORS,
    warning: WARNING_COLORS,
    neutral: NEUTRAL_COLORS,
  };
  
  const colorSet = typeMap[metricType.toLowerCase()] || ANALYTICS_COLORS;
  return colorSet[index % colorSet.length];
}

/**
 * Get a sequential color palette for a specific number of series
 * @param {number} count - Number of colors needed
 * @returns {string[]} Array of color hex codes
 */
export function getSequentialColors(count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(getColorByIndex(i));
  }
  return colors;
}

/**
 * Get colors for channel-specific metrics
 * @param {string} channel - 'meta', 'google', 'organic', 'total'
 * @param {string} metricType - 'spend', 'revenue', 'orders', 'aov'
 * @returns {string} The color hex code
 */
export function getChannelColor(channel, metricType = 'spend') {
  const channelColors = {
    meta: {
      spend: "#1877F2",    // Facebook blue
      revenue: "#34D399",  // Light green
      orders: "#6EDDD4",  // Teal
      aov: "#9B8FB8",      // Purple
    },
    google: {
      spend: "#4285F4",    // Google blue
      revenue: "#6EE7B7",  // Light green
      orders: "#7BC99C",  // Green
      aov: "#AB9FC8",      // Light purple
    },
    organic: {
      spend: "#8E9AAF",    // Gray
      revenue: "#8BD8AC",  // Light green
      orders: "#AEBABF",  // Light gray
      aov: "#B69BB6",      // Lavender
    },
    total: {
      spend: "#4A90E2",    // Soft blue
      revenue: "#6BBA8C",  // Soft green
      orders: "#9EAAAF",  // Medium gray
      aov: "#9B8FB8",      // Soft purple
    },
  };
  
  return channelColors[channel.toLowerCase()]?.[metricType.toLowerCase()] || getColorByIndex(0);
}

// Prioritized High-Contrast Color Palette
// Colors are ordered to maximize contrast between adjacent selections
// Each color is chosen to be visually distinct from the previous ones
export const PRIORITIZED_HIGH_CONTRAST_COLORS = [
  "#4A90E2", // 1. Blue - Primary, high contrast
  "#6BBA8C", // 2. Green - Complementary to blue, high contrast
  "#E8A87C", // 3. Orange - Warm, high contrast to cool colors
  "#9B8FB8", // 4. Purple - Between blue and red, distinct
  "#4ECDC4", // 5. Teal - Between blue and green, distinct
  "#D88A8A", // 6. Red - Warm, high contrast
  "#8E9AAF", // 7. Gray-blue - Neutral, distinct
  "#F2B88C", // 8. Light orange - Distinct from darker orange
  "#7BC99C", // 9. Medium green - Distinct from lighter green
  "#AB9FC8", // 10. Light purple - Distinct from darker purple
  "#5B9BD5", // 11. Medium blue - Distinct from primary blue
  "#D4C5A9", // 12. Gold - Warm neutral, distinct
  "#6EDDD4", // 13. Light teal - Distinct from darker teal
  "#E29A9A", // 14. Light red - Distinct from darker red
  "#7A8FA3", // 15. Slate blue - Distinct gray tone
  "#FCC89C", // 16. Pale orange - Distinct from other oranges
  "#8BD8AC", // 17. Light green - Distinct from other greens
  "#BBAFD8", // 18. Very light purple - Distinct from other purples
  "#6BA3D8", // 19. Light blue - Distinct from other blues
  "#A68BA6", // 20. Lavender - Distinct purple-gray tone
];

/**
 * Get prioritized colors for multiple metrics with maximum contrast
 * @param {number} count - Number of colors needed
 * @returns {string[]} Array of color hex codes with maximum contrast
 */
export function getPrioritizedColors(count) {
  if (count <= PRIORITIZED_HIGH_CONTRAST_COLORS.length) {
    return PRIORITIZED_HIGH_CONTRAST_COLORS.slice(0, count);
  }
  // If more colors needed, cycle through with offset to maintain contrast
  const result = [...PRIORITIZED_HIGH_CONTRAST_COLORS];
  for (let i = PRIORITIZED_HIGH_CONTRAST_COLORS.length; i < count; i++) {
    const offset = Math.floor(i / PRIORITIZED_HIGH_CONTRAST_COLORS.length);
    const index = i % PRIORITIZED_HIGH_CONTRAST_COLORS.length;
    result.push(ANALYTICS_COLORS_COMPLETE[(index + offset * 5) % ANALYTICS_COLORS_COMPLETE.length]);
  }
  return result;
}

/**
 * Get color for metric with priority-based assignment
 * Ensures maximum contrast between selected metrics
 * @param {string} metricName - Name of the metric
 * @param {string[]} selectedMetrics - Array of all selected metric names (in priority order)
 * @returns {string} The color hex code
 */
export function getPrioritizedMetricColor(metricName, selectedMetrics = []) {
  // First, try channel-specific colors for primary metrics
  if (metricName.includes("Total Spend")) return "#4A90E2"; // Blue
  if (metricName.includes("Total Revenue")) return "#6BBA8C"; // Green
  if (metricName.includes("Total Orders")) return "#8E9AAF"; // Gray-blue
  if (metricName.includes("Total ROAS")) return "#9B8FB8"; // Purple
  
  if (metricName.includes("Meta Spend")) return "#1877F2"; // Facebook blue
  if (metricName.includes("Meta Revenue")) return "#34D399"; // Light green
  if (metricName.includes("Meta Orders")) return "#6EDDD4"; // Teal
  if (metricName.includes("Meta ROAS")) return "#AB9FC8"; // Light purple
  
  if (metricName.includes("Google Spend")) return "#4285F4"; // Google blue
  if (metricName.includes("Google Revenue")) return "#7BC99C"; // Medium green
  if (metricName.includes("Google Orders")) return "#4ECDC4"; // Teal
  if (metricName.includes("Google ROAS")) return "#BBAFD8"; // Very light purple
  
  // For AOV and other metrics, use prioritized colors based on selection order
  const metricPriority = [
    "Total Spend", "Total Revenue", "Total Orders", "Total ROAS", "AOV",
    "Meta Spend", "Meta Revenue", "Meta Orders", "Meta ROAS", "Meta AOV",
    "Google Spend", "Google Revenue", "Google Orders", "Google ROAS", "Google AOV"
  ];
  
  const index = metricPriority.indexOf(metricName);
  if (index >= 0 && selectedMetrics.length > 0) {
    // Find position in selected metrics
    const selectedIndex = selectedMetrics.indexOf(metricName);
    if (selectedIndex >= 0) {
      return getPrioritizedColors(selectedMetrics.length)[selectedIndex];
    }
  }
  
  // Fallback to prioritized colors
  return getPrioritizedColors(15)[index] || PRIORITIZED_HIGH_CONTRAST_COLORS[0];
}

// Default export for easy importing
export default {
  ANALYTICS_COLORS,
  ANALYTICS_COLORS_EXTENDED,
  ANALYTICS_COLORS_COMPLETE,
  PRIORITIZED_HIGH_CONTRAST_COLORS,
  POSITIVE_COLORS,
  SPEND_COLORS,
  WARNING_COLORS,
  NEGATIVE_COLORS,
  NEUTRAL_COLORS,
  ROAS_HEATMAP_SCALE,
  PERFORMANCE_HEATMAP_SCALE,
  BLUE_GRADIENT,
  GREEN_GRADIENT,
  RED_GRADIENT,
  PURPLE_GRADIENT,
  getColorByIndex,
  getColorForMetric,
  getSequentialColors,
  getChannelColor,
  getPrioritizedColors,
  getPrioritizedMetricColor,
};


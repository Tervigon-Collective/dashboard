/**
 * Utility to get the first accessible page for a user based on their sidebar permissions
 * This helps redirect users to a page they can actually access instead of always going to dashboard
 */

// Map of sidebar keys to their routes (in priority order)
const SIDEBAR_TO_ROUTE_MAP = [
  { sidebar: "dashboard", route: "/" },
  { sidebar: "createContent", route: "/create-content" },
  { sidebar: "procurement", route: "/procurement" },
  { sidebar: "customerData", route: "/customer-data" },
  { sidebar: "shipping", route: "/shipping" },
  { sidebar: "skuList", route: "/Sku-List" },
  { sidebar: "productSpendSummary", route: "/product-spend-summary" },
  { sidebar: "entityReport", route: "/entity-report" },
  { sidebar: "receivingManagement", route: "/receiving-management" },
  { sidebar: "orderManagement", route: "/order-management" },
  { sidebar: "stockManagement", route: "/stock-management" },
  { sidebar: "masters", route: "/masters" },
  { sidebar: "userManagement", route: "/user-management" },
];

/**
 * Get the first accessible page for a user based on their sidebar permissions
 * @param {Function} hasSidebarPermission - Function to check if user has permission for a sidebar
 * @returns {string} - Route to the first accessible page, defaults to "/" if none found
 */
export const getFirstAccessiblePage = (hasSidebarPermission) => {
  if (!hasSidebarPermission) {
    return "/";
  }

  // Check each sidebar in priority order
  for (const { sidebar, route } of SIDEBAR_TO_ROUTE_MAP) {
    if (hasSidebarPermission(sidebar)) {
      return route;
    }
  }

  // If no accessible page found, return dashboard (will show access denied there)
  return "/";
};

export default getFirstAccessiblePage;


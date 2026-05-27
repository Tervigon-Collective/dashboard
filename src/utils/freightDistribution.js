export function lineAmount(variant) {
  const taxable = Number(variant?.taxable_amt);
  if (Number.isFinite(taxable) && taxable > 0) return taxable;
  const qty = Number(variant?.quantity) || 0;
  const rate = Number(variant?.rate) || 0;
  return qty * rate;
}

function applyAmountToProducts(products, totalCost, fieldName) {
  const cost = Number(totalCost) || 0;
  const flat = [];

  (products || []).forEach((product, productIndex) => {
    (product.selectedVariants || []).forEach((variant, variantIndex) => {
      const qty = Number(variant.quantity) || 0;
      if (qty > 0) {
        flat.push({ productIndex, variantIndex, amount: lineAmount(variant) });
      }
    });
  });

  const totalAmount = flat.reduce((sum, row) => sum + row.amount, 0);
  const shareByKey = new Map();

  if (cost > 0 && totalAmount > 0) {
    let allocated = 0;
    flat.forEach((row, i) => {
      const key = `${row.productIndex}:${row.variantIndex}`;
      let share;
      if (i === flat.length - 1) {
        share = Math.round((cost - allocated) * 100) / 100;
      } else {
        share = Math.round((row.amount / totalAmount) * cost * 100) / 100;
        allocated += share;
      }
      shareByKey.set(key, share);
    });
  }

  return (products || []).map((product, productIndex) => ({
    ...product,
    selectedVariants: (product.selectedVariants || []).map(
      (variant, variantIndex) => {
        const qty = Number(variant.quantity) || 0;
        const key = `${productIndex}:${variantIndex}`;
        return {
          ...variant,
          [fieldName]:
            qty > 0 && shareByKey.has(key) ? shareByKey.get(key) : 0,
        };
      }
    ),
  }));
}

/** Apply freight_amount on each variant with qty > 0 across all products. */
export function applyFreightToProducts(products, freightCost) {
  return applyAmountToProducts(products, freightCost, "freight_amount");
}

/** Apply vendor_freight_amount per variant (same formula as PR freight). */
export function applyVendorFreightToProducts(products, vendorFreightCost) {
  return applyAmountToProducts(
    products,
    vendorFreightCost,
    "vendor_freight_amount"
  );
}

/** Distribute PR header freight across flat PR line items (for QC preview). */
export function distributeFreightAmongItems(items, freightCost) {
  const cost = Number(freightCost) || 0;
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return [];

  const amounts = list.map((item) => lineAmount(item));
  const totalAmount = amounts.reduce((sum, n) => sum + n, 0);

  if (cost <= 0 || totalAmount <= 0) {
    return list.map((item) => ({ ...item, freight_amount: 0 }));
  }

  let allocated = 0;
  return list.map((item, i) => {
    let share;
    if (i === list.length - 1) {
      share = Math.round((cost - allocated) * 100) / 100;
    } else {
      share = Math.round((amounts[i] / totalAmount) * cost * 100) / 100;
      allocated += share;
    }
    return { ...item, freight_amount: share };
  });
}

function sumLineField(items, fieldName) {
  return (items || []).reduce(
    (sum, item) => sum + (Number(item?.[fieldName]) || 0),
    0
  );
}

/** Line vendor freight for UI when header total exists but lines were not distributed yet. */
export function getDisplayVendorFreightAmount(item, request) {
  const line = Number(item?.vendor_freight_amount);
  const header = Number(request?.vendor_freight_cost) || 0;
  if (header <= 0) {
    return Number.isFinite(line) ? line : null;
  }
  if (Number.isFinite(line) && line > 0) {
    return line;
  }
  const items = request?.items || [];
  if (items.length === 0) return null;
  const distributed = distributeVendorFreightAmongItems(items, header);
  const row = distributed.find(
    (row) => String(row.item_id) === String(item?.item_id)
  );
  return row ? Number(row.vendor_freight_amount) : null;
}

/** Line PR freight for UI when header total exists but lines were not distributed yet. */
export function getDisplayFreightAmount(item, request) {
  const line = Number(item?.freight_amount);
  const header = Number(request?.freight_cost) || 0;
  if (header <= 0) {
    return Number.isFinite(line) ? line : null;
  }
  if (Number.isFinite(line) && line > 0) {
    return line;
  }
  const items = request?.items || [];
  if (items.length === 0) return null;
  const distributed = distributeFreightAmongItems(items, header);
  const row = distributed.find(
    (row) => String(row.item_id) === String(item?.item_id)
  );
  return row ? Number(row.freight_amount) : null;
}

export function formatFreightInr(amount) {
  if (amount == null || !Number.isFinite(Number(amount))) return "-";
  return `₹${Number(amount).toFixed(2)}`;
}

export function lineFreightMatchesHeader(items, headerValue, fieldName) {
  const header = Number(headerValue) || 0;
  const sum = sumLineField(items, fieldName);
  if (header <= 0) return true;
  return Math.abs(sum - header) < 0.01;
}

/** Distribute vendor freight across flat PR line items (for QC preview). */
export function distributeVendorFreightAmongItems(items, vendorFreightCost) {
  const cost = Number(vendorFreightCost) || 0;
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return [];

  const amounts = list.map((item) => lineAmount(item));
  const totalAmount = amounts.reduce((sum, n) => sum + n, 0);

  if (cost <= 0 || totalAmount <= 0) {
    return list.map((item) => ({ ...item, vendor_freight_amount: 0 }));
  }

  let allocated = 0;
  return list.map((item, i) => {
    let share;
    if (i === list.length - 1) {
      share = Math.round((cost - allocated) * 100) / 100;
    } else {
      share = Math.round((amounts[i] / totalAmount) * cost * 100) / 100;
      allocated += share;
    }
    return { ...item, vendor_freight_amount: share };
  });
}

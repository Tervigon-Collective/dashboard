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

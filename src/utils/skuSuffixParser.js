const SIZE_TOKENS = new Set([
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "2XL",
  "3XL",
  "4XL",
  "ONE",
  "OS",
  "FREE",
]);

const isSizeToken = (token) => {
  if (!token || typeof token !== "string") return false;
  const normalized = token.trim().toUpperCase();
  if (SIZE_TOKENS.has(normalized)) return true;
  if (/^\d+XL?$/i.test(normalized)) return true;
  return normalized.length === 1 && /^[A-Z]$/.test(normalized);
};

export function parseSkuSuffixes(sku) {
  const raw = typeof sku === "string" ? sku.trim() : "";
  if (!raw) {
    return { sku_product_suffix: null, sku_variant_suffix: null };
  }

  const parts = raw.split("-").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) {
    return {
      sku_product_suffix: raw,
      sku_variant_suffix: raw,
    };
  }

  const tail = parts.slice(2);
  if (tail.length === 0) {
    return {
      sku_product_suffix: raw,
      sku_variant_suffix: raw,
    };
  }

  const last = tail[tail.length - 1];
  const hasSize = tail.length > 1 && isSizeToken(last);

  if (!hasSize) {
    const joined = tail.join("-");
    return {
      sku_product_suffix: joined,
      sku_variant_suffix: joined,
    };
  }

  const productParts = tail.slice(0, -1);
  const sku_product_suffix =
    productParts.length > 0 ? productParts.join("-") : last;
  const sku_variant_suffix = `${sku_product_suffix}-${last}`;

  return { sku_product_suffix, sku_variant_suffix };
}

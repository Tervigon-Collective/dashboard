const fs = require("fs");
const path = require("path");

const pagePath = path.join(
  __dirname,
  "../src/app/receiving-management/page.jsx"
);
let s = fs.readFileSync(pagePath, "utf8");

if (!s.includes("ReceivingPrProductFields")) {
  s = s.replace(
    'import qualityCheckApi from "../../services/qualityCheckApi";',
    'import qualityCheckApi from "../../services/qualityCheckApi";\nimport ReceivingPrProductFields from "../../components/receiving/ReceivingPrProductFields";'
  );
}

const anchor = 'Product Name <span className="text-danger">*</span>';
const anchorPos = s.indexOf(anchor);
if (anchorPos < 0) {
  console.error("Anchor not found");
  process.exit(1);
}

const rowOpen = "<" + 'motion.div className="row mb-3">';
const rowOpenFixed = "<" + 'div className="row mb-3">';
const okStart = s.lastIndexOf(rowOpenFixed, anchorPos);
const end = s.indexOf("{/* Delivery Details */}", okStart);

if (okStart < 0 || end < 0) {
  console.error("Could not find splice markers", { okStart, end });
  process.exit(1);
}

const insert = `                      <ReceivingPrProductFields
                        productEntry={productEntry}
                        productIndex={productIndex}
                        masterBrandFilter={masterBrandFilter}
                        setMasterBrandFilter={setMasterBrandFilter}
                        masterBrands={masterBrands}
                        masterProductOptions={masterProductOptions}
                        masterProductLoading={masterProductLoading}
                        handleProductFieldChange={handleProductFieldChange}
                        handleMasterProductSelect={handleMasterProductSelect}
                        updateVariantField={updateVariantField}
                      />

`;

s = s.slice(0, okStart) + insert + s.slice(end);
fs.writeFileSync(pagePath, s);
console.log("Patched receiving page:", okStart, "->", end);

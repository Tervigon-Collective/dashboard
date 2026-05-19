const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "../src/components/receiving/ReceivingPrProductFields.jsx"
);
let s = fs.readFileSync(filePath, "utf8");
const nl = s.includes("\r\n") ? "\r\n" : "\n";

const oldBlock = [
  '          <input',
  '            type="text"',
  '            className="form-control"',
  '            placeholder="HSN"',
  '            value={productEntry.hsn_code || ""}',
  "            onChange={(e) =>",
  '              handleProductFieldChange(productIndex, "hsn_code", e.target.value)',
  "            }",
  "            required",
  "          />",
  "        </div>",
].join(nl);

const newBlock = [
  '          <input',
  '            type="text"',
  '            className="form-control"',
  "            placeholder={",
  "              productEntry.product_id",
  '                ? "From master or enter manually"',
  '                : "HSN"',
  "            }",
  '            value={productEntry.hsn_code || ""}',
  "            onChange={(e) =>",
  '              handleProductFieldChange(productIndex, "hsn_code", e.target.value)',
  "            }",
  "            required",
  "          />",
  "          {productEntry.hsn_from_master && productEntry.hsn_code ? (",
  '            <p className="form-text mb-0">',
  "              Loaded from product master. Edit if needed.",
  "            </p>",
  "          ) : productEntry.product_id && !productEntry.hsn_code ? (",
  '            <p className="form-text text-warning mb-0">',
  "              No HSN in master — enter manually.",
  "            </p>",
  "          ) : null}",
  "        </div>",
].join(nl);

if (!s.includes(oldBlock)) {
  console.error("HSN block not found");
  process.exit(1);
}

s = s.replace(oldBlock, newBlock);
fs.writeFileSync(filePath, s);
console.log("HSN UI patched");

const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "../src/components/receiving/ReceivingPrProductFields.jsx"
);
let s = fs.readFileSync(filePath, "utf8");

s = s.replace(
  /placeholder=\{\s*productEntry\.product_id\s*\?\s*"From master or enter manually"\s*:\s*"HSN"\s*\}/,
  'placeholder="HSN"'
);

s = s.replace(
  /\s*\{productEntry\.hsn_from_master &&[\s\S]*?: null\}/,
  ""
);

fs.writeFileSync(filePath, s);
console.log("Removed HSN helper messages");

const fs = require("fs");
const path = require("path");

const pagePath = path.join(
  __dirname,
  "../src/app/receiving-management/page.jsx"
);
let s = fs.readFileSync(pagePath, "utf8");

const div = ["d", "i", "v"].join("");
const close = "</" + div + ">";

const anchor = "title={qrTitle}";
const anchorPos = s.indexOf(anchor);
const start = s.lastIndexOf("<" + div, anchorPos);
if (start < 0) {
  console.error("QR block open not found");
  process.exit(1);
}

if (s.slice(Math.max(0, start - 40), start).includes("RECEIVING_V3_NO_QR")) {
  console.log("Already patched");
  process.exit(0);
}

const grnIdx = s.indexOf("backgroundColor: hasGrn", start);
const end = s.indexOf(close, grnIdx);
if (end < 0) {
  console.error("QR block close not found");
  process.exit(1);
}
const endPos = end + close.length;

s =
  s.slice(0, start) +
  "{!RECEIVING_V3_NO_QR && (" +
  s.slice(start, endPos) +
  ")}" +
  s.slice(endPos);

fs.writeFileSync(pagePath, s);
console.log("QR block wrapped");

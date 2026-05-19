const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "../src/app/receiving-management/page.jsx"
);
let s = fs.readFileSync(filePath, "utf8");

const qrCellStart = s.indexOf("{item.qr_code ? (");
const netAmountEnd = s.lastIndexOf('                                      : "-"}', qrCellStart);
if (qrCellStart < 0 || netAmountEnd < 0) {
  console.error("QR cell block not found", qrCellStart, netAmountEnd);
  process.exit(1);
}

const tdStart = s.lastIndexOf('<td className="small">', qrCellStart);
const trEnd = s.indexOf("</tr>", qrCellStart);
if (tdStart < 0 || trEnd < 0) {
  console.error("td/tr bounds not found");
  process.exit(1);
}

s = s.slice(0, tdStart) + s.slice(trEnd);

const modalStart = s.indexOf("{qrPreviewData && (");
const modalEnd = s.indexOf(
  "{/* Status Update Confirmation Modal",
  modalStart
);
if (modalStart >= 0 && modalEnd > modalStart) {
  s = s.slice(0, modalStart) + s.slice(modalEnd);
}

fs.writeFileSync(filePath, s);
console.log("Removed QR column cells and preview modal");

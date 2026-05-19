/**
 * Remove V3-dead QR / dispatch UI from receiving-management page.
 */
const fs = require("fs");
const path = require("path");

const pagePath = path.join(
  __dirname,
  "../src/app/receiving-management/page.jsx"
);
let src = fs.readFileSync(pagePath, "utf8");
const nl = src.includes("\r\n") ? "\r\n" : "\n";

function dropBetween(startMarker, endMarker, { includeEnd = false } = {}) {
  const start = src.indexOf(startMarker);
  if (start < 0) {
    console.warn("skip (not found):", startMarker.slice(0, 60));
    return;
  }
  const end = src.indexOf(endMarker, start + startMarker.length);
  if (end < 0) {
    console.error("end not found for:", startMarker.slice(0, 60));
    process.exit(1);
  }
  const cutEnd = includeEnd ? end + endMarker.length : end;
  src = src.slice(0, start) + src.slice(cutEnd);
  console.log("removed block:", startMarker.slice(0, 50).trim());
}

src = src.replace(
  /^const RECEIVING_V3_NO_QR = true;.*\r?\n/m,
  ""
);
src = src.replace(/\s*const qrHandledRef = useRef\(false\);\r?\n/, nl);
src = src.replace(
  /\s*const \[qrPreviewData, setQrPreviewData\] = useState\(null\);\r?\n\s*const \[qrPreviewSku, setQrPreviewSku\] = useState\(null\);\r?\n\s*const \[qrGenerationStatus, setQrGenerationStatus\] = useState\(\{\}\);\r?\n/,
  nl
);

dropBetween(
  "  useEffect(() => {\n    if (!searchParams) return;\n    if (qrHandledRef.current) return;",
  "  ]);\n\n  // Helper function to add SKU text to QR code image"
);

dropBetween(
  "  // Helper function to add SKU text to QR code image (legacy 2-up format)",
  "  // Handle settings icon click (open status confirmation modal)"
);

src = src.replace(
  /    \/\/ If attempting arrived -> fulfilled, enforce QC \+ Documents \+ GRN \+ QR Codes presence/,
  "    // If attempting arrived -> fulfilled, enforce QC + Documents + GRN"
);
src = src.replace(/\s*setQrPreviewData\(null\);\r?\n/, nl);

src = src.replace(
  /\s*handleGenerateQrCodes=\{handleGenerateQrCodes\}\r?\n\s*qrGenerationStatus=\{qrGenerationStatus\}\r?\n/,
  nl
);

src = src.replace(/\s*handleGenerateQrCodes,\r?\n\s*qrGenerationStatus,\r?\n/, nl);

src = src.replace(
  /\s*const isGeneratingQr = Boolean\(\r?\n\s*qrGenerationStatus\?\.\[request\.request_id\]\r?\n\s*\);\r?\n/,
  nl
);

src = src.replace(
  /\s*\/\/ Check if QR codes are already generated[\s\S]*?const qrTitle = !qcCompleted[\s\S]*?: "Generate QR codes";\r?\n/,
  nl
);

src = src.replace(
  /\s*\{!RECEIVING_V3_NO_QR && \([\s\S]*?\)\}\r?\n/,
  nl
);

fs.writeFileSync(pagePath, src);
console.log("Wrote", pagePath);

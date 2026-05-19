const fs = require("fs");
const path = require("path");

const pagePath = path.join(
  __dirname,
  "../src/app/receiving-management/page.jsx"
);
const lines = fs.readFileSync(pagePath, "utf8").split(/\r?\n/);

const marker = "const ReceivingManagementLayer = () => {";
const indices = [];
lines.forEach((line, i) => {
  if (line === marker) indices.push(i);
});

if (indices.length < 2) {
  console.log("No duplicate ReceivingManagementLayer found", indices);
  process.exit(0);
}

const cutStart = indices[1];
const exportLine = lines.findIndex((l) => l.startsWith("export default"));
if (exportLine < 0) {
  console.error("export default not found");
  process.exit(1);
}

const kept = [...lines.slice(0, cutStart), ...lines.slice(exportLine)];
fs.writeFileSync(pagePath, kept.join("\n"));
console.log(
  `Removed duplicate block lines ${cutStart + 1}-${exportLine} (${exportLine - cutStart} lines)`
);

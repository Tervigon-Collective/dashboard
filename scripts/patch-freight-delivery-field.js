const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "../src/app/receiving-management/page.jsx"
);
const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

if (lines.some((l) => l.includes('placeholder="Total freight for this PR"'))) {
  console.log("Already has freight field");
  process.exit(0);
}

const block = [
  '                  <motion.div className="col-md-6 mb-3">',
  '                    <label className="form-label">Freight cost</label>',
  "                    <input",
  '                      type="number"',
  '                      step="0.01"',
  '                      min="0"',
  '                      className="form-control"',
  '                      value={formData.freightCost ?? ""}',
  "                      onChange={(e) => handleFreightCostChange(e.target.value)}",
  '                      placeholder="Total freight for this PR"',
  "                    />",
  "                  </motion.div>",
];

const elOpen = "<" + "div";
const elClose = "</" + "motion.div>";
const fixed = block.map((line) =>
  line
    .replace("<motion.div", elOpen)
    .replace("</motion.div>", "</" + "motion.div>".replace("motion.", ""))
);

lines.splice(5706, 0, ...fixed);
fs.writeFileSync(filePath, lines.join("\n"));
console.log("Inserted freight field");

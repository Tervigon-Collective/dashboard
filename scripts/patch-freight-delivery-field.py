from pathlib import Path

p = Path(__file__).resolve().parent.parent / "src/app/receiving-management/page.jsx"
lines = p.read_text(encoding="utf-8").splitlines()
if any("Total freight for this PR" in line for line in lines):
    print("already")
    raise SystemExit(0)

d = "div"
block = [
    f'                  <{d} className="col-md-6 mb-3">',
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
    f"                  </{d}>",
]
lines[5706:5706] = block
p.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("ok")

from pathlib import Path

p = Path(__file__).resolve().parent.parent / "src/components/receiving/ReceivingPrProductFields.jsx"
lines = p.read_text(encoding="utf-8").splitlines()
if any("Freight (share)" in line for line in lines):
    print("already")
    raise SystemExit(0)

d = "div"
insert_at = None
for i, line in enumerate(lines):
    if 'label className="form-label small mb-1">GST amount' in line:
        for j in range(i, min(i + 15, len(lines))):
            if lines[j].strip() == "</div>" and lines[j + 1].strip() == "</motion.div>":
                insert_at = j + 1
                break
            if lines[j].strip() == "</div>" and lines[j + 1].strip() == "</div>":
                insert_at = j + 1
                break
        break

if insert_at is None:
    raise SystemExit("anchor not found")

block = [
    f'            <{d} className="row g-2 mt-1">',
    f'              <{d} className="col-12 col-md-4">',
    '                <label className="form-label small mb-1">Freight (share)</label>',
    "                <input",
    '                  type="number"',
    '                  step="0.01"',
    '                  className="form-control form-control-sm bg-light"',
    "                  value={",
    "                    variant.freight_amount === 0 || variant.freight_amount",
    "                      ? variant.freight_amount",
    '                      : ""',
    "                  }",
    "                  readOnly",
    "                />",
    f"              </{d}>",
    f"            </{d}>",
]
lines[insert_at:insert_at] = block
p.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("ok", insert_at + 1)

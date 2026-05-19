from pathlib import Path

p = Path(__file__).resolve().parent.parent / "src/components/receiving/ReceivingPrProductFields.jsx"
lines = p.read_text(encoding="utf-8").splitlines()
idx = next(
    i
    for i, line in enumerate(lines)
    if "Freight (share)" in line
)
# row starts 2 lines above label
row_idx = idx - 2
if lines[row_idx - 1].strip() != "</div>":
    raise SystemExit(f"unexpected before row: {lines[row_idx - 1]!r}")
if lines[row_idx - 2].strip() == "</motion.div>":
    print("already fixed")
    raise SystemExit(0)
lines.insert(row_idx, "            </div>")
p.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("ok", row_idx + 1)

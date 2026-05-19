const fs = require("fs");
const path = require("path");

const pagePath = path.join(
  __dirname,
  "../src/app/receiving-management/page.jsx"
);
const lines = fs.readFileSync(pagePath, "utf8").split(/\r?\n/);

const startIdx = lines.findIndex((l) => l.includes("{!RECEIVING_V3_NO_QR && ()}"));
if (startIdx < 0) {
  console.error("Broken QR marker not found");
  process.exit(1);
}

const exportIdx = lines.findIndex(
  (l, i) => i > startIdx && l.trim() === "export default ReceivingManagementPage;"
);
if (exportIdx < 0) {
  console.error("export default not found");
  process.exit(1);
}

const closeComponentIdx = exportIdx - 2; // line before blank line before export
if (!lines[closeComponentIdx]?.trim().startsWith("};")) {
  console.error(
    "Unexpected line before export:",
    lines[closeComponentIdx],
    "at",
    closeComponentIdx + 1
  );
  process.exit(1);
}

const replacement = `                                {hasGrn ? (
                                  <button
                                    className="btn btn-sm"
                                    style={{
                                      width: "32px",
                                      height: "32px",
                                      padding: 0,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      border: "1px solid #e5e7eb",
                                      borderRadius: "6px",
                                      backgroundColor: "white",
                                    }}
                                    title="Download GRN PDF"
                                    onClick={() => handleDownloadGrn(request)}
                                    disabled={downloadingGrn[request.request_id]}
                                  >
                                    {downloadingGrn[request.request_id] ? (
                                      <span
                                        className="spinner-border spinner-border-sm"
                                        role="status"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <Icon
                                        icon="mdi:file-document-outline"
                                        width="16"
                                        height="16"
                                        style={{ color: "#16a34a" }}
                                      />
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-sm"
                                    style={{
                                      width: "32px",
                                      height: "32px",
                                      padding: 0,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      border: "1px solid #e5e7eb",
                                      borderRadius: "6px",
                                      backgroundColor: !qcCompleted
                                        ? "#f3f4f6"
                                        : "white",
                                      opacity: !qcCompleted ? 0.6 : 1,
                                      cursor: !qcCompleted
                                        ? "not-allowed"
                                        : "pointer",
                                    }}
                                    title={
                                      !qcCompleted
                                        ? "Complete quality inspection to generate GRN"
                                        : "Generate GRN PDF"
                                    }
                                    onClick={() => {
                                      if (qcCompleted) {
                                        handleGenerateAndDownloadGrn(request);
                                      }
                                    }}
                                    disabled={
                                      !qcCompleted ||
                                      generatingGrn[request.request_id]
                                    }
                                  >
                                    {generatingGrn[request.request_id] ? (
                                      <span
                                        className="spinner-border spinner-border-sm"
                                        role="status"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <Icon
                                        icon="mdi:file-document-plus-outline"
                                        width="16"
                                        height="16"
                                        style={{
                                          color: !qcCompleted
                                            ? "#9ca3af"
                                            : "#16a34a",
                                        }}
                                      />
                                    )}
                                  </button>
                                )}
                                <button
                                  className="btn btn-sm"
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    padding: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "6px",
                                    backgroundColor: "white",
                                  }}
                                  title="Mark as Fulfilled"
                                  onClick={() =>
                                    handleSettingsClick(request, "fulfilled")
                                  }
                                >
                                  <Icon
                                    icon="lucide:settings"
                                    width="16"
                                    height="16"
                                    style={{ color: "#f59e0b" }}
                                  />
                                </button>
                                {!RECEIVING_V3_NO_QR && (
                                  <motion.div
                                    title={qrTitle}
                                    style={{
                                      display: "inline-block",
                                      position: "relative",
                                    }}
                                  >
                                    <button
                                      className="btn btn-sm"
                                      style={{
                                        width: "32px",
                                        height: "32px",
                                        padding: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "6px",
                                        backgroundColor: qrDisabled
                                          ? "#f3f4f6"
                                          : "white",
                                        opacity: qrDisabled ? 0.6 : 1,
                                        cursor: qrDisabled
                                          ? "not-allowed"
                                          : "pointer",
                                      }}
                                      onClick={() => {
                                        if (!qrDisabled) {
                                          handleGenerateQrCodes(request);
                                        }
                                      }}
                                      disabled={qrDisabled}
                                    >
                                      {isGeneratingQr ? (
                                        <span
                                          className="spinner-border spinner-border-sm"
                                          role="status"
                                          aria-hidden="true"
                                        />
                                      ) : (
                                        <Icon
                                          icon="mdi:qrcode"
                                          width="16"
                                          height="16"
                                          style={{
                                            color: qrDisabled
                                              ? "#9ca3af"
                                              : "#111827",
                                          }}
                                        />
                                      )}
                                    </button>
                                  </motion.div>
                                )}
                              </motion.div>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </motion.div>

          {requests.length > 0 && (
            <motion.div
              className="d-flex justify-content-between align-items-center px-3 py-2"
              style={{
                backgroundColor: "#f8f9fa",
                borderRadius: "0 0 8px 8px",
                marginTop: "0",
                position: "sticky",
                bottom: 0,
                zIndex: 5,
              }}
            >
              <motion.div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                Showing <strong>{requests.length}</strong> entries
              </motion.div>
              {hasMoreData() && (
                <motion.div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                  Scroll down to load more
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  </>
);
};`
  .replace(/<\/?motion\.div/g, (m) => m.replace("motion.", ""))
  .split("\n");

const kept = [
  ...lines.slice(0, startIdx),
  ...replacement,
  ...lines.slice(exportIdx),
];

fs.writeFileSync(pagePath, kept.join("\n"));
console.log(
  `Replaced lines ${startIdx + 1}-${exportIdx} (${exportIdx - startIdx} lines)`
);

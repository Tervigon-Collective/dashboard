"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { Modal, Button } from "react-bootstrap";
import { toast } from "react-toastify";

import MasterLayout from "@/masterLayout/MasterLayout";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import inventoryManagementApi from "@/services/inventoryManagementApi";

const formatNumber = (value) => {
  if (value === null || value === undefined) return "-";
  return Number(value).toLocaleString();
};

const InventoryDetailModal = ({ item, ledger, isOpen, onClose, loading }) => {
  if (!item) return null;

  return (
    <Modal show={isOpen} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Inventory Detail</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <div className="text-muted small">Product</div>
            <div className="fw-semibold">{item.product_name}</div>
            <div className="small text-muted">HSN: {item.hsn_code || "-"}</div>
          </div>
          <div className="col-md-6">
            <div className="text-muted small">Variant</div>
            <div className="fw-semibold">{item.variant_display_name}</div>
            <div className="small text-muted">SKU: {item.sku || "-"}</div>
          </div>
        </div>
        <div className="row g-3">
          {[
            { label: "Available", value: item.available_quantity },
            { label: "Committed", value: item.committed_quantity },
            { label: "Cancelled", value: item.cancelled_quantity },
            {
              label: "Approved Returns",
              value: item.approved_returns_quantity,
            },
            { label: "Damaged", value: item.damaged_quantity },
            { label: "Total Received", value: item.total_received_quantity },
          ].map((metric) => (
            <div className="col-6 col-md-4" key={metric.label}>
              <div className="text-muted small">{metric.label}</div>
              <div className="fw-semibold">{formatNumber(metric.value)}</div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <h6 className="mb-3">Recent Ledger Entries</h6>
          {loading ? (
            <div className="d-flex justify-content-center py-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : !ledger?.data?.length ? (
            <div className="text-center text-muted py-3">
              No ledger entries found.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Event</th>
                    <th>Delta Available</th>
                    <th>Delta Committed</th>
                    <th>Source</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.data.map((entry) => (
                    <tr key={entry.ledger_entry_id}>
                      <td className="text-uppercase small fw-semibold">
                        {entry.event_type.replace(/_/g, " ")}
                      </td>
                      <td>{formatNumber(entry.delta_available)}</td>
                      <td>{formatNumber(entry.delta_committed)}</td>
                      <td className="small text-muted">
                        {entry.source_reference || "-"}
                      </td>
                      <td className="small text-muted">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const ReturnActionButtons = ({ row, onApprove, onReject, busy }) => {
  if (row.status !== "pending") {
    return (
      <div className="d-flex justify-content-end">
        <span className="badge bg-light text-secondary">{row.status}</span>
      </div>
    );
  }

  return (
    <div className="d-flex gap-2 justify-content-end">
      <button
        type="button"
        className="btn btn-sm btn-success"
        disabled={busy}
        onClick={() => onApprove(row)}
      >
        Approve
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        disabled={busy}
        onClick={() => onReject(row)}
      >
        Reject
      </button>
    </div>
  );
};

const MoveToInventoryModal = ({
  variant,
  isOpen,
  onClose,
  onMove,
  loading,
}) => {
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [skuValidation, setSkuValidation] = useState(null);
  const [validatingSku, setValidatingSku] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSku("");
      setQuantity(1);
      setSkuValidation(null);
    }
  }, [isOpen]);

  const handleValidateSku = async () => {
    if (!sku.trim()) {
      setSkuValidation({ valid: false, message: "Please enter a SKU" });
      return;
    }

    setValidatingSku(true);
    try {
      const response = await inventoryManagementApi.validateSkuForSampleMove(
        sku.trim()
      );
      if (response.success && response.data.valid) {
        setSkuValidation({
          valid: true,
          message: "SKU validated successfully",
          ...response.data,
        });
      } else {
        setSkuValidation({
          valid: false,
          message: response.message || "SKU validation failed",
        });
      }
    } catch (error) {
      setSkuValidation({
        valid: false,
        message: error.message || "SKU not found in master product variants",
      });
    } finally {
      setValidatingSku(false);
    }
  };

  const handleConfirmMove = () => {
    if (!skuValidation?.valid) {
      toast.error("Please validate SKU first");
      return;
    }
    if (quantity <= 0 || quantity > variant.available_to_move) {
      toast.error("Invalid quantity");
      return;
    }
    onMove(variant, sku.trim(), quantity, skuValidation.variant_id);
  };

  const formatVariantType = (variantType) => {
    if (!variantType || typeof variantType !== "object") return "-";
    return Object.entries(variantType)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  if (!variant) return null;

  return (
    <Modal show={isOpen} onHide={onClose} size="md" centered>
      <Modal.Header closeButton>
        <Modal.Title>Move Sample to Inventory</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <div className="text-muted small">Product</div>
          <div className="fw-semibold">{variant.product_name}</div>
        </div>
        <div className="mb-3">
          <div className="text-muted small">Variant</div>
          <div className="fw-semibold">
            {formatVariantType(variant.variant_type)}
          </div>
        </div>
        <div className="mb-3">
          <div className="text-muted small">Available to Move</div>
          <div className="fw-semibold">{variant.available_to_move} units</div>
        </div>

        <div className="mb-3">
          <label className="form-label">
            SKU (from Master) <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Enter SKU from product_variants"
              value={sku}
              onChange={(e) => {
                setSku(e.target.value);
                setSkuValidation(null);
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleValidateSku();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={handleValidateSku}
              disabled={validatingSku || !sku.trim()}
            >
              {validatingSku ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                "Validate"
              )}
            </button>
          </div>
          {skuValidation && (
            <div
              className={`mt-2 small ${
                skuValidation.valid ? "text-success" : "text-danger"
              }`}
            >
              {skuValidation.message}
            </div>
          )}
        </div>

        {skuValidation?.valid && (
          <div className="mb-3">
            <div className="text-muted small">Master Variant</div>
            <div className="fw-semibold">
              {skuValidation.variant_display_name || skuValidation.sku}
            </div>
          </div>
        )}

        <div className="mb-3">
          <label className="form-label">
            Quantity to Move <span className="text-danger">*</span>
          </label>
          <input
            type="number"
            className="form-control"
            min="1"
            max={variant.available_to_move}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
          />
          <div className="form-text">
            Maximum: {variant.available_to_move} units
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirmMove}
          disabled={
            loading ||
            !skuValidation?.valid ||
            quantity <= 0 ||
            quantity > variant.available_to_move
          }
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Moving...
            </>
          ) : (
            "Move to Inventory"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const QrCodeModal = ({
  qrCodeUrl,
  isOpen,
  onClose,
  productName,
  variantName,
}) => {
  const handleDownload = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `sample-qr-${productName}-${variantName}.png`.replace(
      /[^a-z0-9.-]/gi,
      "-"
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal show={isOpen} onHide={onClose} size="sm" centered>
      <Modal.Header closeButton>
        <Modal.Title>QR Code Generated</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        <div className="mb-3">
          <div className="text-muted small mb-2">Product: {productName}</div>
          <div className="text-muted small mb-3">Variant: {variantName}</div>
        </div>
        {qrCodeUrl && (
          <div className="mb-3">
            <img
              src={qrCodeUrl}
              alt="Sample Inventory QR Code"
              style={{
                maxWidth: "100%",
                height: "auto",
                border: "1px solid #dee2e6",
                borderRadius: "8px",
              }}
            />
          </div>
        )}
        <div className="text-muted small">
          This QR code can be scanned multiple times for dispatch (once per
          unit).
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {qrCodeUrl && (
          <Button variant="primary" onClick={handleDownload}>
            <Icon icon="mdi:download" width={18} height={18} className="me-1" />
            Download QR Code
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

const StockManagementPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("inventory");
  const qrHandledRef = useRef(false);
  const [highlightedVariantId, setHighlightedVariantId] = useState(null);

  // Infinite scroll state for inventory
  const inventoryTableContainerRef = useRef(null);
  const inventoryInfiniteScrollRef = useRef(false);
  const inventoryPrevPageRef = useRef(1);
  const inventoryPrevSearchRef = useRef("");
  const inventoryPrevLimitRef = useRef(25);
  const inventoryStateRef = useRef(null); // Ref to track current state
  const [inventoryIsMounted, setInventoryIsMounted] = useState(false);

  const [inventoryState, setInventoryState] = useState({
    data: [],
    pagination: { page: 1, totalPages: 1, total: 0 },
    loading: false,
    search: "",
    limit: 25,
    displayedItemsCount: 25, // For infinite scroll
    isLoadingMore: false, // For infinite scroll
  });
  const [inventoryDetail, setInventoryDetail] = useState({
    item: null,
    ledger: null,
    loadingLedger: false,
  });

  const [returnsState, setReturnsState] = useState({
    data: [],
    pagination: { page: 1, totalPages: 1 },
    loading: false,
    status: "pending",
    busyCaseId: null,
  });

  const [sampleProductsState, setSampleProductsState] = useState({
    data: [],
    pagination: { page: 1, totalPages: 1 },
    loading: false,
    search: "",
    limit: 50,
  });

  const [moveModalState, setMoveModalState] = useState({
    isOpen: false,
    variant: null,
    loading: false,
    qrCodeUrl: null,
    showQrCode: false,
  });

  const [qrPreviewState, setQrPreviewState] = useState({
    isOpen: false,
    qrCodeUrl: null,
    productName: "",
    variantName: "",
    procurementVariantId: null,
    masterVariantId: null,
  });

  // Debounced search for inventory (like VendorMasterLayer)
  const [debouncedInventorySearch, setDebouncedInventorySearch] = useState("");

  // Keep ref in sync with state
  useEffect(() => {
    inventoryStateRef.current = inventoryState;
  }, [inventoryState]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInventorySearch(inventoryState.search);
    }, 500);
    return () => clearTimeout(timer);
  }, [inventoryState.search]);

  const loadInventory = useCallback(
    async ({ page, limit, search, append = false } = {}) => {
      // Get current state from ref (updated in useEffect)
      const currentState = inventoryStateRef.current || {
        pagination: { page: 1, totalPages: 1, total: 0 },
        limit: 25,
        search: "",
      };

      if (!append) {
        setInventoryState((prev) => ({ ...prev, loading: true }));
      } else {
        setInventoryState((prev) => ({ ...prev, isLoadingMore: true }));
      }

      try {
        const targetPage = page ?? currentState.pagination.page;
        const targetLimit = limit ?? currentState.limit;
        const targetSearch = search ?? currentState.search;

        const response = await inventoryManagementApi.listInventoryItems({
          page: targetPage,
          limit: targetLimit,
          search: targetSearch,
        });

        const data = Array.isArray(response?.data)
          ? response.data
          : response?.data?.data || [];
        const pagination = response?.pagination ||
          response?.data?.pagination || {
            page: 1,
            totalPages: 1,
            total: data.length,
          };

        setInventoryState((prev) => {
          // Re-read values in case they changed
          const finalPage = page ?? prev.pagination.page;
          const finalLimit = limit ?? prev.limit;
          const finalSearch = search ?? prev.search;

          if (append) {
            // Append mode: merge new data with existing
            return {
              ...prev,
              data: [...prev.data, ...data],
              pagination,
              isLoadingMore: false,
            };
          } else {
            // Replace mode: replace all data
            return {
              ...prev,
              data,
              pagination,
              loading: false,
              limit: finalLimit,
              search: finalSearch,
              displayedItemsCount: finalLimit, // Reset displayed count
            };
          }
        });
      } catch (error) {
        console.error("Failed to load inventory", error);
        toast.error(error.message || "Failed to load inventory");
        setInventoryState((prev) => ({
          ...prev,
          loading: false,
          isLoadingMore: false,
        }));
      }
    },
    [] // No dependencies - using functional updates
  );

  const loadReturns = useCallback(
    async ({ page, status } = {}) => {
      setReturnsState((prev) => ({ ...prev, loading: true }));
      try {
        const response = await inventoryManagementApi.listReturnCases({
          status: status ?? returnsState.status,
          page: page ?? returnsState.pagination.page,
          limit: 25,
        });

        const data = Array.isArray(response?.data)
          ? response.data
          : response?.data?.data || [];
        const pagination = response?.pagination ||
          response?.data?.pagination || {
            page: 1,
            totalPages: 1,
            total: data.length,
          };

        setReturnsState((prev) => ({
          ...prev,
          data,
          pagination,
          status: status ?? prev.status,
          loading: false,
        }));
      } catch (error) {
        console.error("Failed to load return cases", error);
        toast.error(error.message || "Failed to load return cases");
        setReturnsState((prev) => ({ ...prev, loading: false }));
      }
    },
    [returnsState.pagination.page, returnsState.status]
  );

  const loadSampleProducts = useCallback(
    async ({ page, search } = {}) => {
      setSampleProductsState((prev) => ({ ...prev, loading: true }));
      try {
        const response = await inventoryManagementApi.getSampleProducts({
          page: page ?? sampleProductsState.pagination.page,
          limit: sampleProductsState.limit,
          search: search ?? sampleProductsState.search,
        });

        const data = response?.data?.data || [];
        const pagination = response?.data?.pagination || {
          page: 1,
          totalPages: 1,
          total: data.length,
        };

        setSampleProductsState((prev) => ({
          ...prev,
          data,
          pagination,
          loading: false,
        }));
      } catch (error) {
        console.error("Failed to load sample products", error);
        toast.error(error.message || "Failed to load sample products");
        setSampleProductsState((prev) => ({ ...prev, loading: false }));
      }
    },
    [
      sampleProductsState.pagination.page,
      sampleProductsState.limit,
      sampleProductsState.search,
    ]
  );

  const handleMoveToInventory = (variant) => {
    setMoveModalState({ isOpen: true, variant, loading: false });
  };

  const handleCloseMoveModal = () => {
    // Clean up QR code URL if it exists
    if (moveModalState.qrCodeUrl) {
      URL.revokeObjectURL(moveModalState.qrCodeUrl);
    }
    setMoveModalState({
      isOpen: false,
      variant: null,
      loading: false,
      qrCodeUrl: null,
      showQrCode: false,
    });
  };

  const handleConfirmMove = async (variant, sku, quantity, masterVariantId) => {
    setMoveModalState((prev) => ({ ...prev, loading: true }));
    try {
      const response = await inventoryManagementApi.moveSampleToInventory(
        variant.procurement_variant_id,
        { sku, quantity }
      );

      if (response.success && response.data?.qr_code) {
        const qrCode = response.data.qr_code;
        toast.success(
          `Sample quantity moved to inventory successfully${
            qrCode.is_new ? " (QR code generated)" : " (QR code reused)"
          }`
        );

        // Close move modal first
        setMoveModalState((prev) => ({
          ...prev,
          isOpen: false,
          loading: false,
        }));

        // Show QR code modal
        if (masterVariantId) {
          try {
            const qrImageUrl = await inventoryManagementApi.getSampleQrCode({
              procurementVariantId: variant.procurement_variant_id,
              masterVariantId: masterVariantId,
            });
            setMoveModalState((prev) => ({
              ...prev,
              qrCodeUrl: qrImageUrl,
              showQrCode: true,
              variant: variant, // Keep variant for QR modal display
            }));
          } catch (qrError) {
            console.error("Failed to load QR code:", qrError);
            // Don't block the success - QR code generation succeeded, just display failed
            toast.warning(
              "QR code generated but could not be displayed. You can access it later."
            );
          }
        }
      } else {
        toast.success("Sample quantity moved to inventory successfully");
        handleCloseMoveModal();
      }

      loadSampleProducts({ page: sampleProductsState.pagination.page });
    } catch (error) {
      console.error("Failed to move sample to inventory", error);
      toast.error(error.message || "Failed to move sample to inventory");
      handleCloseMoveModal();
    } finally {
      setMoveModalState((prev) => ({ ...prev, loading: false }));
    }
  };

  // Initial load on mount
  useEffect(() => {
    if (activeTab === "inventory") {
      setInventoryIsMounted(true);
      loadInventory({ page: 1 });
      inventoryPrevPageRef.current = 1;
      inventoryPrevSearchRef.current = "";
      inventoryPrevLimitRef.current = 25;
    } else if (activeTab === "returns") {
      loadReturns({ page: 1 });
    } else if (activeTab === "sample-products") {
      loadSampleProducts({ page: 1 });
    }
  }, [activeTab, loadReturns, loadSampleProducts]);

  // Handle QR code deep link - similar to receiving management
  useEffect(() => {
    if (!searchParams) return;
    if (qrHandledRef.current) return;

    const fromQr = searchParams.get("fromQr");
    const procurementVariantIdParam = searchParams.get("procurementVariantId");
    const masterVariantIdParam = searchParams.get("masterVariantId");
    const tokenParam = searchParams.get("token");

    if (!fromQr || !procurementVariantIdParam) {
      return;
    }

    const procurementVariantIdNum = Number(procurementVariantIdParam);

    if (!Number.isFinite(procurementVariantIdNum)) {
      qrHandledRef.current = true;
      return;
    }

    const openFromQr = async () => {
      try {
        // Switch to sample products tab
        setActiveTab("sample-products");

        // Load sample products if not already loaded
        if (sampleProductsState.data.length === 0) {
          await loadSampleProducts({ page: 1 });
        }

        // Find the variant in the loaded data
        let variantToHighlight = sampleProductsState.data.find(
          (v) => Number(v.procurement_variant_id) === procurementVariantIdNum
        );

        // If not found in current data, try loading it
        if (!variantToHighlight) {
          try {
            const response = await inventoryManagementApi.getSampleProducts({
              page: 1,
              limit: 1000, // Load more to find the variant
              search: "",
            });
            const allVariants = response?.data?.data || [];
            variantToHighlight = allVariants.find(
              (v) =>
                Number(v.procurement_variant_id) === procurementVariantIdNum
            );
            if (variantToHighlight) {
              // Update state with found variant
              setSampleProductsState((prev) => ({
                ...prev,
                data: allVariants,
              }));
            }
          } catch (error) {
            console.error("Failed to load variant for QR deep link:", error);
          }
        }

        // Highlight the variant
        if (variantToHighlight) {
          setHighlightedVariantId(procurementVariantIdNum);
          // Remove highlight after 3 seconds
          setTimeout(() => {
            setHighlightedVariantId(null);
          }, 3000);
        }

        // Mark as handled and remove query params
        setTimeout(() => {
          qrHandledRef.current = true;
          router.replace("/stock-management", { scroll: false });
        }, 100);
      } catch (error) {
        console.error("Error opening QR deep link:", error);
        // Don't mark as handled on error, so it can retry if needed
      }
    };

    openFromQr();
  }, [searchParams, sampleProductsState.data, loadSampleProducts, router]);

  // Handle inventory data loading with infinite scroll logic (similar to VendorMasterLayer)
  useEffect(() => {
    if (!inventoryIsMounted || activeTab !== "inventory") return;

    const currentSearch = debouncedInventorySearch;
    const currentLimit = inventoryState.limit;
    const currentPage = inventoryState.pagination.page;

    const prevSearch = inventoryPrevSearchRef.current;
    const prevLimit = inventoryPrevLimitRef.current;
    const prevPage = inventoryPrevPageRef.current;

    // Check if search or limit changed
    const searchChanged = prevSearch !== currentSearch;
    const limitChanged = prevLimit !== currentLimit;
    const pageChanged = prevPage !== currentPage;

    // If search or limit changed, reset to page 1 and load
    if (searchChanged || limitChanged) {
      inventoryPrevSearchRef.current = currentSearch;
      inventoryPrevLimitRef.current = currentLimit;
      inventoryInfiniteScrollRef.current = false;
      if (currentPage !== 1) {
        inventoryPrevPageRef.current = currentPage;
        setInventoryState((prev) => ({
          ...prev,
          pagination: { ...prev.pagination, page: 1 },
        }));
      } else {
        inventoryPrevPageRef.current = 1;
        loadInventory({ page: 1, search: currentSearch, limit: currentLimit });
      }
      return;
    }

    // If only page changed (not from infinite scroll), load that page
    if (pageChanged && currentPage > 0 && !inventoryInfiniteScrollRef.current) {
      inventoryPrevPageRef.current = currentPage;
      loadInventory({ page: currentPage });
    } else if (pageChanged && inventoryInfiniteScrollRef.current) {
      // Page changed from infinite scroll, just update the ref and reset flag
      inventoryPrevPageRef.current = currentPage;
      inventoryInfiniteScrollRef.current = false;
    }
  }, [
    inventoryIsMounted,
    activeTab,
    debouncedInventorySearch,
    inventoryState.limit,
    inventoryState.pagination.page,
    loadInventory,
  ]);

  const openInventoryDetail = useCallback(async (item) => {
    setInventoryDetail({ item, ledger: null, loadingLedger: true });
    try {
      const [freshItem, ledger] = await Promise.all([
        inventoryManagementApi.getInventoryItem(item.inventory_item_id),
        inventoryManagementApi.getInventoryLedger(item.inventory_item_id, {
          limit: 10,
        }),
      ]);
      const resolvedItem = freshItem?.data || freshItem;
      const resolvedLedger = ledger?.data ? ledger : { data: ledger };
      setInventoryDetail({
        item: resolvedItem,
        ledger: resolvedLedger,
        loadingLedger: false,
      });
    } catch (error) {
      console.error("Failed to load inventory detail", error);
      toast.error(error.message || "Failed to load inventory detail");
      setInventoryDetail((prev) => ({ ...prev, loadingLedger: false }));
    }
  }, []);

  const closeInventoryDetail = useCallback(() => {
    setInventoryDetail({ item: null, ledger: null, loadingLedger: false });
  }, []);

  const handleApproveReturn = useCallback(
    async (row) => {
      setReturnsState((prev) => ({ ...prev, busyCaseId: row.return_case_id }));
      try {
        await inventoryManagementApi.approveReturnCase(row.return_case_id);
        toast.success("Return approved");
        await loadReturns({ page: returnsState.pagination.page });
      } catch (error) {
        console.error("Failed to approve return", error);
        toast.error(error.message || "Failed to approve return");
      } finally {
        setReturnsState((prev) => ({ ...prev, busyCaseId: null }));
      }
    },
    [loadReturns, returnsState.pagination.page]
  );

  const handleRejectReturn = useCallback(
    async (row) => {
      setReturnsState((prev) => ({ ...prev, busyCaseId: row.return_case_id }));
      try {
        await inventoryManagementApi.rejectReturnCase(row.return_case_id);
        toast.success("Return rejected");
        await loadReturns({ page: returnsState.pagination.page });
      } catch (error) {
        console.error("Failed to reject return", error);
        toast.error(error.message || "Failed to reject return");
      } finally {
        setReturnsState((prev) => ({ ...prev, busyCaseId: null }));
      }
    },
    [loadReturns, returnsState.pagination.page]
  );

  const handleSyncReturnCases = useCallback(async () => {
    setReturnsState((prev) => ({ ...prev, loading: true }));
    try {
      await inventoryManagementApi.syncReturnCases(200);
      toast.success("Return cases synced from Shopify data");
      await loadReturns({ page: 1 });
    } catch (error) {
      console.error("Failed to sync return cases", error);
      toast.error(error.message || "Failed to sync return cases");
    } finally {
      setReturnsState((prev) => ({ ...prev, loading: false }));
    }
  }, [loadReturns]);

  // Infinite scroll helper functions for inventory
  const getDisplayedInventoryData = useCallback(
    (dataArray) => {
      return dataArray.slice(0, inventoryState.displayedItemsCount);
    },
    [inventoryState.displayedItemsCount]
  );

  const hasMoreInventoryData = useCallback(() => {
    return (
      inventoryState.displayedItemsCount < inventoryState.data.length ||
      inventoryState.pagination.page < inventoryState.pagination.totalPages
    );
  }, [
    inventoryState.displayedItemsCount,
    inventoryState.data.length,
    inventoryState.pagination.page,
    inventoryState.pagination.totalPages,
  ]);

  const loadMoreInventoryData = useCallback(async () => {
    if (
      inventoryState.isLoadingMore ||
      inventoryState.loading ||
      !hasMoreInventoryData()
    )
      return;

    setInventoryState((prev) => ({ ...prev, isLoadingMore: true }));
    // Simulate loading delay for skeleton effect
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if we need to fetch more from API
    if (
      inventoryState.displayedItemsCount >= inventoryState.data.length &&
      inventoryState.pagination.page < inventoryState.pagination.totalPages
    ) {
      // Set flag to indicate this page change is from infinite scroll
      inventoryInfiniteScrollRef.current = true;
      await loadInventory({
        page: inventoryState.pagination.page + 1,
        append: true,
      });
    }

    setInventoryState((prev) => ({
      ...prev,
      displayedItemsCount: prev.displayedItemsCount + prev.limit,
      isLoadingMore: false,
    }));
  }, [
    inventoryState.isLoadingMore,
    inventoryState.loading,
    inventoryState.displayedItemsCount,
    inventoryState.data.length,
    inventoryState.pagination.page,
    inventoryState.pagination.totalPages,
    inventoryState.limit,
    hasMoreInventoryData,
    loadInventory,
  ]);

  // Reset displayed items when search or limit changes
  useEffect(() => {
    if (activeTab === "inventory") {
      setInventoryState((prev) => ({
        ...prev,
        displayedItemsCount: prev.limit,
      }));
    }
  }, [activeTab, debouncedInventorySearch, inventoryState.limit]);

  // Scroll detection for infinite scroll (using event listeners)
  useEffect(() => {
    if (activeTab !== "inventory") return;

    const container = inventoryTableContainerRef.current;
    if (!container) return;

    // Handle wheel events to allow page scrolling when table reaches boundaries
    const handleWheel = (e) => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const isAtTop = scrollTop <= 1;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      if (e.deltaY > 0 && isAtBottom) {
        window.scrollBy({
          top: e.deltaY,
          behavior: "auto",
        });
      } else if (e.deltaY < 0 && isAtTop) {
        window.scrollBy({
          top: e.deltaY,
          behavior: "auto",
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [activeTab]);

  const inventoryTable = useMemo(() => {
    if (inventoryState.loading && inventoryState.data.length === 0) {
      return (
        <>
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <tr key={`skeleton-${rowIndex}`}>
              {Array.from({ length: 8 }).map((_, colIndex) => (
                <td key={`skeleton-${rowIndex}-${colIndex}`}>
                  <div
                    className="skeleton"
                    style={{
                      height: "20px",
                      backgroundColor: "#e5e7eb",
                      borderRadius: "4px",
                      animation: "skeletonPulse 1.5s ease-in-out infinite",
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </>
      );
    }

    const displayedData = getDisplayedInventoryData(inventoryState.data);

    if (!displayedData.length && !inventoryState.loading) {
      return (
        <tr>
          <td colSpan={8} className="text-center text-muted py-4">
            No inventory records found
          </td>
        </tr>
      );
    }

    return (
      <>
        {displayedData.map((item) => (
          <tr key={item.inventory_item_id}>
            <td>{item.product_name}</td>
            <td>{item.variant_display_name}</td>
            <td>{item.sku || "-"}</td>
            <td className="text-center">
              {formatNumber(item.available_quantity)}
            </td>
            <td className="text-center">
              {formatNumber(item.committed_quantity)}
            </td>
            <td className="text-center">
              {formatNumber(item.cancelled_quantity)}
            </td>
            <td className="text-center">
              {formatNumber(item.approved_returns_quantity)}
            </td>
            <td className="text-end">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => openInventoryDetail(item)}
              >
                <Icon icon="mdi:eye" width={16} height={16} />
              </button>
            </td>
          </tr>
        ))}
        {inventoryState.isLoadingMore && (
          <>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={`skeleton-more-${rowIndex}`}>
                {Array.from({ length: 8 }).map((_, colIndex) => (
                  <td key={`skeleton-more-${rowIndex}-${colIndex}`}>
                    <div
                      className="skeleton"
                      style={{
                        height: "20px",
                        backgroundColor: "#e5e7eb",
                        borderRadius: "4px",
                        animation: "skeletonPulse 1.5s ease-in-out infinite",
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </>
        )}
      </>
    );
  }, [inventoryState, openInventoryDetail, getDisplayedInventoryData]);

  const returnsTable = useMemo(() => {
    if (returnsState.loading) {
      return (
        <tr>
          <td colSpan={8} className="text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </td>
        </tr>
      );
    }

    if (!returnsState.data.length) {
      return (
        <tr>
          <td colSpan={8} className="text-center text-muted py-4">
            No return cases
          </td>
        </tr>
      );
    }

    return returnsState.data.map((row) => (
      <tr key={row.return_case_id}>
        <td>{row.order_id}</td>
        <td>{row.sku || row.shopify_variant_id || "-"}</td>
        <td>{row.variant_display_name || "-"}</td>
        <td className="text-center">{formatNumber(row.quantity)}</td>
        <td className="text-center">{row.status}</td>
        <td className="text-muted small">{row.reason || "-"}</td>
        <td className="text-muted small">
          {new Date(row.reported_at).toLocaleString()}
        </td>
        <td className="text-end">
          <ReturnActionButtons
            row={row}
            busy={returnsState.busyCaseId === row.return_case_id}
            onApprove={handleApproveReturn}
            onReject={handleRejectReturn}
          />
        </td>
      </tr>
    ));
  }, [returnsState, handleApproveReturn, handleRejectReturn]);

  return (
    <SidebarPermissionGuard requiredSidebar="stockManagement">
      <MasterLayout>
        <div className="container-fluid py-4">
          <div className="card">
            <div className="card-header border-0 pb-0">
              <div className="d-flex gap-3">
                {[
                  { id: "inventory", label: "Inventory" },
                  { id: "returns", label: "Returns" },
                  { id: "sample-products", label: "Sample Products" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`btn btn-link px-0 text-decoration-none fw-semibold ${
                      activeTab === tab.id ? "text-primary" : "text-muted"
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="card-body">
              {activeTab === "inventory" && (
                <div>
                  <div className="row g-3 align-items-end mb-3">
                    <div className="col-md-4">
                      <label className="form-label small">Search</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Product, variant or SKU"
                        value={inventoryState.search}
                        onChange={(event) =>
                          setInventoryState((prev) => ({
                            ...prev,
                            search: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small">Page Size</label>
                      <select
                        className="form-select"
                        value={inventoryState.limit}
                        onChange={(event) =>
                          setInventoryState((prev) => ({
                            ...prev,
                            limit: Number(event.target.value) || 25,
                          }))
                        }
                      >
                        {[25, 50, 75, 100].map((option) => (
                          <option key={option} value={option}>
                            {option} rows
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-2 d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          // Reset to page 1 and trigger search
                          setInventoryState((prev) => ({
                            ...prev,
                            pagination: { ...prev.pagination, page: 1 },
                          }));
                        }}
                        disabled={inventoryState.loading}
                      >
                        <Icon icon="mdi:magnify" width={18} height={18} />
                        Search
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setInventoryState((prev) => ({
                            ...prev,
                            search: "",
                            pagination: { ...prev.pagination, page: 1 },
                          }));
                        }}
                        disabled={inventoryState.loading}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div
                    ref={inventoryTableContainerRef}
                    className="table-responsive scroll-sm table-scroll-container"
                    style={{
                      maxHeight: "600px",
                      overflowY: "auto",
                      overflowX: "auto",
                      position: "relative",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      scrollBehavior: "smooth",
                      overscrollBehavior: "auto",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                    onScroll={(e) => {
                      const target = e.target;
                      const scrollTop = target.scrollTop;
                      const scrollHeight = target.scrollHeight;
                      const clientHeight = target.clientHeight;

                      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
                        if (
                          hasMoreInventoryData() &&
                          !inventoryState.isLoadingMore &&
                          !inventoryState.loading
                        ) {
                          loadMoreInventoryData();
                        }
                      }
                    }}
                    onWheel={(e) => {
                      const target = e.currentTarget;
                      const scrollTop = target.scrollTop;
                      const scrollHeight = target.scrollHeight;
                      const clientHeight = target.clientHeight;
                      const isAtTop = scrollTop <= 1;
                      const isAtBottom =
                        scrollTop + clientHeight >= scrollHeight - 1;

                      if (e.deltaY > 0 && isAtBottom) {
                        window.scrollBy({
                          top: e.deltaY,
                          behavior: "auto",
                        });
                      } else if (e.deltaY < 0 && isAtTop) {
                        window.scrollBy({
                          top: e.deltaY,
                          behavior: "auto",
                        });
                      }
                    }}
                  >
                    <table className="table table-hover mb-0">
                      <thead
                        className="table-light"
                        style={{
                          position: "sticky",
                          top: 0,
                          zIndex: 10,
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        <tr>
                          <th>Product</th>
                          <th>Variant</th>
                          <th>SKU</th>
                          <th className="text-center">Available</th>
                          <th className="text-center">Committed</th>
                          <th className="text-center">Cancels</th>
                          <th className="text-center">Approved Returns</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>{inventoryTable}</tbody>
                    </table>
                  </div>

                  {/* Infinite Scroll Footer */}
                  {inventoryState.pagination.total > 0 && (
                    <div
                      className="d-flex justify-content-between align-items-center px-3 py-2"
                      style={{
                        backgroundColor: "#f8f9fa",
                        borderRadius: "0 0 8px 8px",
                        marginTop: "0",
                        borderTop: "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                        Showing{" "}
                        <strong>
                          {
                            getDisplayedInventoryData(inventoryState.data)
                              .length
                          }
                        </strong>{" "}
                        of <strong>{inventoryState.pagination.total}</strong>{" "}
                        items
                      </div>
                      {hasMoreInventoryData() && (
                        <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                          Scroll down to load more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "sample-products" && (
                <div>
                  <div className="row g-3 align-items-end mb-3">
                    <div className="col-md-4">
                      <label className="form-label small">Search</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Product name or SKU"
                        value={sampleProductsState.search}
                        onChange={(event) =>
                          setSampleProductsState((prev) => ({
                            ...prev,
                            search: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="col-md-2 d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => loadSampleProducts({ page: 1 })}
                        disabled={sampleProductsState.loading}
                      >
                        <Icon icon="mdi:magnify" width={18} height={18} />
                        Search
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() =>
                          setSampleProductsState((prev) => ({
                            ...prev,
                            search: "",
                          }))
                        }
                        disabled={sampleProductsState.loading}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Product Name</th>
                          <th>Variant</th>
                          <th>Procurement SKU</th>
                          <th className="text-center">Total Sample Qty</th>
                          <th className="text-center">Moved to Inventory</th>
                          <th className="text-center">Available to Move</th>
                          <th>Last Moved</th>
                          <th>QR Code</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sampleProductsState.loading ? (
                          <tr>
                            <td colSpan="9" className="text-center py-4">
                              <div className="spinner-border" role="status">
                                <span className="visually-hidden">
                                  Loading...
                                </span>
                              </div>
                            </td>
                          </tr>
                        ) : sampleProductsState.data.length === 0 ? (
                          <tr>
                            <td
                              colSpan="9"
                              className="text-center text-muted py-4"
                            >
                              No sample products found
                            </td>
                          </tr>
                        ) : (
                          sampleProductsState.data.map((variant) => {
                            const formatVariantType = (variantType) => {
                              if (
                                !variantType ||
                                typeof variantType !== "object"
                              )
                                return "-";
                              return Object.entries(variantType)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(", ");
                            };

                            const isHighlighted =
                              highlightedVariantId ===
                              variant.procurement_variant_id;

                            return (
                              <tr
                                key={variant.procurement_variant_id}
                                className={isHighlighted ? "table-warning" : ""}
                                style={
                                  isHighlighted
                                    ? {
                                        animation: "highlight 2s ease-in-out",
                                        backgroundColor: "#fff3cd",
                                      }
                                    : {}
                                }
                              >
                                <td>{variant.product_name}</td>
                                <td>
                                  {formatVariantType(variant.variant_type)}
                                </td>
                                <td>{variant.sku || "—"}</td>
                                <td className="text-center">
                                  {variant.sample_quantity}
                                </td>
                                <td className="text-center">
                                  {variant.sample_quantity_in_inventory}
                                </td>
                                <td className="text-center">
                                  <span
                                    className={`badge ${
                                      variant.available_to_move > 0
                                        ? "bg-success"
                                        : "bg-secondary"
                                    }`}
                                  >
                                    {variant.available_to_move}
                                  </span>
                                </td>
                                <td>
                                  {variant.sample_moved_to_inventory_at
                                    ? new Date(
                                        variant.sample_moved_to_inventory_at
                                      ).toLocaleDateString()
                                    : "—"}
                                </td>
                                <td>
                                  {variant.has_qr_code ? (
                                    <div className="d-flex gap-1">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={async () => {
                                          try {
                                            const qrImageUrl =
                                              await inventoryManagementApi.getSampleQrCode(
                                                {
                                                  procurementVariantId:
                                                    variant.procurement_variant_id,
                                                  masterVariantId:
                                                    variant.master_variant_id_for_qr,
                                                }
                                              );
                                            setQrPreviewState({
                                              isOpen: true,
                                              qrCodeUrl: qrImageUrl,
                                              productName: variant.product_name,
                                              variantName: formatVariantType(
                                                variant.variant_type
                                              ),
                                              procurementVariantId:
                                                variant.procurement_variant_id,
                                              masterVariantId:
                                                variant.master_variant_id_for_qr,
                                            });
                                          } catch (error) {
                                            console.error(
                                              "Failed to load QR code:",
                                              error
                                            );
                                            toast.error(
                                              error.message ||
                                                "Failed to load QR code"
                                            );
                                          }
                                        }}
                                        title="View QR Code"
                                      >
                                        <Icon
                                          icon="mdi:eye"
                                          width={16}
                                          height={16}
                                        />
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={async () => {
                                          try {
                                            const qrImageUrl =
                                              await inventoryManagementApi.getSampleQrCode(
                                                {
                                                  procurementVariantId:
                                                    variant.procurement_variant_id,
                                                  masterVariantId:
                                                    variant.master_variant_id_for_qr,
                                                }
                                              );
                                            const link =
                                              document.createElement("a");
                                            link.href = qrImageUrl;
                                            link.download = `sample-qr-${
                                              variant.product_name
                                            }-${formatVariantType(
                                              variant.variant_type
                                            )}.png`.replace(
                                              /[^a-z0-9.-]/gi,
                                              "-"
                                            );
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            URL.revokeObjectURL(qrImageUrl);
                                            toast.success("QR code downloaded");
                                          } catch (error) {
                                            console.error(
                                              "Failed to download QR code:",
                                              error
                                            );
                                            toast.error(
                                              error.message ||
                                                "Failed to download QR code"
                                            );
                                          }
                                        }}
                                        title="Download QR Code"
                                      >
                                        <Icon
                                          icon="mdi:download"
                                          width={16}
                                          height={16}
                                        />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-muted small">
                                      Not generated
                                    </span>
                                  )}
                                </td>
                                <td className="text-end">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={() =>
                                      handleMoveToInventory(variant)
                                    }
                                    disabled={variant.available_to_move === 0}
                                  >
                                    Move to Inventory
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="text-muted small">
                      Page {sampleProductsState.pagination.page} of{" "}
                      {sampleProductsState.pagination.totalPages}
                    </div>
                    <div className="btn-group">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={
                          sampleProductsState.loading ||
                          sampleProductsState.pagination.page <= 1
                        }
                        onClick={() =>
                          loadSampleProducts({
                            page: sampleProductsState.pagination.page - 1,
                          })
                        }
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={
                          sampleProductsState.loading ||
                          sampleProductsState.pagination.page >=
                            sampleProductsState.pagination.totalPages
                        }
                        onClick={() =>
                          loadSampleProducts({
                            page: sampleProductsState.pagination.page + 1,
                          })
                        }
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "returns" && (
                <div>
                  <div className="row g-3 align-items-end mb-3">
                    <div className="col-md-3">
                      <label className="form-label small">Status</label>
                      <select
                        className="form-select"
                        value={returnsState.status}
                        onChange={(event) =>
                          loadReturns({ status: event.target.value, page: 1 })
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="">All</option>
                      </select>
                    </div>
                    <div className="col-md-3 d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={handleSyncReturnCases}
                        disabled={returnsState.loading}
                      >
                        <Icon icon="mdi:refresh" width={18} height={18} />
                        Sync
                      </button>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Order</th>
                          <th>SKU</th>
                          <th>Variant</th>
                          <th className="text-center">Qty</th>
                          <th className="text-center">Status</th>
                          <th>Reason</th>
                          <th>Reported At</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>{returnsTable}</tbody>
                    </table>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="text-muted small">
                      Page {returnsState.pagination.page} of{" "}
                      {returnsState.pagination.totalPages}
                    </div>
                    <div className="btn-group">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={
                          returnsState.loading ||
                          returnsState.pagination.page <= 1
                        }
                        onClick={() =>
                          loadReturns({
                            page: returnsState.pagination.page - 1,
                          })
                        }
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={
                          returnsState.loading ||
                          returnsState.pagination.page >=
                            returnsState.pagination.totalPages
                        }
                        onClick={() =>
                          loadReturns({
                            page: returnsState.pagination.page + 1,
                          })
                        }
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <InventoryDetailModal
          item={inventoryDetail.item}
          ledger={inventoryDetail.ledger}
          isOpen={Boolean(inventoryDetail.item)}
          onClose={closeInventoryDetail}
          loading={inventoryDetail.loadingLedger}
        />

        <MoveToInventoryModal
          variant={moveModalState.variant}
          isOpen={moveModalState.isOpen}
          onClose={handleCloseMoveModal}
          onMove={handleConfirmMove}
          loading={moveModalState.loading}
        />
        <QrCodeModal
          qrCodeUrl={moveModalState.qrCodeUrl}
          isOpen={moveModalState.showQrCode}
          onClose={() => {
            if (moveModalState.qrCodeUrl) {
              URL.revokeObjectURL(moveModalState.qrCodeUrl);
            }
            setMoveModalState((prev) => ({
              ...prev,
              showQrCode: false,
              qrCodeUrl: null,
            }));
          }}
          productName={moveModalState.variant?.product_name || ""}
          variantName={
            moveModalState.variant?.variant_type
              ? Object.entries(moveModalState.variant.variant_type)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(", ")
              : ""
          }
        />
        <QrCodeModal
          qrCodeUrl={qrPreviewState.qrCodeUrl}
          isOpen={qrPreviewState.isOpen}
          onClose={() => {
            if (qrPreviewState.qrCodeUrl) {
              URL.revokeObjectURL(qrPreviewState.qrCodeUrl);
            }
            setQrPreviewState({
              isOpen: false,
              qrCodeUrl: null,
              productName: "",
              variantName: "",
              procurementVariantId: null,
              masterVariantId: null,
            });
          }}
          productName={qrPreviewState.productName}
          variantName={qrPreviewState.variantName}
        />
      </MasterLayout>
    </SidebarPermissionGuard>
  );
};

export default StockManagementPage;

# Rebuild Plan: Order Management & Stock Management

## Overview

- Receiving Management remains the source of truth for inbound stock, sorted quantities, and QR issuance.
- Order Management will be rebuilt to enforce QR-per-unit dispatch, driven by Shopify order data and linked inventory state.
- Stock Management will be rebuilt to track available, committed, cancelled, and returned quantities at the variant level, backed by an auditable ledger.
- Rebuild approach prevents legacy coupling and aligns the implementation with the planned workflow.

## Domain Flow Summary

1. **Receiving Fulfilment**

   - Purchase request moves through Purchase Request → To Be Delivered → Quality Check → Receipt Details.
   - Quality Check finalises sortable/usable quantity (`sorted_qty`) per variant and generates QR tokens.
   - Receipt Details with status `fulfilled` triggers inventory seeding for the relevant variants.

2. **Inventory Ownership**

   - Variants are tracked as `InventoryItem` entries storing product metadata, `available_qty`, `committed_qty`, cancellation/return counters, and QR associations.
   - `InventoryLedgerEntry` records every quantity change (receiving, commit, dispatch, return, cancellation) for audit.

3. **Shopify Order Lifecycle**

   - Shopify order creation raises an event that increments `committed_qty` and places the line items into the Order Dispatch Queue.
   - Cancellations and returns adjust commitments and optionally available stock after manual approval.

4. **QR-Based Dispatch**

   - Each product unit carries a unique QR token generated during Receiving.
   - Dispatch scans validate the token, decrement `available_qty` and `committed_qty`, and increment dispatched counts.
   - Orders cannot be fulfilled without the mandated number of scans (Order quantity = scan count).

5. **Returns Management**
   - Returns and cancellations surface in Stock Management for manual review.
   - Approved returns move quantity back into `available_qty`; cancelled orders release commitments.

## Core Building Blocks

### Data Contracts & Entities

- `InventoryItem`
  - `variant_id`, `sku`, product/variant names
  - `available_qty`, `committed_qty`, `cancelled_qty`, `approved_returns_qty`
  - `qr_tokens[]` (or relation)
- `InventoryLedgerEntry`
  - `inventory_item_id`, `change_type`, `delta`, `source_reference`, `performed_by`, timestamp
- `DispatchLog`
  - `order_id`, `variant_id`, `qr_token`, `scan_number`, operator, timestamp
- `ReturnCase`
  - `order_id`, `variant_id`, `quantity`, `reason`, `status`, reviewer metadata

### Services / Modules

- `inventoryService`
  - `seedFromReceiving(requestId)`
  - `incrementCommitted(orderId, variantId, qty)`
  - `dispatchScan(orderId, variantId, qrToken)`
  - `releaseCommitment(orderId, variantId, qty)`
  - `applyReturn(returnId, decision, qty)`
  - `getInventorySnapshot(filters)`
- `orderService`
  - `getDispatchQueue()`
  - `markLineItemDispatched(orderId, itemId)`
  - `syncShopifyOrders(limit)`
- `qrService`
  - `issueTokens(requestId, variantId, qty)`
  - `validate(token, orderId, variantId)`
  - `markConsumed(token)`

### Events & Integrations

- **Receiving → Inventory**: `ReceivingRequestFulfilled` triggers `seedFromReceiving`.
- **Shopify → Inventory/Orders**: `ShopifyOrderCreated`, `ShopifyOrderCancelled`, `ShopifyReturnReported` feed commitments and return cases.
- **Order Dispatch → Inventory**: `DispatchScanRecorded` updates quantities and logs.
- **Monitoring**: nightly reconciliation compares Shopify inventory with internal counts, generating alerts for discrepancies.

## Stock Management Rebuild

### Inventory Tab

- **Columns**: `Sr No`, `Product Name`, `Variant`, `SKU`, `Available Qty`, `Committed Qty`, `Cancelled Qty`, `Approved Returns`.
- **Data Source**: `inventoryService.getInventorySnapshot` aggregating live counts per variant.
- **Behaviours**:
  - Search/filter by product, variant, SKU.
  - Infinite scroll or pagination with consistent UX.
  - Row detail drawer showing ledger history and QR summary.
  - Visual alerts for low stock (`available_qty` threshold) or negative values.

### Returns Management Tab

- **Entries**: populated from `ReturnCase` records (Shopify returns, manual entries).
- **Actions**:
  - `Approve`: `inventoryService.applyReturn(id, 'approved', qty)` adds back to `available_qty` and logs.
  - `Reject`: logs decision without adjusting stock.
  - Optional notes inputs for audit trail.
- **UX**: filter by status (pending, approved, rejected), show linked order and variant details.

### Backend Notes

- Wrap adjustments in transactions to maintain `available_qty >= 0` and `committed_qty >= 0`.
- Ledger entries automatically generated inside service methods for traceability.
- Provide reconciliation endpoints to compare with Shopify stock levels.

## Order Management Rebuild

### Dispatch Queue Page

- **Columns**: `Order`, `Status`, `Product`, `SKU`, `Ordered`, `Dispatched`, `Remaining`, `Available`, `Committed`, `Actions`.
- **Source**: `orderService.getDispatchQueue()` merges Shopify order lines with inventory snapshot data.
- **Refresh**: manual refresh button + periodic auto-refresh; disable while loading.

### Dispatch Modal Workflow

1. Operator selects `Dispatch` → modal opens with product summary, remaining scans required, and QR scanner component.
2. Each scan sends `{ orderId, variantId, qrToken }` to `inventoryService.dispatchScan`.
3. Response updates modal counters:
   - Decrement `remaining`, increment `scanned_count`.
   - Display message: “Scan 4 more to fulfill 5 units”.
4. On mismatch or reused QR, display error (“QR belongs to different variant/order” or “Already consumed”).
5. When all scans complete:
   - Show success state, option to close.
   - Queue refresh removes or marks the line item as fulfilled.
   - Trigger downstream fulfillment (Shopify API) if required.

### Error Handling

- Network/API failure: show toast and keep modal open for retry.
- Attempt to scan beyond ordered quantity: block and explain.
- Missing QR tokens for order item: highlight as exception requiring admin intervention.

## Integration with Receiving Management

### QR Token Lifecycle

- Generated per variant at Quality Check, stored with `variant_id` and optional `purchase_request_item_id`.
- Exposed in Receipt Details for printing/labeling.
- Inventory seeding marks tokens as `available`.
- Dispatch scans mark tokens as `dispatched`; optional flow to mark as `returned` upon approved returns.

### Inventory Seeding Trigger

- Hook into Quality Check completion or Receipt Details finalisation to push sorted quantities into inventory.
- Ensure idempotency: repeated triggers should reconcile differences rather than duplicate entries.

### Data Consistency

- Use shared identifiers (`variant_id`, `purchase_request_item_id`) across Receiving, Stock, and Orders.
- If Shopify uses SKU as primary key, maintain mapping table to internal variant IDs.

## Implementation Roadmap

1. **Schema & Migration**

   - Create tables for inventory items, ledger entries, QR tokens, dispatch logs, return cases.
   - Migrate existing Receiving data to seed initial inventory.

2. **Service Layer**

   - Implement `inventoryService`, `orderService`, `qrService` with unit tests covering edge cases (overscan, negative inventory, duplicate commits).

3. **Event Handlers**

   - Integrate Receiving fulfilment trigger.
   - Wire Shopify webhooks for order create/cancel/return.
   - Emit `DispatchScanRecorded` events for downstream analytics.

4. **API Endpoints**

   - `GET /api/inventory`, `GET /api/inventory/history`
   - `GET /api/orders/dispatch-queue`
   - `POST /api/orders/{orderId}/dispatch-scan`
   - `POST /api/returns/{id}/approve`, `POST /api/returns/{id}/reject`

5. **Frontend Rebuild**

   - Replace existing pages in `app/order-management/page.jsx` and `app/stock-management/page.jsx`.
   - Use shared table components and infinite-scroll patterns from Receiving where applicable.
   - Integrate React Query/SWR caches for consistent state.

6. **Testing & QA**

   - Unit tests for services.
   - Integration tests simulating full flow: Receiving → Inventory → Order commit → Dispatch scans → Return approval.
   - Manual QA for QR scanning with mock tokens.

7. **Monitoring & Alerts**
   - Add logging for all service actions.
   - Implement discrepancy alerts when Shopify stock and internal stock diverge beyond tolerance.
   - Surface dashboard KPIs (total available, committed, pending returns).

## Operational Considerations

- **Concurrency**: ensure dispatch scans are atomic; use database locks or compare-and-swap logic to avoid double decrement.
- **Security**: restrict QR endpoints; validate tokens server-side; audit operator IDs.
- **Usability**: allow manual override with audit trail for exceptional cases (e.g., damaged QR).
- **Documentation**: maintain SOP for warehouse staff describing scan requirements and exception handling.

## Deliverables

- Updated backend services and schemas.
- Rebuilt Order Management and Stock Management pages aligning with the defined workflow.
- Documentation for warehouse processes and admin controls.
- Automated tests and monitoring hooks ensuring data integrity.

With this plan, Order Management and Stock Management will be tightly aligned with Receiving data, enforce mandatory QR scanning for dispatch, and provide transparent inventory tracking across the entire lifecycle of a product variant.

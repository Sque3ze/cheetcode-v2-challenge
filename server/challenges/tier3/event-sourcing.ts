/**
 * Tier 3 Challenge: Event Sourcing Replay
 *
 * An order management system showing a stale snapshot (as of event #12).
 * 8 more events have occurred since. Agent must load the event log via
 * interact, apply events sequentially to the snapshot, and answer a
 * question about the current state. Events include cancellations
 * (discount_removed, item_removed) that test careful bookkeeping.
 *
 * Tests: stateful event processing, sequential application, cancellation handling.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface Discount {
  id: string;
  label: string;
  amount: number;
}

interface Snapshot {
  orderId: string;
  items: OrderItem[];
  discounts: Discount[];
  status: string;
  shippingAddress: string;
  snapshotEventId: number;
  totalEvents: number;
}

interface EventEntry {
  eventId: number;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

interface EventSourcingPageData {
  snapshot: Snapshot;
  question: string;
  variantIndex: number;
}

const ITEM_NAMES = [
  "Wireless Keyboard", "USB-C Hub", "Monitor Stand", "Desk Lamp",
  "Mechanical Pencil Set", "Noise Canceling Headphones", "Ergonomic Mouse",
  "Laptop Sleeve", "Cable Organizer", "Webcam HD",
] as const;

const DISCOUNT_LABELS = [
  "Summer Sale", "New Customer", "Loyalty Reward", "Flash Deal",
  "Bundle Discount", "Clearance", "Holiday Special",
] as const;

const STATUSES = ["processing", "confirmed", "shipped", "delivered"] as const;

const ADDRESSES = [
  "123 Oak Street, Portland, OR 97201",
  "456 Maple Avenue, Austin, TX 78701",
  "789 Pine Road, Seattle, WA 98101",
  "321 Elm Boulevard, Denver, CO 80201",
  "654 Cedar Lane, Chicago, IL 60601",
] as const;

function makeTimestamp(data: ChallengeData, eventId: number): string {
  const hour = 10 + Math.floor(eventId / 4);
  const minute = (eventId * 7) % 60;
  const second = data.int(0, 59);
  return `2025-03-15T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}Z`;
}

export const eventSourcingChallenge: ChallengeDefinition<EventSourcingPageData> = {
  id: "tier3-event-sourcing",
  title: "Event Sourcing Replay",
  tier: 3,
  dependsOn: ["tier2-sequential-calculator"],
  description: "Apply a sequence of events to a stale order snapshot — watch out for cancellations.",

  instructions: (pageData) => {
    const remaining = pageData.snapshot.totalEvents - pageData.snapshot.snapshotEventId;
    const interactHint = `To load events, use the interact API with action "events" and an optional page parameter (e.g. { "page": 1 }). Events are paginated, 4 per page.`;
    const variants = [
      `The order snapshot below is stale — it reflects state as of event #${pageData.snapshot.snapshotEventId}, but ${remaining} more events have occurred. Load the event log, apply each event in order to the snapshot, and answer: ${pageData.question} ${interactHint}`,
      `This order has ${pageData.snapshot.totalEvents} total events but the snapshot only covers the first ${pageData.snapshot.snapshotEventId}. Fetch the remaining events and replay them to reconstruct the current state. Be careful — some events cancel previous ones. Question: ${pageData.question} ${interactHint}`,
      `The displayed snapshot is outdated by ${remaining} events. Load the events via the panel below and apply them sequentially. Events like "discount_removed" cancel earlier "discount_applied" events, and "item_removed" removes items entirely. Once you have the current state, answer: ${pageData.question} ${interactHint}`,
      `Replay ${remaining} events on top of the stale snapshot to get the current order state. Events must be applied in order — later events may override or cancel earlier ones. Answer: ${pageData.question} ${interactHint}`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);

    // Build initial snapshot (as of event #12)
    const orderId = `ORD-${data.int(10000, 99999)}`;
    const initialItemCount = data.int(4, 6);
    const selectedItems = data.pickN(ITEM_NAMES, initialItemCount);

    const snapshotItems: OrderItem[] = selectedItems.map((name, i) => ({
      itemId: `item-${i + 1}`,
      name,
      quantity: data.int(1, 5),
      unitPrice: data.int(10, 150) + data.int(0, 99) / 100,
    }));

    // Initial discounts (1-2)
    const initialDiscountCount = data.int(1, 2);
    const selectedDiscountLabels = data.pickN(DISCOUNT_LABELS, initialDiscountCount + 2); // extra for events
    const snapshotDiscounts: Discount[] = [];
    for (let i = 0; i < initialDiscountCount; i++) {
      snapshotDiscounts.push({
        id: `disc-${i + 1}`,
        label: selectedDiscountLabels[i],
        amount: data.int(5, 30) + data.int(0, 99) / 100,
      });
    }

    const snapshotStatus: string = data.pick(["processing", "confirmed"] as const);
    const snapshotAddress = data.pick(ADDRESSES);

    const snapshot: Snapshot = {
      orderId,
      items: snapshotItems.map((item) => ({ ...item })),
      discounts: snapshotDiscounts.map((d) => ({ ...d })),
      status: snapshotStatus,
      shippingAddress: snapshotAddress,
      snapshotEventId: 12,
      totalEvents: 20,
    };

    // Now generate 8 events (13-20)
    // We need to carefully craft events that include:
    // 1. A discount_applied followed by discount_removed (cancellation)
    // 2. An item_added then possibly removed
    // 3. A quantity_changed
    // 4. status_changed
    // 5. address_updated

    // Work on a mutable copy of the state
    const currentItems: OrderItem[] = snapshotItems.map((item) => ({ ...item }));
    const currentDiscounts: Discount[] = snapshotDiscounts.map((d) => ({ ...d }));
    let currentStatus: string = snapshotStatus;
    let currentAddress = snapshotAddress;

    const events: EventEntry[] = [];
    let nextItemId = initialItemCount + 1;
    let nextDiscountId = initialDiscountCount + 1;

    // Event 13: item_added
    const newItemName1 = data.pick(
      ITEM_NAMES.filter((n) => !selectedItems.includes(n))
    );
    const newItem1: OrderItem = {
      itemId: `item-${nextItemId++}`,
      name: newItemName1,
      quantity: data.int(1, 3),
      unitPrice: data.int(15, 120) + data.int(0, 99) / 100,
    };
    currentItems.push({ ...newItem1 });
    events.push({
      eventId: 13,
      type: "item_added",
      timestamp: makeTimestamp(data, 13),
      payload: { itemId: newItem1.itemId, name: newItem1.name, quantity: newItem1.quantity, unitPrice: newItem1.unitPrice },
    });

    // Event 14: discount_applied (will be removed later)
    const tempDiscount: Discount = {
      id: `disc-${nextDiscountId++}`,
      label: selectedDiscountLabels[initialDiscountCount],
      amount: data.int(10, 25) + data.int(0, 99) / 100,
    };
    currentDiscounts.push({ ...tempDiscount });
    events.push({
      eventId: 14,
      type: "discount_applied",
      timestamp: makeTimestamp(data, 14),
      payload: { discountId: tempDiscount.id, label: tempDiscount.label, amount: tempDiscount.amount },
    });

    // Event 15: quantity_changed (change an existing item)
    const qtyChangeIdx = data.int(0, Math.min(currentItems.length - 1, initialItemCount - 1));
    const qtyChangeItem = currentItems[qtyChangeIdx];
    const newQuantity = data.int(1, 8);
    qtyChangeItem.quantity = newQuantity;
    events.push({
      eventId: 15,
      type: "quantity_changed",
      timestamp: makeTimestamp(data, 15),
      payload: { itemId: qtyChangeItem.itemId, newQuantity },
    });

    // Event 16: status_changed
    const newStatus1 = data.pick(STATUSES.filter((s) => s !== currentStatus));
    currentStatus = newStatus1;
    events.push({
      eventId: 16,
      type: "status_changed",
      timestamp: makeTimestamp(data, 16),
      payload: { newStatus: newStatus1 },
    });

    // Event 17: discount_removed (cancels event 14)
    const removedDiscountIdx = currentDiscounts.findIndex((d) => d.id === tempDiscount.id);
    if (removedDiscountIdx >= 0) currentDiscounts.splice(removedDiscountIdx, 1);
    events.push({
      eventId: 17,
      type: "discount_removed",
      timestamp: makeTimestamp(data, 17),
      payload: { discountId: tempDiscount.id },
    });

    // Event 18: address_updated
    const newAddress = data.pick(ADDRESSES.filter((a) => a !== currentAddress));
    currentAddress = newAddress;
    events.push({
      eventId: 18,
      type: "address_updated",
      timestamp: makeTimestamp(data, 18),
      payload: { newAddress },
    });

    // Event 19: item_removed (remove the item added in event 13)
    const removeIdx = currentItems.findIndex((item) => item.itemId === newItem1.itemId);
    if (removeIdx >= 0) currentItems.splice(removeIdx, 1);
    events.push({
      eventId: 19,
      type: "item_removed",
      timestamp: makeTimestamp(data, 19),
      payload: { itemId: newItem1.itemId },
    });

    // Event 20: another discount_applied (this one stays)
    const finalDiscount: Discount = {
      id: `disc-${nextDiscountId++}`,
      label: selectedDiscountLabels[initialDiscountCount + 1],
      amount: data.int(5, 20) + data.int(0, 99) / 100,
    };
    currentDiscounts.push({ ...finalDiscount });
    events.push({
      eventId: 20,
      type: "discount_applied",
      timestamp: makeTimestamp(data, 20),
      payload: { discountId: finalDiscount.id, label: finalDiscount.label, amount: finalDiscount.amount },
    });

    // Compute current state
    const subtotal = currentItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const totalDiscounts = currentDiscounts.reduce((sum, d) => sum + d.amount, 0);
    const total = subtotal - totalDiscounts;

    const currentState = {
      items: currentItems,
      discounts: currentDiscounts,
      status: currentStatus,
      address: currentAddress,
      subtotal: Math.round(subtotal * 100) / 100,
      total: Math.round(total * 100) / 100,
    };

    // Generate question based on variant
    let question: string;
    let answer: string;

    if (variantIndex === 0) {
      question = "What is the current order total (subtotal minus all active discounts)?";
      answer = currentState.total.toFixed(2);
    } else if (variantIndex === 1) {
      question = "How many distinct items are currently in the order?";
      answer = String(currentItems.length);
    } else if (variantIndex === 2) {
      question = "What is the current order status and how many distinct items are in the order? Format: status:count (e.g. shipped:3)";
      answer = `${currentStatus}:${currentItems.length}`;
    } else {
      question = "What is the current subtotal (sum of quantity × unitPrice for all items, before discounts)?";
      answer = currentState.subtotal.toFixed(2);
    }

    return {
      pageData: {
        snapshot,
        question,
        variantIndex,
      },
      hiddenData: {
        events,
        currentState,
      },
      answer,
    };
  },

  interactActions: ["events"],

  handleInteract(hiddenData, action, params) {
    if (action === "events") {
      const page = Number(params.page ?? 1);
      const events = hiddenData.events as EventEntry[];
      const pageSize = 4;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const pageEvents = events.slice(start, end);
      return {
        page,
        totalPages: Math.ceil(events.length / pageSize),
        events: pageEvents,
      };
    }
    return null;
  },

  validateAnswer(submitted: string, correct: string): boolean {
    const trimmed = submitted.trim().toLowerCase();
    const expected = correct.trim().toLowerCase();

    // Exact string match (handles compound "status:count" and plain status)
    if (trimmed === expected) return true;

    // Try numeric match with tolerance (for totals/subtotals)
    const s = parseFloat(trimmed);
    const c = parseFloat(expected);
    if (!isNaN(s) && !isNaN(c)) {
      return Math.abs(s - c) < 0.011;
    }

    return false;
  },
};

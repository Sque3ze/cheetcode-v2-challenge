/**
 * E2E Challenge Solver — Playwright-based agent that proves each challenge
 * is solvable through browser interaction.
 *
 * Run: npx playwright test
 */

import { test, expect, type Page } from "@playwright/test";

type SolverFn = (page: Page) => Promise<string>;

// ─── Solver registry ────────────────────────────────────────────

const SOLVERS: Record<string, SolverFn> = {
  "tier1-table-sort": solveTableSort,
  "tier1-form-fill": solveFormFill,
  "tier1-dropdown-select": solveDropdownSelect,
  "tier1-tab-navigation": solveTabNavigation,
  "tier1-filter-search": solveFilterSearch,
  "tier1-modal-interaction": solveModalInteraction,
  "tier2-multi-step-wizard": solveMultiStepWizard,
  "tier2-linked-data-lookup": solveLinkedDataLookup,
  "tier2-sequential-calculator": solveSequentialCalculator,
  "tier3-data-dashboard": solveDataDashboard,
  "tier3-constraint-solver": solveConstraintSolver,
  "tier4-calculation-audit": solveCalculationAudit,
  "tier4-red-herring": solveRedHerring,
};

/** Read the instructions text from the challenge page */
async function getInstructions(page: Page): Promise<string> {
  await page.waitForSelector("p.text-gray-200");
  const text = await page.locator("p.text-gray-200").textContent();
  if (!text) throw new Error("Could not read instructions");
  return text;
}

// ─── Tier 1 Solvers ─────────────────────────────────────────────

async function solveTableSort(page: Page): Promise<string> {
  await page.waitForSelector("table tbody tr");
  const instructions = await getInstructions(page);

  // Broad match across variants — look for column name, position number, and direction
  const colMatch = instructions.match(/by (Salary|Start Date)/i);
  const posMatch = instructions.match(/(\d+)\w*\s+(highest|lowest)/i)
    || instructions.match(/position (\d+)/i);
  const dirMatch = instructions.match(/(highest|lowest)/i);

  if (!colMatch || !posMatch || !dirMatch) throw new Error(`Could not parse instructions: ${instructions}`);

  const sortColumn = colMatch[1].trim();
  const targetPosition = parseInt(posMatch[1]);
  const direction = dirMatch[1].toLowerCase();

  // Click column header to sort
  const header = page.locator("th", { hasText: sortColumn });
  await header.click();
  if (direction === "highest") {
    await header.click();
  }

  // Navigate to correct page (5 rows per page)
  const rowsPerPage = 5;
  const targetPage = Math.floor((targetPosition - 1) / rowsPerPage);
  for (let i = 0; i < targetPage; i++) {
    await page.locator("[data-page-next]").click();
  }

  const rowInPage = (targetPosition - 1) % rowsPerPage;
  const targetRow = page.locator("tbody tr").nth(rowInPage);
  const name = await targetRow.locator("td").first().textContent();
  if (!name) throw new Error("Could not read name from target row");

  return name.trim();
}

async function solveFormFill(page: Page): Promise<string> {
  await page.waitForSelector("[data-field]");
  const instructions = await getInstructions(page);

  // Match field names across instruction variants:
  // V0: "...separated by a comma: email, city. Note:..."
  // V1: "...What are their department, startDate? Provide..."
  // V2: "...submit (comma-delimited): email, city. Some..."
  // V3: "...joined by commas: email, city. Check..."
  const match = instructions.match(/:\s*([a-zA-Z ,]+?)\.?\s*(?:Note|You|Some|Check)/i)
    || instructions.match(/\btheir\s+(.+?)\?/i);

  let fieldNames: string[];
  if (match) {
    fieldNames = match[1].split(",").map((f) => f.trim().toLowerCase());
  } else {
    // Fallback: look for known field names near commas
    const allFields = ["name", "email", "department", "role", "salary", "city", "start date", "startdate"];
    fieldNames = allFields.filter((f) => instructions.toLowerCase().includes(f));
    // Only keep the ones that are in a comma-separated context
    if (fieldNames.length === 0) throw new Error(`Could not parse fields from: ${instructions}`);
  }

  const labelToKey: Record<string, string> = {
    name: "name", email: "email", department: "department",
    role: "role", salary: "salary", city: "city", "start date": "startDate",
    startdate: "startDate",
  };

  // Click "Details" toggle to reveal hidden fields
  const detailsToggle = page.locator("[data-toggle-details]");
  if (await detailsToggle.isVisible()) {
    await detailsToggle.click();
    await page.waitForSelector("[data-details-panel]");
  }

  const values: string[] = [];
  for (const field of fieldNames) {
    const key = labelToKey[field] || field;
    const dd = page.locator(`[data-field="${key}"]`);
    const value = await dd.textContent();
    if (!value) throw new Error(`Could not read field: ${key}`);
    values.push(value.trim());
  }

  return values.join(", ");
}

async function solveDropdownSelect(page: Page): Promise<string> {
  await page.waitForSelector("[data-product-card]");
  const instructions = await getInstructions(page);

  // Read all products from cards
  const cards = page.locator("[data-product-card]");
  const count = await cards.count();

  interface ProductRow { name: string; price: number; rating: number; stock: number }
  const products: ProductRow[] = [];
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const name = (await card.getAttribute("data-product-card")) ?? "";
    const priceStr = (await card.locator("[data-card-price]").textContent())?.trim() ?? "0";
    const ratingStr = (await card.locator("[data-card-rating]").textContent())?.trim() ?? "0";
    const stockStr = (await card.locator("[data-card-stock]").textContent())?.trim() ?? "0";
    products.push({
      name,
      price: parseFloat(priceStr.replace("$", "")),
      rating: parseFloat(ratingStr),
      stock: parseInt(stockStr),
    });
  }

  // Evaluate condition — key phrases are consistent across variants
  let targetName: string;
  if (instructions.includes("price-to-rating ratio")) {
    targetName = products.reduce((a, b) => (a.price / a.rating < b.price / b.rating ? a : b)).name;
  } else if (instructions.includes("most expensive in-stock")) {
    const inStock = products.filter((p) => p.stock > 0);
    targetName = inStock.reduce((a, b) => (a.price > b.price ? a : b)).name;
  } else if (instructions.includes("highest total value")) {
    targetName = products.reduce((a, b) => (a.price * a.stock > b.price * b.stock ? a : b)).name;
  } else if (instructions.includes("best rated") && instructions.includes("under $200")) {
    const under200 = products.filter((p) => p.price < 200);
    targetName = under200.reduce((a, b) => (a.rating > b.rating ? a : b)).name;
  } else {
    throw new Error(`Unknown condition in: ${instructions}`);
  }

  await page.selectOption("select", targetName);
  return targetName;
}

async function solveTabNavigation(page: Page): Promise<string> {
  await page.waitForSelector("[data-tab]");
  const instructions = await getInstructions(page);

  // Get actual tab labels from the page to distinguish tabs from keys
  const tabElements = await page.locator("[data-tab]").all();
  const tabLabels = new Set<string>();
  for (const el of tabElements) {
    const label = await el.getAttribute("data-tab");
    if (label) tabLabels.add(label);
  }

  // Extract all quoted strings and threshold number
  const quoted = [...instructions.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const threshMatch = instructions.match(/(?:above|exceeds|greater than|against)\s+(\d+)/i);
  if (quoted.length < 6 || !threshMatch) throw new Error(`Could not parse instructions: ${instructions}`);

  const threshold = parseInt(threshMatch[1]);

  // First two quoted strings are the condition pair (key/tab in either order depending on variant)
  let condKey: string, condTab: string;
  if (tabLabels.has(quoted[0])) {
    condTab = quoted[0];
    condKey = quoted[1];
  } else {
    condKey = quoted[0];
    condTab = quoted[1];
  }

  // Remaining pairs are always key, tab
  const [aboveKey, aboveTab, belowKey, belowTab] = quoted.slice(2);

  // Navigate to the condition tab and read the value
  await page.locator(`[data-tab="${condTab}"]`).click();
  const condValueEl = page.locator(`[data-value="${condKey}"]`);
  await condValueEl.waitFor({ state: "visible" });
  const condValueText = await condValueEl.textContent();
  if (!condValueText) throw new Error(`Could not read value for: ${condKey}`);

  const numericValue = parseNumericFromText(condValueText.trim());

  let resultTab: string;
  let resultKey: string;
  if (numericValue > threshold) {
    resultTab = aboveTab;
    resultKey = aboveKey;
  } else {
    resultTab = belowTab;
    resultKey = belowKey;
  }

  await page.locator(`[data-tab="${resultTab}"]`).click();
  const resultEl = page.locator(`[data-value="${resultKey}"]`);
  await resultEl.waitFor({ state: "visible" });
  const value = await resultEl.textContent();
  if (!value) throw new Error(`Could not read value for: ${resultKey}`);

  return value.trim();
}

function parseNumericFromText(text: string): number {
  const percentMatch = text.match(/^([\d.]+)%$/);
  if (percentMatch) return parseFloat(percentMatch[1]);
  const dollarMatch = text.match(/^\$([\d.]+)M?$/);
  if (dollarMatch) return parseFloat(dollarMatch[1]);
  const numMatch = text.match(/^([\d.]+)$/);
  if (numMatch) return parseFloat(numMatch[1]);
  return 0;
}

async function solveFilterSearch(page: Page): Promise<string> {
  await page.waitForSelector("table tbody tr");
  const instructions = await getInstructions(page);

  // Parse conditions: all variants contain field = "value" patterns
  const conditions: Array<{ field: string; value: string }> = [];
  const condMatches = [...instructions.matchAll(/(\w+)\s*=\s*"(.+?)"/g)];
  for (const m of condMatches) {
    conditions.push({ field: m[1], value: m[2] });
  }

  // Determine aggregation from instruction keywords
  let aggregation: "count" | "total salary" | "average salary";
  if (instructions.match(/\b(?:count|how many|total count)\b/i)) {
    aggregation = "count";
  } else if (instructions.match(/\b(?:average|mean)\b/i)) {
    aggregation = "average salary";
  } else {
    aggregation = "total salary";
  }

  // Read ALL employees from ALL pages
  interface EmployeeRow { name: string; department: string; salary: number; city: string }
  const employees: EmployeeRow[] = [];

  const readCurrentPage = async () => {
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      const cells = rows.nth(i).locator("td");
      employees.push({
        name: (await cells.nth(0).textContent())?.trim() ?? "",
        department: (await cells.nth(1).textContent())?.trim() ?? "",
        salary: parseInt(((await cells.nth(2).textContent())?.trim() ?? "0").replace(/[$,]/g, "")),
        city: (await cells.nth(3).textContent())?.trim() ?? "",
      });
    }
  };

  await readCurrentPage();

  while (true) {
    const nextBtn = page.locator("[data-page-next]");
    if (await nextBtn.isDisabled()) break;
    await nextBtn.click();
    await page.waitForTimeout(100);
    await readCurrentPage();
  }

  const matching = employees.filter((e) => {
    return conditions.every((c) => {
      if (c.field === "department") return e.department === c.value;
      if (c.field === "city") return e.city === c.value;
      return false;
    });
  });

  if (aggregation === "count") {
    return String(matching.length);
  } else if (aggregation === "average salary") {
    return String(Math.round(matching.reduce((s, e) => s + e.salary, 0) / matching.length));
  } else {
    return String(matching.reduce((s, e) => s + e.salary, 0));
  }
}

async function solveModalInteraction(page: Page): Promise<string> {
  await page.waitForSelector("[data-card-name]");
  const instructions = await getInstructions(page);

  // All variants contain quoted category name and "lowest/highest price"
  const catMatch = instructions.match(/"([^"]+)"\s*(?:category|products|section)/i)
    || instructions.match(/(?:category|categorized as)\s*"([^"]+)"/i);
  const condMatch = instructions.match(/(lowest price|highest price)/i);
  const fieldMatch = instructions.match(/(?:submit|provide|report)\s+(?:the\s+)?(\w+)/i);
  if (!catMatch || !condMatch || !fieldMatch) throw new Error(`Could not parse instructions: ${instructions}`);

  const targetCategory = catMatch[1];
  const condition = condMatch[1].toLowerCase();
  const targetField = fieldMatch[1];

  const allCards = page.locator("[data-card-category]");
  const cardCount = await allCards.count();

  interface CardInfo { name: string; price: number }
  const categoryCards: CardInfo[] = [];

  for (let i = 0; i < cardCount; i++) {
    const card = allCards.nth(i);
    const category = (await card.getAttribute("data-card-category")) ?? "";
    if (category === targetCategory) {
      const nameBtn = card.locator("[data-card-name]");
      const name = (await nameBtn.getAttribute("data-card-name")) ?? "";
      const priceStr = (await card.locator("[data-card-price]").textContent())?.trim() ?? "0";
      categoryCards.push({ name, price: parseFloat(priceStr.replace("$", "")) });
    }
  }

  const target = condition === "lowest price"
    ? categoryCards.reduce((min, c) => (c.price < min.price ? c : min), categoryCards[0])
    : categoryCards.reduce((max, c) => (c.price > max.price ? c : max), categoryCards[0]);

  await page.locator(`[data-card-name="${target.name}"]`).first().click();
  await page.waitForSelector("[data-modal]");
  const fieldEl = page.locator(`[data-field="${targetField}"]`);
  const value = await fieldEl.textContent();
  if (!value) throw new Error(`Could not read field: ${targetField}`);

  return value.trim();
}

// ─── Tier 2 Solvers ─────────────────────────────────────────────

async function solveMultiStepWizard(page: Page): Promise<string> {
  await page.waitForSelector("[data-order-id]");
  const instructions = await getInstructions(page);

  // All variants contain "highest/lowest subtotal", status in quotes, discount condition, shipping in quotes
  const orderCondMatch = instructions.match(/(highest subtotal|lowest subtotal)/i);
  const statusMatch = instructions.match(/"(Pending|Processing)"/);
  const discountCondMatch = instructions.match(/(highest discount percentage|lowest discount percentage)/i);
  const shippingMatch = instructions.match(/"(Standard|Express|Overnight)"\s*(?:shipping|for shipping)/i);
  if (!orderCondMatch || !statusMatch || !discountCondMatch || !shippingMatch) {
    throw new Error(`Could not parse instructions: ${instructions}`);
  }

  const orderCondition = orderCondMatch[1].toLowerCase();
  const targetStatus = statusMatch[1];
  const discountCondition = discountCondMatch[1].toLowerCase();
  const targetShipping = shippingMatch[1];

  // Step 1: Read all orders, find matching by status and condition
  const orderRows = page.locator("[data-order-id]");
  const orderCount = await orderRows.count();

  interface OrderInfo { id: string; qty: number; unitPrice: number; status: string; subtotal: number }
  const statusOrders: OrderInfo[] = [];

  for (let i = 0; i < orderCount; i++) {
    const row = orderRows.nth(i);
    const id = (await row.getAttribute("data-order-id")) ?? "";
    const status = (await row.locator("[data-status]").textContent())?.trim() ?? "";
    if (status !== targetStatus) continue;
    const qty = parseInt((await row.locator("[data-quantity]").textContent())?.trim() ?? "0");
    const unitPriceStr = (await row.locator("[data-unit-price]").textContent())?.trim() ?? "0";
    const unitPrice = parseFloat(unitPriceStr.replace("$", ""));
    statusOrders.push({ id, qty, unitPrice, status, subtotal: qty * unitPrice });
  }

  statusOrders.sort((a, b) =>
    orderCondition === "highest subtotal" ? b.subtotal - a.subtotal : a.subtotal - b.subtotal
  );
  const targetOrder = statusOrders[0];
  await page.locator(`[data-select-order="${targetOrder.id}"]`).click();

  // Step 2: Read discount codes
  await page.waitForSelector("[data-discount-code]");
  const discountButtons = page.locator("[data-discount-code]");
  const discountCount = await discountButtons.count();

  interface DiscountInfo { code: string; percent: number }
  const discounts: DiscountInfo[] = [];
  for (let i = 0; i < discountCount; i++) {
    const btn = discountButtons.nth(i);
    const code = (await btn.getAttribute("data-discount-code")) ?? "";
    const percentStr = (await btn.locator("[data-discount-percent]").getAttribute("data-discount-percent")) ?? "0";
    discounts.push({ code, percent: parseInt(percentStr) });
  }

  discounts.sort((a, b) =>
    discountCondition === "highest discount percentage" ? b.percent - a.percent : a.percent - b.percent
  );
  await page.locator(`[data-discount-code="${discounts[0].code}"]`).click();

  // Step 3: Select shipping
  await page.waitForSelector("[data-shipping]");
  const shippingBtn = page.locator(`[data-shipping="${targetShipping}"]`);
  const shippingCostStr = (await shippingBtn.locator("[data-shipping-cost]").getAttribute("data-shipping-cost")) ?? "0";
  const shippingCost = parseFloat(shippingCostStr);
  await shippingBtn.click();

  // Step 4: Compute answer
  await page.waitForSelector("[data-field='subtotal']");
  const subtotalText = await page.locator("[data-field='subtotal']").textContent();
  if (!subtotalText) throw new Error("Could not read subtotal");

  const subtotalMatch = subtotalText.match(/= \$(.+)$/);
  if (!subtotalMatch) throw new Error(`Could not parse subtotal: ${subtotalText}`);
  const subtotal = parseFloat(subtotalMatch[1]);

  const discountSummary = await page.locator("[data-field='discount']").textContent();
  if (!discountSummary) throw new Error("Could not read discount summary");
  const percentMatch = discountSummary.match(/\((\d+)%\)/);
  if (!percentMatch) throw new Error(`Could not parse discount percent: ${discountSummary}`);

  const discountPercent = parseInt(percentMatch[1]);
  const discountedTotal = subtotal * (1 - discountPercent / 100);
  const finalTotal = discountedTotal + shippingCost;

  return finalTotal.toFixed(2);
}

async function solveLinkedDataLookup(page: Page): Promise<string> {
  await page.waitForSelector("[data-table='employees']");
  await page.waitForSelector("[data-table='departments']");
  const instructions = await getInstructions(page);

  // All variants contain the employee name in quotes
  const empMatch = instructions.match(/"([^"]+)"/);
  if (!empMatch) throw new Error(`Could not parse employee: ${instructions}`);
  const targetName = empMatch[1];

  // Get employee's department ID
  const empRow = page.locator(`[data-employee-name="${targetName}"]`);
  const deptId = (await empRow.locator("[data-dept-id]").textContent())?.trim();
  if (!deptId) throw new Error(`Could not read dept ID for ${targetName}`);

  if (instructions.match(/expand|department's/i)) {
    // Department field task
    const expandBtn = page.locator(`[data-expand-dept="${deptId}"]`);
    await expandBtn.click();
    await page.waitForSelector(`[data-dept-details="${deptId}"]`);

    // Extract target field — look for known field names
    let targetField: string;
    if (instructions.includes("manager")) targetField = "manager";
    else if (instructions.includes("location")) targetField = "location";
    else if (instructions.includes("budget")) targetField = "budget";
    else if (instructions.includes("headcount")) targetField = "headcount";
    else throw new Error(`Could not determine target field: ${instructions}`);

    const fieldCell = page.locator(`[data-dept-details="${deptId}"] [data-field="${targetField}"]`);
    const value = await fieldCell.textContent();
    if (!value) throw new Error(`Could not read ${targetField}`);

    let answer = value.trim();
    if (targetField === "budget") answer = answer.replace(/[$,]/g, "");
    return answer;
  } else {
    // Project aggregate task
    await page.waitForSelector("[data-table='projects']");

    const projectRows = page.locator("[data-table='projects'] tbody tr");
    const projectCount = await projectRows.count();

    interface ProjectInfo { deptId: string; budget: number }
    const deptProjects: ProjectInfo[] = [];

    for (let i = 0; i < projectCount; i++) {
      const row = projectRows.nth(i);
      const projDeptId = (await row.locator("[data-project-dept-id]").textContent())?.trim();
      if (projDeptId === deptId) {
        const budgetStr = (await row.locator("[data-project-budget]").textContent())?.trim() ?? "0";
        deptProjects.push({ deptId: projDeptId, budget: parseInt(budgetStr.replace(/[$,]/g, "")) });
      }
    }

    if (instructions.match(/total project budget|budget/i)) {
      return String(deptProjects.reduce((s, p) => s + p.budget, 0));
    } else {
      return String(deptProjects.length);
    }
  }
}

async function solveSequentialCalculator(page: Page): Promise<string> {
  await page.waitForSelector("[data-start-value]");

  const startText = await page.locator("[data-start-value]").textContent();
  if (!startText) throw new Error("Could not read start value");
  let current = parseFloat(startText.trim());

  const steps = page.locator("[data-step]");
  const stepCount = await steps.count();

  for (let i = 0; i < stepCount; i++) {
    const step = steps.nth(i);
    const stepType = await step.getAttribute("data-step-type");

    if (stepType === "conditional") {
      const revealBtn = step.locator(`[data-reveal="${i}"]`);
      if (await revealBtn.isVisible()) {
        await revealBtn.click();
      }

      const thresholdText = await step.locator(`[data-threshold="${i}"]`).textContent();
      if (!thresholdText) throw new Error(`Could not read threshold for step ${i}`);
      const threshold = parseFloat(thresholdText.trim());

      if (current > threshold) {
        const operandAboveText = await step.locator(`[data-operand-above="${i}"]`).textContent();
        if (!operandAboveText) throw new Error(`Could not read above operand for step ${i}`);
        const operand = parseFloat(operandAboveText.trim());
        const opLines = step.locator("p.text-gray-400");
        const firstOpLine = await opLines.first().textContent();
        if (firstOpLine?.includes("+")) current += operand;
        else current -= operand;
      } else {
        const operandBelowText = await step.locator(`[data-operand-below="${i}"]`).textContent();
        if (!operandBelowText) throw new Error(`Could not read below operand for step ${i}`);
        const operand = parseFloat(operandBelowText.trim());
        const opLines = step.locator("p.text-gray-400");
        const lastOpLine = await opLines.last().textContent();
        if (lastOpLine?.includes("+")) current += operand;
        else current -= operand;
      }
    } else if (stepType === "lookup") {
      const lookupKeyEl = step.locator(`[data-lookup-key="${i}"]`);
      const lookupText = await lookupKeyEl.textContent();
      if (!lookupText) throw new Error(`Could not read lookup key for step ${i}`);

      const keyMatch = lookupText.match(/value of "(.+?)" from/);
      if (!keyMatch) throw new Error(`Could not parse lookup key: ${lookupText}`);
      const lookupKey = keyMatch[1];

      const refRow = page.locator(`[data-ref-key="${lookupKey}"]`);
      const refValueText = await refRow.locator("[data-ref-value]").textContent();
      if (!refValueText) throw new Error(`Could not read ref value for ${lookupKey}`);
      const refValue = parseFloat(refValueText.trim());

      const opSymbol = await step.locator(".text-blue-400").textContent();
      if (!opSymbol) throw new Error(`Could not read operator for step ${i}`);
      switch (opSymbol.trim()) {
        case "+": current += refValue; break;
        case "\u2212": current -= refValue; break;
        case "\u00d7": current *= refValue; break;
      }
    } else {
      const revealBtn = step.locator(`[data-reveal="${i}"]`);
      if (await revealBtn.isVisible()) {
        await revealBtn.click();
      }

      const operandEl = step.locator(`[data-operand="${i}"]`);
      await operandEl.waitFor({ state: "visible" });
      const operandText = await operandEl.textContent();
      if (!operandText) throw new Error(`Could not read operand for step ${i}`);
      const operand = parseFloat(operandText.trim());

      const opSymbol = await step.locator(".text-blue-400").textContent();
      if (!opSymbol) throw new Error(`Could not read operator for step ${i}`);

      switch (opSymbol.trim()) {
        case "+": current += operand; break;
        case "\u2212": current -= operand; break;
        case "\u00d7": current *= operand; break;
        case "\u00f7": current /= operand; break;
      }
    }
  }

  return (Math.round(current * 100) / 100).toFixed(2);
}

// ─── Tier 3 Solvers ─────────────────────────────────────────────

async function solveDataDashboard(page: Page): Promise<string> {
  await page.waitForSelector("[data-dashboard-tab]");
  const instructions = await getInstructions(page);

  // All variants contain quoted product and region, and Q-patterns
  const productMatch = instructions.match(/"([A-Z]\w+)"/);
  const regionMatch = instructions.match(/"(North|South|East|West|Central)"/);
  const quarterMatches = [...instructions.matchAll(/Q(\d)/g)].map((m) => `Q${m[1]}`);
  const targetQuarters = [...new Set(quarterMatches)];

  if (!productMatch || !regionMatch || targetQuarters.length === 0) {
    throw new Error(`Could not parse instructions: ${instructions}`);
  }

  const targetProduct = productMatch[1];
  const targetRegion = regionMatch[1];

  // Click Sales tab and read all sales (paginate)
  await page.locator('[data-dashboard-tab="sales"]').click();
  await page.waitForSelector("[data-table='sales']");

  interface SaleData { revenue: number; units: number; quarter: string }
  const matchingSales: SaleData[] = [];

  const readSalesPage = async () => {
    const salesRows = page.locator("[data-table='sales'] tbody tr");
    const salesCount = await salesRows.count();
    for (let i = 0; i < salesCount; i++) {
      const row = salesRows.nth(i);
      const region = (await row.locator("[data-region]").textContent())?.trim();
      const product = (await row.locator("[data-product]").textContent())?.trim();
      const quarter = (await row.locator("[data-quarter]").textContent())?.trim() ?? "";
      if (region === targetRegion && product === targetProduct && targetQuarters.includes(quarter)) {
        const revenueStr = (await row.locator("[data-revenue]").textContent())?.trim() ?? "0";
        const unitsStr = (await row.locator("[data-units]").textContent())?.trim() ?? "0";
        matchingSales.push({
          revenue: parseFloat(revenueStr.replace("$", "")),
          units: parseInt(unitsStr),
          quarter,
        });
      }
    }
  };

  await readSalesPage();
  while (true) {
    const nextBtn = page.locator("[data-page-next]");
    if (await nextBtn.isDisabled()) break;
    await nextBtn.click();
    await page.waitForTimeout(100);
    await readSalesPage();
  }

  // Costs tab
  await page.locator('[data-dashboard-tab="costs"]').click();
  await page.waitForSelector("[data-table='costs']");

  const costRow = page.locator(`[data-cost-product="${targetProduct}"]`);
  const costPerUnitStr = (await costRow.locator("[data-cost-per-unit]").textContent())?.trim() ?? "0";
  const shippingStr = (await costRow.locator("[data-shipping]").textContent())?.trim() ?? "0";
  const costPerUnit = parseFloat(costPerUnitStr.replace("$", ""));
  const shipping = parseFloat(shippingStr.replace("$", ""));

  // Taxes tab
  await page.locator('[data-dashboard-tab="taxes"]').click();
  await page.waitForSelector("[data-table='taxes']");

  const taxRow = page.locator(`[data-tax-region="${targetRegion}"]`);
  const taxRateStr = (await taxRow.locator("[data-tax-rate]").textContent())?.trim() ?? "0";
  const taxRate = parseFloat(taxRateStr.replace("%", ""));

  let totalProfit = 0;
  for (const sale of matchingSales) {
    const grossProfit = sale.revenue - sale.units * costPerUnit - shipping;
    totalProfit += grossProfit * (1 - taxRate / 100);
  }

  return (Math.round(totalProfit * 100) / 100).toFixed(2);
}

async function solveConstraintSolver(page: Page): Promise<string> {
  await page.waitForSelector("[data-table='inventory']");
  await page.waitForSelector("[data-panel='requirements']");
  await page.waitForSelector("[data-panel='budget']");
  await page.waitForSelector("[data-panel='exclusions']");

  const advancedToggle = page.locator("[data-toggle-advanced]");
  if (await advancedToggle.isVisible()) {
    await advancedToggle.click();
    await page.waitForSelector("[data-panel='advanced']");
  }

  const readConstraints = async (panelName: string): Promise<string[]> => {
    const els = page.locator(`[data-panel='${panelName}'] [data-constraint] span:last-child`);
    const count = await els.count();
    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      results.push((await els.nth(i).textContent())?.trim() ?? "");
    }
    return results;
  };

  const requirements = await readConstraints("requirements");
  const budgetConstraints = await readConstraints("budget");
  const exclusions = await readConstraints("exclusions");
  const advancedConstraints = await readConstraints("advanced");

  const allowedCategories: string[] = [];
  let mustBeInStock = false;
  let maxPrice = Infinity;
  let minRating = 0;
  let excludedSupplier: string | null = null;
  let maxWeight = Infinity;

  for (const r of requirements) {
    const catOrMatch = r.match(/Category must be "(.+?)" OR "(.+?)"/);
    if (catOrMatch) { allowedCategories.push(catOrMatch[1], catOrMatch[2]); }
    const catMatch = r.match(/^Category must be "(.+?)"$/);
    if (catMatch) allowedCategories.push(catMatch[1]);
    if (r.includes("Must be in stock")) mustBeInStock = true;
  }

  for (const b of budgetConstraints) {
    const priceMatch = b.match(/Price must be ≤ \$(\d+)/);
    if (priceMatch) maxPrice = parseFloat(priceMatch[1]);
    const ratingMatch = b.match(/Rating must be ≥ ([\d.]+)/);
    if (ratingMatch) minRating = parseFloat(ratingMatch[1]);
  }

  for (const e of exclusions) {
    const suppMatch = e.match(/Supplier must NOT be "(.+?)"/);
    if (suppMatch) excludedSupplier = suppMatch[1];
  }

  for (const a of advancedConstraints) {
    const weightMatch = a.match(/Weight must be ≤ (\d+)/);
    if (weightMatch) maxWeight = parseFloat(weightMatch[1]);
  }

  const optimizationText = (await page.locator("[data-optimization]").textContent())?.trim() ?? "";
  const optField = optimizationText.includes("lowest price") ? "price" : "weight";

  const rows = page.locator("[data-table='inventory'] tbody tr");
  const rowCount = await rows.count();

  interface ItemInfo { name: string; category: string; price: number; rating: number; supplier: string; inStock: boolean; weight: number }
  const qualifying: ItemInfo[] = [];

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const name = (await row.getAttribute("data-item-name")) ?? "";
    const category = (await row.locator("[data-item-category]").textContent())?.trim() ?? "";
    const priceStr = (await row.locator("[data-item-price]").textContent())?.trim() ?? "0";
    const ratingStr = (await row.locator("[data-item-rating]").textContent())?.trim() ?? "0";
    const supplier = (await row.locator("[data-item-supplier]").textContent())?.trim() ?? "";
    const stockStr = (await row.locator("[data-item-stock]").textContent())?.trim() ?? "";
    const weightStr = (await row.locator("[data-item-weight]").textContent())?.trim() ?? "0";

    const price = parseFloat(priceStr.replace("$", ""));
    const rating = parseFloat(ratingStr);
    const inStock = stockStr === "Yes";
    const weight = parseFloat(weightStr);

    if (allowedCategories.length > 0 && !allowedCategories.includes(category)) continue;
    if (mustBeInStock && !inStock) continue;
    if (price > maxPrice) continue;
    if (rating < minRating) continue;
    if (excludedSupplier && supplier === excludedSupplier) continue;
    if (weight > maxWeight) continue;

    qualifying.push({ name, category, price, rating, supplier, inStock, weight });
  }

  if (qualifying.length === 0) throw new Error("No item satisfies all constraints");

  qualifying.sort((a, b) => a[optField] - b[optField]);
  return qualifying[0].name;
}

// ─── Tier 4 Solvers ─────────────────────────────────────────────

async function solveCalculationAudit(page: Page): Promise<string> {
  await page.waitForSelector("[data-table='expenses']");

  // Read all line items and verify each row's math
  const rows = page.locator("[data-table='expenses'] tbody tr");
  const rowCount = await rows.count();

  let correctSum = 0;

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const qtyStr = (await row.locator("[data-quantity]").textContent())?.trim() ?? "0";
    const unitPriceStr = (await row.locator("[data-unit-price]").textContent())?.trim() ?? "0";
    const displayedTotalStr = (await row.locator("[data-displayed-total]").textContent())?.trim() ?? "0";

    const qty = parseInt(qtyStr);
    const unitPrice = parseFloat(unitPriceStr.replace("$", ""));
    const displayedTotal = parseFloat(displayedTotalStr.replace("$", ""));
    const expectedTotal = Math.round(qty * unitPrice * 100) / 100;

    // Only include rows where displayed total matches the expected calculation
    if (Math.abs(displayedTotal - expectedTotal) < 0.001) {
      correctSum += displayedTotal;
    }
  }

  return (Math.round(correctSum * 100) / 100).toFixed(2);
}

async function solveRedHerring(page: Page): Promise<string> {
  await page.waitForSelector("[data-table='summary']");
  const instructions = await getInstructions(page);

  // Click the "View Raw Data" toggle
  const toggleRaw = page.locator("[data-toggle-raw]");
  await toggleRaw.click();
  await page.waitForSelector("[data-table='raw']");

  // All variants contain the metric name in quotes
  const metricMatch = instructions.match(/"([^"]+)"/);
  if (!metricMatch) throw new Error(`Could not parse metric: ${instructions}`);
  const targetMetric = metricMatch[1];

  const targetRow = page.locator(`[data-table='raw'] [data-metric="${targetMetric}"]`);

  // Detect sum vs difference from instruction keywords
  if (instructions.match(/\bsum\b|add|combined/i)) {
    const quarterMatches = [...instructions.matchAll(/Q(\d)/g)].map((m) => `Q${m[1]}`);
    const quarters = [...new Set(quarterMatches)];

    let total = 0;
    for (const q of quarters) {
      const cell = targetRow.locator(`[data-q="${q}"]`);
      const valStr = (await cell.textContent())?.trim() ?? "0";
      total += parseInt(valStr.replace(/,/g, ""));
    }
    return String(total);
  } else {
    // Difference
    const diffMatch = instructions.match(/(Q\d)\s*(?:minus|-|from)\s*(Q\d)/i)
      || instructions.match(/(Q\d)\s+and\s+(Q\d)/i);
    if (!diffMatch) throw new Error(`Could not parse difference: ${instructions}`);
    const [, q1, q2] = diffMatch;

    const v1Str = (await targetRow.locator(`[data-q="${q1}"]`).textContent())?.trim() ?? "0";
    const v2Str = (await targetRow.locator(`[data-q="${q2}"]`).textContent())?.trim() ?? "0";
    return String(parseInt(v1Str.replace(/,/g, "")) - parseInt(v2Str.replace(/,/g, "")));
  }
}

// ─── Test runner ────────────────────────────────────────────────

let sessionId: string;

test.beforeAll(async ({ request }) => {
  const existing = await request.get("/api/session");
  const existingData = await existing.json();

  if (existingData.session?.status === "active") {
    await request.post("/api/session/finish", {
      data: { sessionId: existingData.session.sessionId },
    });
  }

  await new Promise((r) => setTimeout(r, 1500));

  const res = await request.post("/api/session");
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Failed to create session: ${res.status()} ${body}`);
  }
  const data = await res.json();
  sessionId = data.sessionId;
});

const SOLVER_SETS_ANSWER = new Set(["tier1-dropdown-select"]);

for (const [challengeId, solverFn] of Object.entries(SOLVERS)) {
  test(`solve: ${challengeId}`, async ({ page }) => {
    await page.goto(`/challenges/${challengeId}`);

    const answer = await solverFn(page);
    expect(answer.length).toBeGreaterThan(0);

    if (!SOLVER_SETS_ANSWER.has(challengeId)) {
      const input = page.locator('input[type="text"]').last();
      await input.fill(answer);
    }

    const submitBtn = page.locator("button", { hasText: "Submit Answer" });
    await submitBtn.click();

    await expect(page.locator("text=Correct!")).toBeVisible({ timeout: 5000 });
  });
}

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

/**
 * Table Sort: Sort by Annual Compensation (with hourly→annual conversion),
 * paginate to find the Nth highest/lowest employee name.
 */
async function solveTableSort(page: Page): Promise<string> {
  await page.waitForSelector("table tbody tr");
  const instructions = await getInstructions(page);

  // Parse position and direction from instructions
  const posMatch = instructions.match(/(\d+)\w*\s+(highest|lowest)/i)
    || instructions.match(/position (\d+)/i);
  const dirMatch = instructions.match(/(highest|lowest)/i);
  if (!posMatch || !dirMatch) throw new Error(`Could not parse instructions: ${instructions}`);

  const targetPosition = parseInt(posMatch[1]);
  const direction = dirMatch[1].toLowerCase();

  // Click "Annual Compensation" header to sort (component handles hourly conversion)
  const header = page.locator("th", { hasText: "Annual Compensation" });
  await header.click(); // ascending (lowest first)
  if (direction === "highest") {
    await header.click(); // descending (highest first)
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

/**
 * Form Fill: Read employee fields across multiple disclosure mechanisms
 * (tabs, expandable sections, tooltips) and submit comma-separated values.
 * Some fields may require transformation (salary band, start quarter, dept code).
 */
async function solveFormFill(page: Page): Promise<string> {
  await page.waitForSelector("[data-field]");
  const instructions = await getInstructions(page);

  // Parse field names from instructions
  const match = instructions.match(/:\s*([a-zA-Z ,]+?)\.\s/i)
    || instructions.match(/\btheir\s+(.+?)\?/i);

  let fieldNames: string[];
  if (match) {
    fieldNames = match[1].split(",").map((f) => f.trim().toLowerCase());
  } else {
    const allFields = ["name", "email", "department", "role", "salary", "city", "start date", "startdate",
      "salary band", "start quarter", "dept code"];
    fieldNames = allFields.filter((f) => instructions.toLowerCase().includes(f));
    if (fieldNames.length === 0) throw new Error(`Could not parse fields from: ${instructions}`);
  }

  const labelToKey: Record<string, string> = {
    name: "name", email: "email", department: "department",
    role: "role", salary: "salary", city: "city", "start date": "startDate",
    startdate: "startDate", "salary band": "salary_band",
    "start quarter": "start_quarter", "dept code": "dept_code",
  };

  // Check if we're in multi-disclosure mode (Profile/Contact tabs)
  const hasFormTabs = await page.locator("[data-form-tab]").count() > 0;

  // Read salary band reference table if present
  const salaryBands: Array<{ min: number; max: number; label: string }> = [];
  const bandTable = page.locator("[data-salary-band-table]");
  if (await bandTable.count() > 0) {
    const bandEls = page.locator("[data-salary-band]");
    const bandCount = await bandEls.count();
    for (let i = 0; i < bandCount; i++) {
      const el = bandEls.nth(i);
      const label = (await el.getAttribute("data-salary-band")) ?? "";
      const rangeText = (await el.locator(".font-mono").textContent())?.trim() ?? "";
      // Parse range like "$60,000-$99,999" or "$150,000+"
      const nums = rangeText.replace(/\$/g, "").replace(/,/g, "").match(/(\d+)/g);
      if (nums) {
        const min = parseInt(nums[0]);
        const max = rangeText.includes("+") ? 999999 : (nums.length > 1 ? parseInt(nums[1]) : min);
        salaryBands.push({ min, max, label });
      }
    }
  }

  if (hasFormTabs) {
    // Reveal all hidden content on Profile tab (default tab)
    const expandBtn = page.locator("[data-expand-details]");
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForSelector('[data-field="role"]');
    }

    const tooltipTrigger = page.locator("[data-tooltip-trigger]");
    if (await tooltipTrigger.isVisible()) {
      await tooltipTrigger.click();
      await page.waitForSelector('[data-field="startDate"]');
    }

    // Read all Profile-tab fields
    const fieldValues: Record<string, string> = {};
    for (const key of ["name", "email", "department", "salary", "role", "startDate"]) {
      const el = page.locator(`[data-field="${key}"]`);
      if (await el.count() > 0) {
        fieldValues[key] = (await el.textContent())?.trim() ?? "";
      }
    }

    // Switch to Contact tab to read city
    await page.locator('[data-form-tab="contact"]').click();
    await page.waitForSelector("[data-contact-panel]");
    fieldValues["city"] = (await page.locator('[data-field="city"]').textContent())?.trim() ?? "";

    // Compute transformed values
    // Salary band: look up salary in band table
    const salaryNum = parseInt(fieldValues["salary"]?.replace(/[$,]/g, "") ?? "0");
    const band = salaryBands.find((b) => salaryNum >= b.min && salaryNum <= b.max);
    fieldValues["salary_band"] = band?.label ?? "Unknown";

    // Start quarter: extract month from date
    const startDate = fieldValues["startDate"] ?? "";
    const month = parseInt(startDate.split("-")[1] ?? "0");
    if (month <= 3) fieldValues["start_quarter"] = "Q1";
    else if (month <= 6) fieldValues["start_quarter"] = "Q2";
    else if (month <= 9) fieldValues["start_quarter"] = "Q3";
    else fieldValues["start_quarter"] = "Q4";

    // Dept code: first 3 letters uppercased
    const dept = fieldValues["department"] ?? "";
    fieldValues["dept_code"] = dept.substring(0, 3).toUpperCase();

    // Return requested fields in order
    const values: string[] = [];
    for (const field of fieldNames) {
      const key = labelToKey[field] || field;
      const value = fieldValues[key];
      if (!value) throw new Error(`Could not read field: ${key}`);
      values.push(value);
    }
    return values.join(", ");
  } else {
    // Legacy mode: "Details" toggle
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

/**
 * Tab Navigation: 2-level decision tree across tabs.
 * Check key1 in tab1 against threshold1. If above, check key2 in tab2
 * against threshold2. Three possible leaf results.
 */
async function solveTabNavigation(page: Page): Promise<string> {
  await page.waitForSelector("[data-tab]");
  const instructions = await getInstructions(page);

  // Get tab labels from the page
  const tabElements = await page.locator("[data-tab]").all();
  const tabLabels = new Set<string>();
  for (const el of tabElements) {
    const label = await el.getAttribute("data-tab");
    if (label) tabLabels.add(label);
  }

  // Extract all quoted strings (11 total, with conditionKey repeated at index 8)
  const quoted = [...instructions.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (quoted.length < 11) throw new Error(`Expected 11 quoted strings, got ${quoted.length}: ${instructions}`);

  // Group into semantic pairs — within each pair, identify tab vs key
  const parsePair = (a: string, b: string) => {
    if (tabLabels.has(a)) return { tab: a, key: b };
    return { tab: b, key: a };
  };

  const condPair = parsePair(quoted[0], quoted[1]);          // First condition
  const secCondPair = parsePair(quoted[2], quoted[3]);        // Second condition
  const aboveAbovePair = parsePair(quoted[4], quoted[5]);     // Result: above + above
  const aboveBelowPair = parsePair(quoted[6], quoted[7]);     // Result: above + below
  // quoted[8] is repeat of conditionKey — skip
  const belowPair = parsePair(quoted[9], quoted[10]);         // Result: below

  // Extract threshold numbers (first two occurrences after threshold keywords)
  const threshMatches = [...instructions.matchAll(
    /(?:above|exceeds?|against|greater than|Compare it to)\s+(\d+)/gi
  )];
  if (threshMatches.length < 2) throw new Error(`Could not find 2 thresholds: ${instructions}`);
  const threshold1 = parseInt(threshMatches[0][1]);
  const threshold2 = parseInt(threshMatches[1][1]);

  // Step 1: Navigate to first condition tab and read value
  await page.locator(`[data-tab="${condPair.tab}"]`).click();
  const condEl = page.locator(`[data-value="${condPair.key}"]`);
  await condEl.waitFor({ state: "visible" });
  const condText = await condEl.textContent();
  if (!condText) throw new Error(`Could not read value for: ${condPair.key}`);
  const condValue = parseNumericFromText(condText.trim());

  let resultTab: string;
  let resultKey: string;

  if (condValue > threshold1) {
    // Step 2: Navigate to second condition tab and read value
    await page.locator(`[data-tab="${secCondPair.tab}"]`).click();
    const secCondEl = page.locator(`[data-value="${secCondPair.key}"]`);
    await secCondEl.waitFor({ state: "visible" });
    const secCondText = await secCondEl.textContent();
    if (!secCondText) throw new Error(`Could not read value for: ${secCondPair.key}`);
    const secCondValue = parseNumericFromText(secCondText.trim());

    if (secCondValue > threshold2) {
      resultTab = aboveAbovePair.tab;
      resultKey = aboveAbovePair.key;
    } else {
      resultTab = aboveBelowPair.tab;
      resultKey = aboveBelowPair.key;
    }
  } else {
    resultTab = belowPair.tab;
    resultKey = belowPair.key;
  }

  // Step 3: Navigate to result tab and read value
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

/**
 * Filter Search: CSS grid cards + "Load More" button.
 * Load all employees, apply filter conditions, compute aggregation.
 */
async function solveFilterSearch(page: Page): Promise<string> {
  await page.waitForSelector("[data-employee-card]");
  const instructions = await getInstructions(page);

  // Click "Load More" until all employees are visible
  while (true) {
    const loadMoreBtn = page.locator("[data-load-more]");
    if (await loadMoreBtn.count() === 0) break;
    await loadMoreBtn.click();
    await page.waitForTimeout(100);
  }

  // Read all employee cards
  const cards = page.locator("[data-employee-card]");
  const cardCount = await cards.count();

  interface EmployeeRow { name: string; department: string; salary: number; city: string }
  const employees: EmployeeRow[] = [];

  for (let i = 0; i < cardCount; i++) {
    const card = cards.nth(i);
    const name = (await card.getAttribute("data-employee-card")) ?? "";
    const department = (await card.locator("[data-emp-department]").textContent())?.trim() ?? "";
    const salaryStr = (await card.locator("[data-emp-salary]").textContent())?.trim() ?? "0";
    const city = (await card.locator("[data-emp-city]").textContent())?.trim() ?? "";
    employees.push({
      name,
      department,
      salary: parseInt(salaryStr.replace(/[$,]/g, "")),
      city,
    });
  }

  // Parse filter conditions
  const conditions: Array<{ field: string; value: string }> = [];
  const condMatches = [...instructions.matchAll(/(\w+)\s*=\s*"(.+?)"/g)];
  for (const m of condMatches) {
    conditions.push({ field: m[1], value: m[2] });
  }

  // Determine aggregation
  let aggregation: "count" | "total salary" | "average salary";
  if (instructions.match(/\b(?:count|how many|total count)\b/i)) {
    aggregation = "count";
  } else if (instructions.match(/\b(?:average|mean)\b/i)) {
    aggregation = "average salary";
  } else {
    aggregation = "total salary";
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

/**
 * Modal Interaction: Find product by category + price condition,
 * open modal, wait for async load, switch to Details tab, read field.
 */
async function solveModalInteraction(page: Page): Promise<string> {
  await page.waitForSelector("[data-card-name]");
  const instructions = await getInstructions(page);

  // Parse category, condition, and target field
  const catMatch = instructions.match(/"([^"]+)"\s*(?:category|products|section)/i)
    || instructions.match(/(?:category|categorized as)\s*"([^"]+)"/i);
  const condMatch = instructions.match(/(lowest price|highest price)/i);
  const fieldMatch = instructions.match(/(?:submit|provide|report)\s+(?:the\s+)?(\w+)/i);
  if (!catMatch || !condMatch || !fieldMatch) throw new Error(`Could not parse instructions: ${instructions}`);

  const targetCategory = catMatch[1];
  const condition = condMatch[1].toLowerCase();
  const targetField = fieldMatch[1];

  // Find cards in target category
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

  // Open modal
  await page.locator(`[data-card-name="${target.name}"]`).first().click();
  await page.waitForSelector("[data-modal]");

  // Wait for async loading to complete (spinner disappears, tabs appear)
  await page.waitForSelector("[data-modal-tab]", { timeout: 5000 });

  // Click "Details" tab to reveal SKU/supplier
  await page.locator('[data-modal-tab="details"]').click();
  await page.waitForSelector('[data-modal-panel="details"]');

  // Read the target field
  const fieldEl = page.locator(`[data-field="${targetField}"]`);
  const value = await fieldEl.textContent();
  if (!value) throw new Error(`Could not read field: ${targetField}`);

  return value.trim();
}

// ─── Tier 2 Solvers ─────────────────────────────────────────────

/**
 * Multi-Step Wizard: Select order → apply discount (with budget check) →
 * select shipping → compute final total. Handles budget backtracking.
 */
async function solveMultiStepWizard(page: Page): Promise<string> {
  await page.waitForSelector("[data-order-id]");
  const instructions = await getInstructions(page);

  // Parse conditions from instructions
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

  // Step 2: Read discount codes and sort by condition
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

  // Try discounts in order — backtrack if budget exceeded
  for (let di = 0; di < discounts.length; di++) {
    await page.locator(`[data-discount-code="${discounts[di].code}"]`).click();
    await page.waitForTimeout(300);

    // Check for budget error
    if (await page.locator("[data-budget-error]").isVisible()) {
      await page.locator("[data-back-to-step2]").click();
      await page.waitForSelector("[data-discount-code]");
      continue;
    }
    break;
  }

  // Step 3: Select shipping
  await page.waitForSelector("[data-shipping]");
  const shippingBtn = page.locator(`[data-shipping="${targetShipping}"]`);
  const shippingCostStr = (await shippingBtn.locator("[data-shipping-cost]").getAttribute("data-shipping-cost")) ?? "0";
  const shippingCost = parseFloat(shippingCostStr);
  await shippingBtn.click();

  // Step 4: Compute answer from summary
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

/**
 * Linked Data Lookup: Cross-reference tables with disambiguation.
 * Instructions use first name only with a hint (department or salary).
 */
async function solveLinkedDataLookup(page: Page): Promise<string> {
  await page.waitForSelector("[data-table='employees']");
  await page.waitForSelector("[data-table='departments']");
  const instructions = await getInstructions(page);

  // Extract first name from instructions (in quotes)
  const empMatch = instructions.match(/"([^"]+)"/);
  if (!empMatch) throw new Error(`Could not parse employee: ${instructions}`);
  const firstName = empMatch[1];

  // Find all employees whose name starts with the first name
  const allEmpRows = page.locator("[data-employee-name]");
  const empCount = await allEmpRows.count();

  interface EmpCandidate { fullName: string; deptId: string; salary: number }
  const candidates: EmpCandidate[] = [];

  for (let i = 0; i < empCount; i++) {
    const row = allEmpRows.nth(i);
    const fullName = (await row.getAttribute("data-employee-name")) ?? "";
    if (fullName === firstName || fullName.startsWith(firstName + " ")) {
      const deptId = (await row.locator("[data-dept-id]").textContent())?.trim() ?? "";
      const salaryStr = (await row.locator("td").nth(3).textContent())?.trim() ?? "0";
      const salary = parseInt(salaryStr.replace(/[$,]/g, ""));
      candidates.push({ fullName, deptId, salary });
    }
  }

  if (candidates.length === 0) throw new Error(`No employee found with first name: ${firstName}`);

  // Disambiguate if multiple candidates
  let targetEmp: EmpCandidate;
  if (candidates.length === 1) {
    targetEmp = candidates[0];
  } else {
    // Try department hint: "the one in Engineering"
    const deptHintMatch = instructions.match(/the one in (\w+)/i);
    if (deptHintMatch) {
      const deptName = deptHintMatch[1];
      // Find dept ID by looking up department name in the departments table
      const deptExpandBtns = page.locator("[data-expand-dept]");
      const deptBtnCount = await deptExpandBtns.count();
      let targetDeptId = "";
      for (let i = 0; i < deptBtnCount; i++) {
        const btn = deptExpandBtns.nth(i);
        const btnText = (await btn.textContent())?.trim() ?? "";
        if (btnText.includes(deptName)) {
          targetDeptId = (await btn.getAttribute("data-expand-dept")) ?? "";
          break;
        }
      }
      targetEmp = candidates.find((c) => c.deptId === targetDeptId) ?? candidates[0];
    } else {
      // Try salary hint: "with salary above $100K" or "with salary below $100K"
      const salaryHintMatch = instructions.match(/salary (above|below) \$100K/i);
      if (salaryHintMatch) {
        const dir = salaryHintMatch[1].toLowerCase();
        targetEmp = candidates.find((c) =>
          dir === "above" ? c.salary >= 100000 : c.salary < 100000
        ) ?? candidates[0];
      } else {
        targetEmp = candidates[0];
      }
    }
  }

  const deptId = targetEmp.deptId;

  if (instructions.match(/expand/i)) {
    // Department field task — expand the department row
    const expandBtn = page.locator(`[data-expand-dept="${deptId}"]`);
    await expandBtn.click();
    await page.waitForSelector(`[data-dept-details="${deptId}"]`);

    // Determine target field from instructions
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

/**
 * Constraint Solver: Horizontally scrollable product cards + popover.
 * Read constraints from panels, filter items, optimize.
 */
async function solveConstraintSolver(page: Page): Promise<string> {
  await page.waitForSelector("[data-inventory-strip]");
  await page.waitForSelector("[data-panel='requirements']");
  await page.waitForSelector("[data-panel='budget']");
  await page.waitForSelector("[data-panel='exclusions']");

  // Open the "Additional Constraints" popover
  const advancedToggle = page.locator("[data-toggle-advanced]");
  if (await advancedToggle.isVisible()) {
    await advancedToggle.click();
    await page.waitForSelector("[data-panel='advanced']");
  }

  // Read constraints from each panel
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

  // Parse constraint values
  const allowedCategories: string[] = [];
  let mustBeInStock = false;
  let maxPrice = Infinity;
  let minRating = 0;
  let excludedSupplier: string | null = null;
  let maxWeight = Infinity;
  let belowAvgPrice = false;
  let aboveAvgRating = false;

  for (const r of requirements) {
    const catOrMatch = r.match(/Category must be "(.+?)" OR "(.+?)"/);
    if (catOrMatch) { allowedCategories.push(catOrMatch[1], catOrMatch[2]); }
    const catMatch = r.match(/^Category must be "(.+?)"$/);
    if (catMatch) allowedCategories.push(catMatch[1]);
    if (r.includes("Must be in stock")) mustBeInStock = true;
  }

  for (const b of budgetConstraints) {
    if (b.includes("below the average price")) {
      belowAvgPrice = true;
    } else {
      const priceMatch = b.match(/Price must be ≤ \$(\d+)/);
      if (priceMatch) maxPrice = parseFloat(priceMatch[1]);
    }
    if (b.includes("above the average rating")) {
      aboveAvgRating = true;
    } else {
      const ratingMatch = b.match(/Rating must be ≥ ([\d.]+)/);
      if (ratingMatch) minRating = parseFloat(ratingMatch[1]);
    }
  }

  for (const e of exclusions) {
    const suppMatch = e.match(/Supplier must NOT be "(.+?)"/);
    if (suppMatch) excludedSupplier = suppMatch[1];
  }

  for (const a of advancedConstraints) {
    const weightMatch = a.match(/Weight must be ≤ (\d+)/);
    if (weightMatch) maxWeight = parseFloat(weightMatch[1]);
  }

  // Read optimization target
  const optimizationText = (await page.locator("[data-optimization]").textContent())?.trim() ?? "";
  const optField = optimizationText.includes("lowest price") ? "price" : "weight";

  // Read all items from cards in the horizontal scroll strip
  const itemCards = page.locator("[data-item-card]");
  const itemCount = await itemCards.count();

  interface ItemInfo { name: string; category: string; price: number; rating: number; supplier: string; inStock: boolean; weight: number }
  const allItems: ItemInfo[] = [];

  for (let i = 0; i < itemCount; i++) {
    const card = itemCards.nth(i);
    const name = (await card.getAttribute("data-item-card")) ?? "";
    const category = (await card.locator("[data-item-category]").textContent())?.trim() ?? "";
    const priceStr = (await card.locator("[data-item-price]").textContent())?.trim() ?? "0";
    const ratingStr = (await card.locator("[data-item-rating]").textContent())?.trim() ?? "0";
    const supplier = (await card.locator("[data-item-supplier]").textContent())?.trim() ?? "";
    const stockStr = (await card.locator("[data-item-stock]").textContent())?.trim() ?? "";
    const weightStr = (await card.locator("[data-item-weight]").textContent())?.trim() ?? "0";

    const price = parseFloat(priceStr.replace("$", ""));
    const rating = parseFloat(ratingStr);
    const inStock = stockStr === "Yes";
    const weight = parseFloat(weightStr);

    allItems.push({ name, category, price, rating, supplier, inStock, weight });
  }

  // Compute aggregates for relative constraints
  let avgPrice = 0;
  let avgRating = 0;
  if (belowAvgPrice) {
    const inStockItems = allItems.filter((it) => it.inStock);
    avgPrice = inStockItems.length > 0
      ? Math.round(inStockItems.reduce((s, it) => s + it.price, 0) / inStockItems.length * 100) / 100
      : 0;
  }
  if (aboveAvgRating) {
    avgRating = allItems.length > 0
      ? Math.round(allItems.reduce((s, it) => s + it.rating, 0) / allItems.length * 10) / 10
      : 0;
  }

  // Filter items
  const qualifying = allItems.filter((item) => {
    if (allowedCategories.length > 0 && !allowedCategories.includes(item.category)) return false;
    if (mustBeInStock && !item.inStock) return false;
    if (belowAvgPrice) {
      if (item.price >= avgPrice) return false;
    } else {
      if (item.price > maxPrice) return false;
    }
    if (aboveAvgRating) {
      if (item.rating <= avgRating) return false;
    } else {
      if (item.rating < minRating) return false;
    }
    if (excludedSupplier && item.supplier === excludedSupplier) return false;
    if (item.weight > maxWeight) return false;
    return true;
  });

  if (qualifying.length === 0) throw new Error("No item satisfies all constraints");

  qualifying.sort((a, b) => a[optField] - b[optField]);
  return qualifying[0].name;
}

// ─── Tier 4 Solvers ─────────────────────────────────────────────

/**
 * Calculation Audit: Receipt cards with per-category tax rates.
 * Read tax rate legend, compute correct total = round(qty × unitPrice × (1 + rate/100), 2),
 * sum only rows where displayed total matches.
 */
async function solveCalculationAudit(page: Page): Promise<string> {
  await page.waitForSelector("[data-expense-card]");

  // Read tiered tax rates from the table (category × bracket → rate%)
  // Structure: { "Operations": { "≤$500": 6, "$501–$2000": 9, ">$2000": 12 } }
  const tieredRates: Record<string, Record<string, number>> = {};
  const bracketLabels: string[] = [];

  const rateTable = page.locator("[data-tax-rate-table]");
  if (await rateTable.count() > 0) {
    // Read bracket headers
    const headers = rateTable.locator("[data-bracket-header]");
    const headerCount = await headers.count();
    for (let i = 0; i < headerCount; i++) {
      const label = (await headers.nth(i).getAttribute("data-bracket-header")) ?? "";
      bracketLabels.push(label);
    }

    // Read per-category rates
    const rows = rateTable.locator("[data-tax-rate-row]");
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const category = (await row.getAttribute("data-tax-rate-row")) ?? "";
      tieredRates[category] = {};
      const cells = row.locator("[data-tax-rate-cell]");
      const cellCount = await cells.count();
      for (let j = 0; j < cellCount; j++) {
        const cellKey = (await cells.nth(j).getAttribute("data-tax-rate-cell")) ?? "";
        // cellKey is "Category|BracketLabel"
        const bracketLabel = cellKey.split("|")[1] ?? bracketLabels[j];
        const rateStr = (await cells.nth(j).textContent())?.trim() ?? "0";
        tieredRates[category][bracketLabel] = parseFloat(rateStr.replace("%", ""));
      }
    }
  }

  // Parse bracket thresholds from labels (e.g., "≤$500", "$501–$2000", ">$2000")
  const brackets: Array<{ label: string; min: number; max: number }> = [];
  for (const label of bracketLabels) {
    const nums = label.replace(/[$,≤>]/g, "").replace(/\u2013/g, "-").match(/(\d+)/g);
    if (label.startsWith("≤") || label.startsWith("<")) {
      brackets.push({ label, min: 0, max: parseInt(nums?.[0] ?? "0") });
    } else if (label.startsWith(">")) {
      brackets.push({ label, min: parseInt(nums?.[0] ?? "0") + 1, max: 999999 });
    } else if (nums && nums.length >= 2) {
      brackets.push({ label, min: parseInt(nums[0]), max: parseInt(nums[1]) });
    }
  }

  const hasTieredRates = Object.keys(tieredRates).length > 0 && brackets.length > 0;

  // Look up rate for a category + subtotal
  const getRate = (category: string, subtotal: number): number => {
    const bracket = brackets.find((b) => subtotal >= b.min && subtotal <= b.max);
    if (!bracket || !tieredRates[category]) return 0;
    return tieredRates[category][bracket.label] ?? 0;
  };

  // Read all expense cards in order
  const cards = page.locator("[data-expense-card]");
  const cardCount = await cards.count();

  let correctSum = 0;

  for (let i = 0; i < cardCount; i++) {
    const card = cards.nth(i);
    const qtyStr = (await card.locator("[data-exp-qty]").textContent())?.trim() ?? "0";
    const unitPriceStr = (await card.locator("[data-exp-unit-price]").textContent())?.trim() ?? "0";
    const displayedTotalStr = (await card.locator("[data-exp-total]").textContent())?.trim() ?? "0";
    const category = (await card.locator("[data-exp-category]").textContent())?.trim() ?? "";

    const qty = parseInt(qtyStr);
    const unitPrice = parseFloat(unitPriceStr.replace("$", ""));
    const displayedTotal = parseFloat(displayedTotalStr.replace("$", ""));
    const subtotal = qty * unitPrice;

    let expectedTotal: number;
    if (hasTieredRates) {
      const rate = getRate(category, subtotal);
      expectedTotal = Math.round(subtotal * (1 + rate / 100) * 100) / 100;
    } else {
      expectedTotal = Math.round(subtotal * 100) / 100;
    }

    if (Math.abs(displayedTotal - expectedTotal) < 0.001) {
      correctSum += displayedTotal;
    }
  }

  return (Math.round(correctSum * 100) / 100).toFixed(2);
}

/**
 * Red Herring: Two datasets in Report A / Report B tabs.
 * Must find the internally consistent dataset (where Annual = Q1+Q2+Q3+Q4 for every row),
 * then compute the answer from it.
 */
async function solveRedHerring(page: Page): Promise<string> {
  const instructions = await getInstructions(page);

  // Extract metric name from instructions (in quotes)
  const metricMatch = instructions.match(/"([^"]+)"/);
  if (!metricMatch) throw new Error(`Could not parse metric: ${instructions}`);
  const targetMetric = metricMatch[1];

  // Helper: read a tab's table data
  const readTabData = async (tabId: string) => {
    await page.locator(`[data-report-tab="${tabId}"]`).click();
    await page.waitForSelector(`[data-table="${tabId}"]`);
    const rows = page.locator(`[data-table="${tabId}"] [data-metric-row]`);
    const rowCount = await rows.count();
    const data: Array<{ label: string; q1: number; q2: number; q3: number; q4: number; annual: number }> = [];
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const label = (await row.getAttribute("data-metric-row")) ?? "";
      const qCells = row.locator("[data-metric-q]");
      const q1 = parseInt((await qCells.nth(0).textContent())?.trim().replace(/,/g, "") ?? "0");
      const q2 = parseInt((await qCells.nth(1).textContent())?.trim().replace(/,/g, "") ?? "0");
      const q3 = parseInt((await qCells.nth(2).textContent())?.trim().replace(/,/g, "") ?? "0");
      const q4 = parseInt((await qCells.nth(3).textContent())?.trim().replace(/,/g, "") ?? "0");
      const annualStr = (await row.locator("[data-metric-annual]").textContent())?.trim().replace(/,/g, "") ?? "0";
      const annual = parseInt(annualStr);
      data.push({ label, q1, q2, q3, q4, annual });
    }
    return data;
  };

  // Read both datasets
  const dataA = await readTabData("a");
  const dataB = await readTabData("b");

  // Check consistency: Annual should equal Q1+Q2+Q3+Q4 for every row
  const isConsistent = (dataset: typeof dataA) =>
    dataset.every((row) => row.annual === row.q1 + row.q2 + row.q3 + row.q4);

  const correctData = isConsistent(dataA) ? dataA : dataB;

  // Find the target metric row
  const targetRow = correctData.find((r) => r.label === targetMetric);
  if (!targetRow) throw new Error(`Could not find metric: ${targetMetric}`);

  // Detect sum vs difference
  if (instructions.match(/\bsum\b|add|combined/i)) {
    const quarterMatches = [...instructions.matchAll(/Q(\d)/g)].map((m) => `Q${m[1]}`);
    const quarters = [...new Set(quarterMatches)];
    let total = 0;
    for (const q of quarters) {
      const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
      total += targetRow[key];
    }
    return String(total);
  } else {
    let q1Key: string;
    let q2Key: string;

    const subtractFromMatch = instructions.match(/Subtract\s+(Q\d)\s+from\s+(Q\d)/i);
    if (subtractFromMatch) {
      q1Key = subtractFromMatch[2].toLowerCase();
      q2Key = subtractFromMatch[1].toLowerCase();
    } else {
      const diffMatch = instructions.match(/(Q\d)\s*(?:minus|-)\s*(Q\d)/i)
        || instructions.match(/(Q\d)\s+and\s+(Q\d)/i);
      if (diffMatch) {
        q1Key = diffMatch[1].toLowerCase();
        q2Key = diffMatch[2].toLowerCase();
      } else {
        const qs = [...instructions.matchAll(/Q(\d)/g)].map((m) => `q${m[1]}`);
        q1Key = qs[0];
        q2Key = qs[1];
      }
    }

    return String(targetRow[q1Key as "q1" | "q2" | "q3" | "q4"] - targetRow[q2Key as "q1" | "q2" | "q3" | "q4"]);
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

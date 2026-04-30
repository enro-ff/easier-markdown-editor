import { test, expect } from "@playwright/test";

test("has title", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/easier-markdown-editor/);
});

test("header has correct text", async ({ page }) => {
  await page.goto("/");

  const header = page.locator("header div").first();
  await expect(header).toContainText("Easier Markdown Editor");
});

test("footer has correct text", async ({ page }) => {
  await page.goto("/");

  const footer = page.locator("footer");
  await expect(footer).toContainText(
    /Easier Markdown Editor ©\d{4} Created by ffxd/,
  );
});

test("sync scroll between code and preview", async ({ page }) => {
  await page.goto("/");

  // Setup CLS observer
  await page.evaluate(() => {
    (window as unknown as { clsValue: number }).clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as unknown as {
          hadRecentInput?: boolean;
          value?: number;
        };
        if (!layoutShift.hadRecentInput) {
          (window as unknown as { clsValue: number }).clsValue +=
            layoutShift.value ?? 0;
        }
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });
  });

  const largeMarkdown = Array.from(
    { length: 500 },
    (_, i) => `Line ${i + 1}`,
  ).join("\n\n");

  // Find the code editor and insert text
  const codeEditor = page.locator(".code-panel .cm-content");
  await codeEditor.click();
  await page.keyboard.insertText(largeMarkdown);

  // Wait for the preview to update
  const codeScroller = page.locator(".code-panel .cm-scroller");
  const previewScroller = page.locator(".preview-panel .cm-scroller");

  // Scroll the code editor
  await codeScroller.evaluate((el) => {
    el.scrollTop = 2000;
  });

  // Wait for sync scroll (requestAnimationFrame)
  await page.waitForTimeout(500);

  // Get scroll positions and CLS
  const codeScrollTop = await codeScroller.evaluate((el) => el.scrollTop);
  const previewScrollTop = await previewScroller.evaluate((el) => el.scrollTop);
  const clsValue = await page.evaluate(
    () => (window as unknown as { clsValue?: number }).clsValue ?? 0,
  );

  console.log(`Code ScrollTop: ${codeScrollTop}`);
  console.log(`Preview ScrollTop: ${previewScrollTop}`);
  console.log(`CLS: ${clsValue}`);

  // Report to Playwright
  test.info().annotations.push({
    type: "Scroll Metrics",
    description: `Code: ${codeScrollTop}, Preview: ${previewScrollTop}, CLS: ${clsValue}`,
  });

  // Assert both have scrolled
  expect(codeScrollTop).toBeGreaterThan(0);
  expect(previewScrollTop).toBeGreaterThan(0);
});

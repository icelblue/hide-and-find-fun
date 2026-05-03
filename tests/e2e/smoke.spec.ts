import { test, expect } from "@playwright/test";

// Smoke tests E2E — fluxos crítics que mai han de trencar-se.
// Si algun falla, NO marcar el canvi com a fet.

test("auth page carrega", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.locator("body")).toBeVisible();
});

test("redirecció a /auth si no autenticat", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL(/\/auth/, { timeout: 10000 });
  expect(page.url()).toContain("/auth");
});

test("not-found 404 page funciona", async ({ page }) => {
  await page.goto("/aquesta-ruta-no-existeix");
  await expect(page.locator("body")).toBeVisible();
});

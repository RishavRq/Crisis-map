import { test, expect } from '@playwright/test';

test.describe('Crisis Map E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the public map
    await page.goto('http://localhost:5173');
  });

  test('should submit a report and verify it appears in dashboard', async ({ page, context }) => {
    // 1. Submit a report from the public map
    await page.click('#fab-report');
    
    // Wait for modal to appear
    const modal = page.locator('#report-modal');
    await expect(modal).toBeVisible();

    // Fill the form
    await page.fill('#report-title', 'E2E Test Industrial Fire');
    await page.fill('#report-desc', 'This is an automated E2E test report.');
    await page.selectOption('#report-type', 'industrial');
    await page.selectOption('#report-severity', 'critical');
    await page.fill('#report-location', 'E2E Test City');
    
    // Submit
    await page.click('#report-submit');
    
    // Verify modal closes
    await expect(modal).not.toBeVisible();
    
    // 2. Open dashboard in a new tab to verify
    const dashboardPage = await context.newPage();
    await dashboardPage.goto('http://localhost:5173/dashboard');
    
    // The incident should appear in the queue
    const incidentCard = dashboardPage.locator('.incident-card', { hasText: 'E2E Test Industrial Fire' }).first();
    await expect(incidentCard).toBeVisible({ timeout: 10000 });
    
    // Verify it's unverified and critical
    await expect(incidentCard.locator('.status-badge')).toContainText('Unverified', { ignoreCase: true });
    await expect(incidentCard.locator('.incident-card__severity')).toContainText('Critical', { ignoreCase: true });
    
    // Verify it appears in the live feed
    const liveFeedItem = dashboardPage.locator('.live-feed__item', { hasText: 'User submitted critical industrial report from E2E Test City' }).first();
    await expect(liveFeedItem).toBeVisible();
    
    // 3. Dispatch the unit
    await incidentCard.locator('button', { hasText: 'Dispatch Unit' }).click();
    
    // Verify status changed
    await expect(incidentCard.locator('.status-badge')).toContainText('DISPATCHED', { ignoreCase: true });
    
    // Verify live feed updated
    const liveFeedUpdate = dashboardPage.locator('.live-feed__item', { hasText: 'status changed to DISPATCHED' }).first();
    await expect(liveFeedUpdate).toBeVisible();
  });
});

// tests/e2e/basic.test.js
import { test, expect } from '@playwright/test';

test('app starts and renders something', async ({ page }) => {
  // Start the app and navigate to it
  await page.goto('http://localhost:5173/');

  // Take a screenshot to see what's rendered
  await page.screenshot({ path: 'tests/e2e/screenshots/app-start.png' });

  // Check if there's any content on the page
  const body = await page.locator('body');
  const bodyText = await body.textContent();

  // Log what we found for debugging
  console.log('Body text content:', bodyText);

  // Verify that the body has some content
  expect(bodyText?.length).toBeGreaterThan(0);
});

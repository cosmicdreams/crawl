import { extractAnimations } from '../../src/cli/extractors/animations-extractor.js';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

describe('extract-animations.js', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  test('extractAnimations should extract animation styles from a page', async () => {
    await page.setContent('<button style="animation: fadeIn 2s ease-in-out;">Test</button>');
    const result = await extractAnimations(page);

    expect(result.keyframes.complete).toContain('2s ease-in-out 0s 1 normal none running fadeIn');
  });

  test('extractAnimations should handle pages with no animations gracefully', async () => {
    await page.setContent('<div>No animations here</div>');
    const result = await extractAnimations(page);

    expect(result.keyframes.durations).toEqual([]);
    expect(result.keyframes.timingFunctions).toEqual([]);
    expect(result.transitions.durations).toEqual([]);
  });

  test('extractAnimations should handle transitions', async () => {
    await page.setContent('<button style="transition: all 0.3s ease;">Test</button>');
    const result = await extractAnimations(page);

    expect(result.transitions.durations).toContain('0.3s');
    expect(result.transitions.properties).toContain('all');
  });
});
/**
 * Page utilities for the site crawler
 */
import { isFileUrl } from './url-utils.js';

/**
 * Extract body classes from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Promise<string[]>} - Array of body class names
 */
async function extractBodyClasses(page) {
  try {
    return await page.evaluate(() => {
      const body = document.querySelector('body');
      if (!body || !body.className) {
        return [];
      }
      // Split className string by whitespace and filter out empty strings
      return body.className.split(/\s+/).filter(cls => cls.trim().length > 0);
    });
  } catch (error) {
    console.error(`Body class extraction error: ${error.message}`);
    return [];
  }
}

/**
 * Extract links from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Promise<string[]>} - Array of links
 */
async function extractLinks(page) {
  try {
    // Get all links from the page
    const allLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      return links
        .map(link => link.href)
        .filter(href =>
          href &&
          href.trim() !== '' &&
          !href.startsWith('javascript:') &&
          !href.startsWith('mailto:') &&
          !href.startsWith('tel:'),
        );
    });

    // Further filter out file URLs on the Node.js side
    return allLinks.filter(url => !isFileUrl(url));
  } catch (error) {
    console.error(`Link extraction error: ${error.message}`);
    return [];
  }
}

/**
 * Extract page title
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Promise<string>} - Page title
 */
async function extractPageTitle(page) {
  try {
    return await page.title();
  } catch (error) {
    console.error(`Title extraction error: ${error.message}`);
    return 'ERROR-EXTRACTING-TITLE';
  }
}

/**
 * Extract meta description
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Promise<string>} - Meta description
 */
async function extractMetaDescription(page) {
  try {
    return await page.evaluate(() => {
      const metaDesc = document.querySelector('meta[name="description"]');
      return metaDesc ? metaDesc.getAttribute('content') : '';
    });
  } catch (error) {
    console.error(`Meta description extraction error: ${error.message}`);
    return '';
  }
}

/**
 * Extracts paragraph templates from the page's HTML comments
 * @param {import('playwright').Page} page - The Playwright page
 * @param {string[]} entity_types - Array of entity types to filter for (default: ["paragraph"])
 * @returns {Promise<string[]>} - Array of paragraph templates
 */
async function extractParagraphTemplates(page, entity_types = ['paragraph']) {
  try {
    return await page.evaluate((entityTypes) => {
      const paragraphTemplates = [];
      const htmlContent = document.documentElement.outerHTML;

      // Find all FILE NAME SUGGESTIONS blocks
      const regex = /<!-- FILE NAME SUGGESTIONS:[\s\S]*?-->/g;
      const matches = htmlContent.match(regex) || [];

      matches.forEach(match => {
        // Find the selected template (marked with ✅)
        const selectedLine = match.split('\n').find(line => line.includes('✅'));
        if (selectedLine) {
          // Extract the template name
          const templateMatch = selectedLine.match(/✅\s+([^.]+\.html\.twig)/);
          if (templateMatch && templateMatch[1]) {
            const templateName = templateMatch[1];

            // Only include templates that match the specified entity types
            const isMatchingEntityType = entityTypes.some(entityType =>
              templateName.startsWith(entityType + '--') ||
              templateName === entityType + '.html.twig',
            );

            if (isMatchingEntityType) {
              paragraphTemplates.push(templateName);
            }
          }
        }
      });

      return paragraphTemplates;
    }, entity_types);
  } catch (error) {
    console.error('Error extracting paragraph templates:', error);
    return [];
  }
}

/**
 * Extracts SDC components from the page's HTML comments
 * @param {import('playwright').Page} page - The Playwright page
 * @returns {Promise<string[]>} - Array of component identifiers
 */
async function extractComponents(page) {
  try {
    return await page.evaluate(() => {
      const components = [];
      const htmlContent = document.documentElement.outerHTML;

      // Find all component start markers
      const regex = /<!-- 🥞 Component start: ([^>]+) -->/g;
      let match;

      while ((match = regex.exec(htmlContent)) !== null) {
        if (match[1]) {
          components.push(match[1]);
        }
      }

      return components;
    });
  } catch (error) {
    console.error('Error extracting components:', error);
    return [];
  }
}

/**
 * Checks if the page is closed or invalid
 * @param {import('playwright').Page} page - The page to check
 * @returns {Promise<boolean>} - true if invalid, false if valid
 */
async function isPageInvalid(page) {
  try {
    // Try a simple operation on the page
    await page.evaluate(() => document.title);
    return false; // Page is valid
  } catch (error) {
    console.log(`Page appears to be invalid: ${error.message}`);
    return true; // Page is invalid
  }
}

export {
  extractBodyClasses,
  extractLinks,
  extractPageTitle,
  extractMetaDescription,
  extractParagraphTemplates,
  extractComponents,
  isPageInvalid,
};

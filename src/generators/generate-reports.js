
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { localCrawlConfig } from '../crawler/site-crawler.js';
import { defaultConfig as typographyConfig } from '../extractors/extract-typography.js';
import { defaultConfig as colorsConfig } from '../extractors/extract-colors.js';
import { defaultConfig as spacingConfig } from '../extractors/extract-spacing.js';
import { defaultConfig as bordersConfig } from '../extractors/extract-borders.js';
import { defaultConfig as animationsConfig } from '../extractors/extract-animations.js';


/**
 * Generate HTML reports for the design system
 */

// Configuration
const config = {
  // Input files
  inputFiles: {
    crawlResults: localCrawlConfig.outputFile,
    typography: typographyConfig.outputFile,
    colors: colorsConfig.outputFile,
    spacing: spacingConfig.outputFile,
    borders: bordersConfig.outputFile,
    animations: animationsConfig.outputFile,
  },

  // Output files
  outputFiles: {
    crawlReport: path.join(__dirname, '../../results/reports/crawl-report.html'),
    designSystemReport: path.join(__dirname, '../../results/reports/design-system-report.html')
  },

  // Screenshots directory
  screenshotsDir: path.join(__dirname, '../../results/screenshots')
};

/**
 * Generate a crawl report
 */
function generateCrawlReport() {
  console.log('Generating crawl report...');

  // Check if crawl results exist
  if (!fs.existsSync(config.inputFiles.crawlResults)) {
    console.warn(`Crawl results not found: ${config.inputFiles.crawlResults}`);
    return;
  }

  // Load crawl results
  const crawlResults = JSON.parse(fs.readFileSync(config.inputFiles.crawlResults, 'utf8'));

  // Generate HTML
  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Crawl Report</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        h1, h2, h3 {
          color: #2c3e50;
        }
        .summary {
          background-color: #f8f9fa;
          border-radius: 5px;
          padding: 20px;
          margin-bottom: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th, td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f8f9fa;
          font-weight: 600;
        }
        tr:hover {
          background-color: #f8f9fa;
        }
        .status-200 { color: #28a745; }
        .status-404 { color: #dc3545; }
        .status-other { color: #ffc107; }
        .pagination {
          display: flex;
          justify-content: center;
          margin-top: 20px;
        }
        .pagination button {
          background-color: #f8f9fa;
          border: 1px solid #ddd;
          padding: 8px 16px;
          margin: 0 5px;
          cursor: pointer;
          border-radius: 4px;
        }
        .pagination button:hover {
          background-color: #e9ecef;
        }
        .search {
          margin-bottom: 20px;
        }
        .search input {
          padding: 8px;
          width: 300px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <h1>Crawl Report</h1>

      <div class="summary">
        <h2>Summary</h2>
        <p><strong>Base URL:</strong> ${crawlResults.baseUrl}</p>
        <p><strong>Pages Crawled:</strong> ${crawlResults.crawledPages.length}</p>
        <p><strong>Start Time:</strong> ${new Date(crawlResults.startTime).toLocaleString()}</p>
        <p><strong>End Time:</strong> ${new Date(crawlResults.endTime).toLocaleString()}</p>
        <p><strong>Duration:</strong> ${Math.round((crawlResults.endTime - crawlResults.startTime) / 1000)} seconds</p>

        <h3>Status Codes</h3>
        <ul>
          ${Object.entries(crawlResults.statusCounts || {}).map(([status, count]) => `
            <li><strong>${status}:</strong> ${count}</li>
          `).join('')}
        </ul>
      </div>

      <h2>Crawled Pages</h2>

      <div class="search">
        <input type="text" id="searchInput" placeholder="Search URLs...">
      </div>

      <table id="pagesTable">
        <thead>
          <tr>
            <th>#</th>
            <th>URL</th>
            <th>Title</th>
            <th>Status</th>
            <th>Content Type</th>
          </tr>
        </thead>
        <tbody>
          ${crawlResults.crawledPages.map((page, index) => `
            <tr>
              <td>${index + 1}</td>
              <td><a href="${page.url}" target="_blank">${page.url}</a></td>
              <td>${page.title || '-'}</td>
              <td class="status-${page.status === 200 ? '200' : page.status === 404 ? '404' : 'other'}">${page.status}</td>
              <td>${page.contentType || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <script>
        // Simple search functionality
        document.getElementById('searchInput').addEventListener('input', function() {
          const searchTerm = this.value.toLowerCase();
          const rows = document.querySelectorAll('#pagesTable tbody tr');

          rows.forEach(row => {
            const url = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            const title = row.querySelector('td:nth-child(3)').textContent.toLowerCase();

            if (url.includes(searchTerm) || title.includes(searchTerm)) {
              row.style.display = '';
            } else {
              row.style.display = 'none';
            }
          });
        });
      </script>
    </body>
    </html>
  `;

  // Write HTML file
  fs.writeFileSync(config.outputFiles.crawlReport, html);
  console.log(`Crawl report saved to: ${config.outputFiles.crawlReport}`);
}

/**
 * Generate a design system report
 */
function generateDesignSystemReport() {
  console.log('Generating design system report...');

  // Load analysis results
  const data = {
    typography: fs.existsSync(config.inputFiles.typography) ?
      JSON.parse(fs.readFileSync(config.inputFiles.typography, 'utf8')) : null,
    colors: fs.existsSync(config.inputFiles.colors) ?
      JSON.parse(fs.readFileSync(config.inputFiles.colors, 'utf8')) : null,
    spacing: fs.existsSync(config.inputFiles.spacing) ?
      JSON.parse(fs.readFileSync(config.inputFiles.spacing, 'utf8')) : null,
    borders: fs.existsSync(config.inputFiles.borders) ?
      JSON.parse(fs.readFileSync(config.inputFiles.borders, 'utf8')) : null,
    animations: fs.existsSync(config.inputFiles.animations) ?
      JSON.parse(fs.readFileSync(config.inputFiles.animations, 'utf8')) : null
  };

  // Generate HTML
  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Design System Report</title>
      <style>
        :root {
          --color-primary: #6200ee;
          --color-primary-dark: #3700b3;
          --color-secondary: #03dac6;
          --color-background: #ffffff;
          --color-surface: #ffffff;
          --color-error: #b00020;
          --color-text-primary: #000000;
          --color-text-secondary: #666666;
          --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }

        body {
          font-family: var(--font-family-base);
          line-height: 1.6;
          color: var(--color-text-primary);
          background-color: var(--color-background);
          margin: 0;
          padding: 0;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        header {
          background-color: var(--color-primary);
          color: white;
          padding: 20px 0;
          margin-bottom: 40px;
        }

        header .container {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        nav ul {
          display: flex;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        nav li {
          margin-left: 20px;
        }

        nav a {
          color: white;
          text-decoration: none;
          font-weight: 500;
        }

        h1, h2, h3, h4 {
          color: var(--color-primary-dark);
          margin-top: 2em;
          margin-bottom: 0.5em;
        }

        h1 {
          font-size: 2.5rem;
          margin-top: 0;
        }

        h2 {
          font-size: 2rem;
          border-bottom: 1px solid #eee;
          padding-bottom: 0.3em;
        }

        h3 {
          font-size: 1.5rem;
        }

        section {
          margin-bottom: 60px;
        }

        .card {
          background-color: var(--color-surface);
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          padding: 20px;
          margin-bottom: 20px;
        }

        .color-grid, .spacing-grid, .border-grid, .shadow-grid, .typography-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .color-swatch {
          height: 100px;
          border-radius: 8px;
          display: flex;
          align-items: flex-end;
          position: relative;
          overflow: hidden;
        }

        .color-swatch-info {
          background-color: rgba(255, 255, 255, 0.9);
          width: 100%;
          padding: 10px;
          font-size: 0.9rem;
        }

        .spacing-item {
          height: 40px;
          background-color: var(--color-primary);
          border-radius: 4px;
        }

        .border-radius-item {
          height: 100px;
          background-color: var(--color-primary);
        }

        .border-width-item {
          height: 100px;
          background-color: #f5f5f5;
          border-style: solid;
          border-color: var(--color-primary);
        }

        .shadow-item {
          height: 100px;
          background-color: white;
          border-radius: 8px;
        }

        .type-scale-item {
          margin-bottom: 20px;
        }

        .type-scale-label {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          margin-bottom: 5px;
        }

        footer {
          background-color: #f5f5f5;
          padding: 40px 0;
          margin-top: 60px;
          text-align: center;
          color: var(--color-text-secondary);
        }

        .tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }

        .tab {
          padding: 10px 20px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
        }

        .tab.active {
          border-bottom-color: var(--color-primary);
          color: var(--color-primary);
        }

        .tab-content {
          display: none;
        }

        .tab-content.active {
          display: block;
        }
      </style>
    </head>
    <body>
      <header>
        <div class="container">
          <h1>Design System</h1>
          <nav>
            <ul>
              <li><a href="#typography">Typography</a></li>
              <li><a href="#colors">Colors</a></li>
              <li><a href="#spacing">Spacing</a></li>
              <li><a href="#borders">Borders</a></li>
              <li><a href="#animations">Animations</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <div class="container">
        <section id="typography">
          <h2>Typography</h2>

          ${data.typography ? `
            <div class="card">
              <h3>Font Families</h3>
              <div class="typography-grid">
                ${data.typography.allFontFamilies ? data.typography.allFontFamilies.map(family => `
                  <div>
                    <div class="type-scale-label">Font Family</div>
                    <div style="font-family: ${family}; font-size: 1.5rem;">${family}</div>
                    <div class="type-scale-label">Sample Text</div>
                    <div style="font-family: ${family};">The quick brown fox jumps over the lazy dog.</div>
                    ${data.typography.fontFamilySelectors && data.typography.fontFamilySelectors[family] ? `
                      <div class="type-scale-selectors">
                        <div class="type-scale-label">Used by:</div>
                        <div style="font-size: 0.9rem; color: var(--color-text-secondary);">
                          ${data.typography.fontFamilySelectors[family].join(', ')}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                `).join('') : '<p>No font families found.</p>'}
              </div>
            </div>

            <div class="card">
              <h3>Font Sizes</h3>
              <div>
                ${data.typography.allFontSizes ? data.typography.allFontSizes.sort((a, b) => parseFloat(a) - parseFloat(b)).map(size => `
                  <div class="type-scale-item">
                    <div class="type-scale-label">${size}</div>
                    <div style="font-size: ${size};">The quick brown fox jumps over the lazy dog.</div>
                    ${data.typography.fontSizeSelectors && data.typography.fontSizeSelectors[size] ? `
                      <div class="type-scale-selectors">
                        <div class="type-scale-label">Used by:</div>
                        <div style="font-size: 0.9rem; color: var(--color-text-secondary);">
                          ${data.typography.fontSizeSelectors[size].join(', ')}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                `).join('') : '<p>No font sizes found.</p>'}
              </div>
            </div>

            <div class="card">
              <h3>Font Weights</h3>
              <div class="typography-grid">
                ${data.typography.allFontWeights ? data.typography.allFontWeights.sort((a, b) => parseFloat(a) - parseFloat(b)).map(weight => `
                  <div>
                    <div class="type-scale-label">${weight}</div>
                    <div style="font-weight: ${weight}; font-size: 1.2rem;">The quick brown fox jumps over the lazy dog.</div>
                    ${data.typography.fontWeightSelectors && data.typography.fontWeightSelectors[weight] ? `
                      <div class="type-scale-selectors">
                        <div class="type-scale-label">Used by:</div>
                        <div style="font-size: 0.9rem; color: var(--color-text-secondary);">
                          ${data.typography.fontWeightSelectors[weight].join(', ')}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                `).join('') : '<p>No font weights found.</p>'}
              </div>
            </div>

            <div class="card">
              <h3>Line Heights</h3>
              <div class="typography-grid">
                ${data.typography.allLineHeights ? data.typography.allLineHeights.sort((a, b) => parseFloat(a) - parseFloat(b)).map(lineHeight => `
                  <div>
                    <div class="type-scale-label">${lineHeight}</div>
                    <div style="line-height: ${lineHeight}; border: 1px dashed #ccc; padding: 10px;">
                      The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.
                      The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.
                    </div>
                    ${data.typography.lineHeightSelectors && data.typography.lineHeightSelectors[lineHeight] ? `
                      <div class="type-scale-selectors">
                        <div class="type-scale-label">Used by:</div>
                        <div style="font-size: 0.9rem; color: var(--color-text-secondary);">
                          ${data.typography.lineHeightSelectors[lineHeight].join(', ')}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                `).join('') : '<p>No line heights found.</p>'}
              </div>
            </div>
          ` : '<p>No typography data available.</p>'}
        </section>

        <section id="colors">
          <h2>Colors</h2>

          ${data.colors ? `
            <div class="card">
              <h3>Color Palette</h3>
              <div class="tabs">
                <div class="tab active" data-tab="all-colors">All Colors</div>
                <div class="tab" data-tab="hex-colors">Hex Colors</div>
                <div class="tab" data-tab="rgb-colors">RGB Colors</div>
              </div>

              <div class="tab-content active" id="all-colors">
                <div class="color-grid">
                  ${data.colors.allColorValues ? data.colors.allColorValues.map(color => `
                    <div>
                      <div class="color-swatch" style="background-color: ${color};">
                        <div class="color-swatch-info">${color}</div>
                      </div>
                    </div>
                  `).join('') : '<p>No colors found.</p>'}
                </div>
              </div>

              <div class="tab-content" id="hex-colors">
                <div class="color-grid">
                  ${data.colors.groupedColors && data.colors.groupedColors.hex ? data.colors.groupedColors.hex.map(color => `
                    <div>
                      <div class="color-swatch" style="background-color: ${color};">
                        <div class="color-swatch-info">${color}</div>
                      </div>
                    </div>
                  `).join('') : '<p>No hex colors found.</p>'}
                </div>
              </div>

              <div class="tab-content" id="rgb-colors">
                <div class="color-grid">
                  ${data.colors.groupedColors && data.colors.groupedColors.rgb ? data.colors.groupedColors.rgb.map(color => `
                    <div>
                      <div class="color-swatch" style="background-color: ${color};">
                        <div class="color-swatch-info">${color}</div>
                      </div>
                    </div>
                  `).join('') : '<p>No RGB colors found.</p>'}
                </div>
              </div>
            </div>
          ` : '<p>No color data available.</p>'}
        </section>

        <section id="spacing">
          <h2>Spacing</h2>

          ${data.spacing ? `
            <div class="card">
              <h3>Spacing Scale</h3>
              <div>
                ${data.spacing.allSpacingValues ? data.spacing.allSpacingValues.filter(value => value.endsWith('px')).sort((a, b) => parseFloat(a) - parseFloat(b)).map(spacing => `
                  <div style="margin-bottom: 15px;">
                    <div style="display: flex; align-items: center;">
                      <div style="width: 100px; font-family: monospace;">${spacing}</div>
                      <div class="spacing-item" style="width: ${spacing};"></div>
                    </div>
                  </div>
                `).join('') : '<p>No spacing values found.</p>'}
              </div>
            </div>
          ` : '<p>No spacing data available.</p>'}
        </section>

        <section id="borders">
          <h2>Borders & Shadows</h2>

          ${data.borders ? `
            <div class="card">
              <h3>Border Widths</h3>
              <div class="border-grid">
                ${data.borders.allBorderWidths ? data.borders.allBorderWidths.sort((a, b) => parseFloat(a) - parseFloat(b)).map(width => `
                  <div>
                    <div class="border-width-item" style="border-width: ${width};"></div>
                    <div style="text-align: center; margin-top: 10px;">${width}</div>
                  </div>
                `).join('') : '<p>No border widths found.</p>'}
              </div>
            </div>

            <div class="card">
              <h3>Border Radii</h3>
              <div class="border-grid">
                ${data.borders.allBorderRadii ? data.borders.allBorderRadii.sort((a, b) => parseFloat(a) - parseFloat(b)).map(radius => `
                  <div>
                    <div class="border-radius-item" style="border-radius: ${radius};"></div>
                    <div style="text-align: center; margin-top: 10px;">${radius}</div>
                  </div>
                `).join('') : '<p>No border radii found.</p>'}
              </div>
            </div>

            <div class="card">
              <h3>Shadows</h3>
              <div class="shadow-grid">
                ${data.borders.allShadows ? data.borders.allShadows.map((shadow, index) => `
                  <div>
                    <div class="shadow-item" style="box-shadow: ${shadow};">Shadow ${index + 1}</div>
                    <div style="text-align: center; margin-top: 10px; font-size: 0.8rem; word-break: break-all;">${shadow}</div>
                  </div>
                `).join('') : '<p>No shadows found.</p>'}
              </div>
            </div>
          ` : '<p>No border data available.</p>'}
        </section>

        <section id="animations">
          <h2>Animations</h2>

          ${data.animations ? `
            <div class="card">
              <h3>Durations</h3>
              <div>
                ${data.animations.allDurations ? data.animations.allDurations.sort((a, b) => parseFloat(a) - parseFloat(b)).map(duration => `
                  <div style="margin-bottom: 10px;">
                    <div style="font-family: monospace;">${duration}</div>
                    <div style="height: 20px; background-color: var(--color-primary); width: 100px; transition: width ${duration} ease-in-out;"
                         onmouseover="this.style.width='200px'"
                         onmouseout="this.style.width='100px'">
                    </div>
                  </div>
                `).join('') : '<p>No durations found.</p>'}
              </div>
            </div>

            <div class="card">
              <h3>Timing Functions</h3>
              <div class="animation-grid">
                ${data.animations.allTimingFunctions ? data.animations.allTimingFunctions.map(timing => `
                  <div style="margin-bottom: 20px;">
                    <div style="font-family: monospace;">${timing}</div>
                    <div style="height: 20px; background-color: var(--color-primary); width: 100px; transition: width 1s ${timing};"
                         onmouseover="this.style.width='200px'"
                         onmouseout="this.style.width='100px'">
                    </div>
                  </div>
                `).join('') : '<p>No timing functions found.</p>'}
              </div>
            </div>
          ` : '<p>No animation data available.</p>'}
        </section>
      </div>

      <footer>
        <div class="container">
          <p>Generated by Design Token Extractor</p>
        </div>
      </footer>

      <script>
        // Tab functionality
        document.querySelectorAll('.tab').forEach(tab => {
          tab.addEventListener('click', () => {
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');

            // Hide all tab content
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            // Show content for clicked tab
            document.getElementById(tab.dataset.tab).classList.add('active');
          });
        });
      </script>
    </body>
    </html>
  `;

  // Write HTML file
  fs.writeFileSync(config.outputFiles.designSystemReport, html);
  console.log(`Design system report saved to: ${config.outputFiles.designSystemReport}`);
}

/**
 * Main function to generate reports
 */
async function generateReports() {
  console.log('Starting report generation...');

  // Create output directory if it doesn't exist
  const reportsDir = path.dirname(config.outputFiles.crawlReport);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Generate crawl report
  generateCrawlReport();

  // Generate design system report
  generateDesignSystemReport();

  console.log('Report generation completed!');
}

// If this script is run directly, execute the report generation
if (import.meta.url === new URL(import.meta.url).href) {
  generateReports().catch(error => {
    console.error('Report generation failed:', error);
    process.exitCode = 1;
  });
}

// Export default as an object containing all functions
export default {
  generateCrawlReport,
  generateDesignSystemReport,
  generateReports
};

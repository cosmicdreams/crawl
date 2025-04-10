/**
 * Component Extractor Module
 *
 * Identifies and extracts components from HTML pages for analysis and documentation.
 * Designed to work with the site crawler to build a component library.
 */

const fs = require('fs');
const path = require('path');

/**
 * Component selectors to look for
 * These are common patterns used in Drupal and other CMS systems
 */
const COMPONENT_SELECTORS = [
  // Drupal paragraphs and blocks
  '[data-block-plugin-id]',
  '.paragraph',
  '.paragraph--type--*',
  '.block',
  '.block-*',

  // Drupal views
  '.view',
  '.view-*',

  // Drupal regions
  '.region',
  '.region-*',

  // Common component patterns
  '.component',
  '.component-*',
  '[data-component]',

  // Site Studio specific
  '.coh-container',
  '.coh-component',
  '.coh-style-*',

  // Bootstrap components (if used)
  '.card',
  '.navbar',
  '.carousel',
  '.accordion',

  // Common UI patterns
  '.modal',
  '.tabs',
  '.slider',
  '.gallery',
  '.hero',
  '.banner',
  '.footer',
  '.header',
  '.menu',
  '.nav',
  '.sidebar',
  '.form',
  '.button',
  '.alert',
  '.notification'
];

/**
 * Extract components from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {Object} config - Configuration object
 * @returns {Promise<Array>} - Array of components found on the page
 */
async function extractComponents(page, config) {
  // Convert our selector list to a format that can be used in the browser
  const selectorList = JSON.stringify(COMPONENT_SELECTORS);
  const twigDebugMode = config && config.twigDebugMode === true;

  return page.evaluate((params) => {
    const { selectors, twigDebugMode } = params;
    const components = [];
    const parsedSelectors = JSON.parse(selectors);

    // Helper function to get computed styles for an element
    const getComputedStyleProperties = (element) => {
      const styles = window.getComputedStyle(element);
      const relevantStyles = {};

      // Extract relevant CSS properties
      const cssProperties = [
        'color', 'background-color', 'font-family', 'font-size', 'font-weight',
        'margin', 'padding', 'border', 'border-radius', 'box-shadow',
        'display', 'position', 'width', 'height', 'max-width', 'max-height'
      ];

      cssProperties.forEach(prop => {
        relevantStyles[prop] = styles.getPropertyValue(prop);
      });

      return relevantStyles;
    };

    // Helper function to get scripts that might be related to this component
    const getRelatedScripts = (element) => {
      // Look for script tags with IDs or classes that match component patterns
      const scripts = [];
      const elementClasses = Array.from(element.classList);
      const elementId = element.id;

      // Check for inline scripts that target this element
      document.querySelectorAll('script:not([src])').forEach(script => {
        const content = script.textContent;
        if (elementId && content.includes(`#${elementId}`)) {
          scripts.push({
            type: 'inline',
            content: content,
            targetSelector: `#${elementId}`
          });
        }

        elementClasses.forEach(className => {
          if (content.includes(`.${className}`)) {
            scripts.push({
              type: 'inline',
              content: content,
              targetSelector: `.${className}`
            });
          }
        });
      });

      return scripts;
    };

    // If Twig debug mode is enabled, extract components from HTML comments
    if (twigDebugMode) {
      // Get all comment nodes in the document
      const iterator = document.createNodeIterator(
        document.documentElement,
        NodeFilter.SHOW_COMMENT,
        { acceptNode: node => NodeFilter.FILTER_ACCEPT }
      );

      let commentNode;
      let currentComponent = null;
      let templateInfo = null;

      // Iterate through all comment nodes
      while (commentNode = iterator.nextNode()) {
        const commentText = commentNode.textContent.trim();

        // Check if this is a Twig debug comment
        if (commentText === 'THEME DEBUG') {
          // Start of a new component debug section
          currentComponent = {
            twigDebug: true,
            themeHook: null,
            templateSuggestions: [],
            templateUsed: null,
            element: null
          };
        }
        // Check for theme hook information
        else if (commentText.startsWith('THEME HOOK:') && currentComponent) {
          const hookMatch = commentText.match(/THEME HOOK: '([^']+)'/);
          if (hookMatch && hookMatch[1]) {
            currentComponent.themeHook = hookMatch[1];
          }
        }
        // Check for file name suggestions
        else if (commentText.startsWith('FILE NAME SUGGESTIONS:') && currentComponent) {
          // This comment is followed by multiple lines of suggestions
          // We'll capture them in the next iterations
        }
        // Check for template suggestions
        else if ((commentText.includes('✅') || commentText.includes('▪️')) && currentComponent) {
          const template = commentText.replace(/[✅▪️]/g, '').trim();
          currentComponent.templateSuggestions.push(template);
        }
        // Check for the beginning of template output
        else if (commentText.includes('BEGIN') && commentText.includes('TEMPLATE OUTPUT from') && currentComponent) {
          const templateMatch = commentText.match(/from '([^']+)'/);
          if (templateMatch && templateMatch[1]) {
            currentComponent.templateUsed = templateMatch[1];

            // Find the next element after this comment
            let nextElement = commentNode.nextSibling;
            while (nextElement && (nextElement.nodeType === 3 || nextElement.nodeType === 8)) {
              nextElement = nextElement.nextSibling;
            }

            if (nextElement && nextElement.nodeType === 1) {
              currentComponent.element = nextElement;

              // Extract component information
              const component = extractComponentInfo(nextElement);
              if (component) {
                // Add Twig debug information
                component.twigDebug = true;
                component.themeHook = currentComponent.themeHook;
                component.templateSuggestions = currentComponent.templateSuggestions;
                component.templateUsed = currentComponent.templateUsed;

                // Update component type based on theme hook
                if (currentComponent.themeHook) {
                  component.type = currentComponent.themeHook;

                  // For paragraphs, extract the bundle type from the template
                  if (currentComponent.themeHook === 'paragraph' && currentComponent.templateUsed) {
                    const templateParts = currentComponent.templateUsed.split('/');
                    const templateFile = templateParts[templateParts.length - 1];
                    const matches = templateFile.match(/paragraph--([^-]+)/);
                    if (matches && matches[1]) {
                      component.paragraphType = matches[1];
                      component.type = `paragraph:${matches[1]}`;
                    }
                  }
                }

                components.push(component);
              }
            }

            // Reset current component
            currentComponent = null;
          }
        }
      }
    }

    // Process each selector for traditional component detection
    parsedSelectors.forEach(selector => {
      // Handle wildcard selectors
      if (selector.includes('*')) {
        const prefix = selector.split('*')[0];
        // Find all elements that match the prefix
        document.querySelectorAll(`[class*="${prefix.substring(1)}"]`).forEach(element => {
          // Extract component information
          const component = extractComponentInfo(element);
          if (component) {
            components.push(component);
          }
        });
      } else {
        // Regular selector
        document.querySelectorAll(selector).forEach(element => {
          // Extract component information
          const component = extractComponentInfo(element);
          if (component) {
            components.push(component);
          }
        });
      }
    });

    // Helper function to extract component information
    function extractComponentInfo(element) {
      // Skip if this element is a child of an already identified component
      let parent = element.parentElement;
      while (parent) {
        if (components.some(comp => comp.element === parent)) {
          return null;
        }
        parent = parent.parentElement;
      }

      // Get element attributes
      const attributes = {};
      Array.from(element.attributes).forEach(attr => {
        attributes[attr.name] = attr.value;
      });

      // Get element classes
      const classes = Array.from(element.classList);

      // Get component type based on classes or attributes
      let componentType = 'unknown';

      // Try to determine component type from classes
      if (classes.some(c => c.includes('paragraph--type--'))) {
        componentType = 'paragraph';
        // Extract specific paragraph type
        const typeClass = classes.find(c => c.includes('paragraph--type--'));
        if (typeClass) {
          componentType = typeClass.replace('paragraph--type--', '');
        }
      } else if (classes.some(c => c.includes('block-'))) {
        componentType = 'block';
        // Extract specific block type
        const typeClass = classes.find(c => c.includes('block-'));
        if (typeClass) {
          componentType = typeClass.replace('block-', '');
        }
      } else if (classes.some(c => c.includes('view-'))) {
        componentType = 'view';
        // Extract specific view name
        const typeClass = classes.find(c => c.includes('view-'));
        if (typeClass) {
          componentType = typeClass.replace('view-', '');
        }
      } else if (attributes['data-block-plugin-id']) {
        componentType = attributes['data-block-plugin-id'];
      } else if (classes.some(c => c.includes('coh-'))) {
        componentType = 'site-studio';
        // Extract specific site studio component type
        const typeClass = classes.find(c => c.includes('coh-style-'));
        if (typeClass) {
          componentType = typeClass.replace('coh-style-', '');
        }
      } else if (classes.length > 0) {
        // Use the first meaningful class as the type
        const meaningfulClass = classes.find(c =>
          !['container', 'row', 'col', 'wrapper', 'inner'].includes(c)
        );
        if (meaningfulClass) {
          componentType = meaningfulClass;
        }
      }

      // Get computed styles
      const styles = getComputedStyleProperties(element);

      // Get related scripts
      const scripts = getRelatedScripts(element);

      // Get HTML content (limited to avoid huge objects)
      const htmlContent = element.outerHTML.substring(0, 5000); // Limit to 5000 chars

      // Create component object
      return {
        element, // This will be removed before returning from evaluate
        type: componentType,
        id: element.id || null,
        classes,
        attributes,
        styles,
        scripts,
        html: htmlContent,
        children: element.childElementCount,
        textContent: element.textContent.trim().substring(0, 200) // Limit text content
      };
    }

    // Remove circular references before returning
    return components.map(comp => {
      const { element, ...rest } = comp;
      return rest;
    });
  }, { selectors: selectorList, twigDebugMode });
}

/**
 * Process components from multiple pages and generate a component library
 * @param {Array} pagesData - Array of page data objects with components
 * @returns {Object} - Component library data
 */
function generateComponentLibrary(pagesData) {
  // All unique components by type
  const componentsByType = {};

  // Component usage statistics
  const componentUsage = {};

  // Page type mapping based on body classes
  const pageTypes = {};

  // First pass: categorize pages by body classes
  pagesData.forEach(pageData => {
    const { url, bodyClasses } = pageData;

    if (bodyClasses && Array.isArray(bodyClasses)) {
      // Look for Drupal-specific body classes that indicate page type
      const nodeTypeClass = bodyClasses.find(cls => cls.startsWith('node--type-'));
      const pageTypeClass = bodyClasses.find(cls => cls.startsWith('page-'));
      const pathClass = bodyClasses.find(cls => cls.startsWith('path-'));

      let pageType = 'unknown';

      if (nodeTypeClass) {
        // Extract node type (e.g., 'node--type-article' -> 'article')
        pageType = nodeTypeClass.replace('node--type-', '');
      } else if (pageTypeClass) {
        // Extract page type (e.g., 'page-node-type-article' -> 'article')
        pageType = pageTypeClass.replace('page-', '');
      } else if (pathClass) {
        // Use path as fallback
        pageType = pathClass;
      }

      pageTypes[url] = pageType;
    }
  });

  // Second pass: process components with page type context
  pagesData.forEach(pageData => {
    const { url, components } = pageData;
    const pageType = pageTypes[url] || 'unknown';

    // Skip pages without components
    if (!components || !Array.isArray(components)) return;

    // Process each component
    components.forEach(component => {
      const { type, html, classes, attributes } = component;

      // Create a unique signature for this component
      // Using a combination of type, classes, and page context to identify similar components
      const signature = `${type}:${classes.sort().join(',')}`;

      // Add page type context to the component
      component.pageType = pageType;

      // Track component usage
      if (!componentUsage[signature]) {
        componentUsage[signature] = {
          type,
          count: 0,
          pages: []
        };
      }

      componentUsage[signature].count++;
      componentUsage[signature].pages.push(url);

      // Group by component type
      if (!componentsByType[type]) {
        componentsByType[type] = [];
      }

      // Check if we already have this component
      const existingComponent = componentsByType[type].find(c =>
        c.signature === signature
      );

      if (existingComponent) {
        // Update existing component
        existingComponent.instances.push({
          url,
          html,
          classes,
          attributes
        });
      } else {
        // Add new component
        componentsByType[type].push({
          signature,
          type,
          name: generateComponentName(type, classes, component.instances[0]),
          description: generateComponentDescription(type, classes, attributes, component.instances[0]),
          instances: [{
            url,
            html,
            classes,
            attributes
          }],
          recommendedStructure: generateRecommendedStructure(type, classes, component.instances[0])
        });
      }
    });
  });

  // Group components by page type
  const componentsByPageType = {};

  // Organize components by page type
  Object.entries(pageTypes).forEach(([url, pageType]) => {
    if (!componentsByPageType[pageType]) {
      componentsByPageType[pageType] = [];
    }

    // Find components for this URL
    const pageData = pagesData.find(page => page.url === url);
    if (pageData && pageData.components) {
      componentsByPageType[pageType].push({
        url,
        title: pageData.title,
        componentCount: pageData.components.length
      });
    }
  });

  return {
    types: Object.keys(componentsByType),
    components: componentsByType,
    usage: componentUsage,
    pageTypes: componentsByPageType,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate a human-readable component name
 * @param {string} type - Component type
 * @param {Array} classes - Component classes
 * @param {Object} instance - Component instance with additional data
 * @returns {string} - Component name
 */
function generateComponentName(type, classes, instance) {
  // If this is a Twig component with paragraph type, use that for naming
  if (instance && instance.twigDebug && instance.paragraphType) {
    const paragraphType = instance.paragraphType.replace(/-/g, ' ').replace(/_/g, ' ');
    return paragraphType.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // If this is a Twig component with theme hook, use that for naming
  if (instance && instance.twigDebug && instance.themeHook) {
    const hookName = instance.themeHook.replace(/-/g, ' ').replace(/_/g, ' ');
    return hookName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Try to create a readable name from the type
  let name = type.replace(/-/g, ' ').replace(/_/g, ' ');

  // Capitalize first letter of each word
  name = name.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return name;
}

/**
 * Generate a component description
 * @param {string} type - Component type
 * @param {Array} classes - Component classes
 * @param {Object} attributes - Component attributes
 * @param {Object} instance - Component instance with additional data
 * @returns {string} - Component description
 */
function generateComponentDescription(type, classes, attributes, instance) {
  // If this is a Twig component, create a more detailed description
  if (instance && instance.twigDebug) {
    let description = '';

    if (instance.themeHook === 'paragraph' && instance.paragraphType) {
      description = `A Drupal paragraph of type "${instance.paragraphType}"`;
    } else if (instance.themeHook) {
      description = `A Drupal ${instance.themeHook} component`;
    } else {
      description = `A Drupal component`;
    }

    // Add template information
    if (instance.templateUsed) {
      const templateParts = instance.templateUsed.split('/');
      const templateFile = templateParts[templateParts.length - 1];
      description += ` using the "${templateFile}" template`;
    }

    return description;
  }

  // Default description for non-Twig components
  let description = `A ${type} component`;

  // Add information about data attributes if available
  const dataAttributes = Object.keys(attributes).filter(attr => attr.startsWith('data-'));
  if (dataAttributes.length > 0) {
    description += ` with ${dataAttributes.length} data attributes`;
  }

  return description;
}

/**
 * Generate recommended file structure for Site Studio
 * @param {string} type - Component type
 * @param {Array} classes - Component classes
 * @param {Object} instance - Component instance with additional data
 * @returns {Object} - Recommended structure
 */
function generateRecommendedStructure(type, classes, instance) {
  let baseName;

  // If this is a Twig component, use the template name as a basis
  if (instance && instance.twigDebug) {
    if (instance.themeHook === 'paragraph' && instance.paragraphType) {
      // For paragraphs, use the paragraph type
      baseName = `paragraph_${instance.paragraphType}`;
    } else if (instance.templateUsed) {
      // Extract the template name without extension
      const templateParts = instance.templateUsed.split('/');
      const templateFile = templateParts[templateParts.length - 1];
      baseName = templateFile.replace('.html.twig', '');
    } else if (instance.themeHook) {
      // Use the theme hook
      baseName = instance.themeHook;
    }
  }

  // If no Twig information or couldn't determine a name, fall back to type
  if (!baseName) {
    baseName = type;
  }

  // Convert to a valid filename
  baseName = baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  return {
    html: `${baseName}.html`,
    css: `${baseName}.css`,
    js: `${baseName}.js`,
    json: `${baseName}.json`,
    directory: `components/${baseName}/`
  };
}

/**
 * Save component library to a JSON file
 * @param {Object} componentLibrary - Component library data
 * @param {string} outputPath - Path to save the file
 */
function saveComponentLibrary(componentLibrary, outputPath) {
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write to file
  fs.writeFileSync(outputPath, JSON.stringify(componentLibrary, null, 2));
  console.log(`Component library saved to ${outputPath}`);
}

/**
 * Generate HTML report for the component library
 * @param {Object} componentLibrary - Component library data
 * @param {string} outputPath - Path to save the HTML report
 */
function generateComponentReport(componentLibrary, outputPath) {
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create HTML content
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Library</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3, h4 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    .component {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .component-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .component-name {
      font-size: 1.2em;
      font-weight: bold;
      margin: 0;
    }
    .component-type {
      color: #666;
      font-size: 0.9em;
    }
    .component-description {
      margin-bottom: 15px;
    }
    .component-usage {
      font-size: 0.9em;
      color: #666;
      margin-bottom: 15px;
    }
    .component-structure {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      font-family: monospace;
      margin-bottom: 15px;
    }
    .component-html {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      font-family: monospace;
      white-space: pre-wrap;
      overflow-x: auto;
      max-height: 300px;
      overflow-y: auto;
    }
    .tabs {
      display: flex;
      border-bottom: 1px solid #ddd;
      margin-bottom: 15px;
    }
    .tab {
      padding: 8px 16px;
      cursor: pointer;
      border: 1px solid transparent;
      border-bottom: none;
      margin-bottom: -1px;
    }
    .tab.active {
      border-color: #ddd;
      border-radius: 4px 4px 0 0;
      background-color: white;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    .summary {
      margin-bottom: 30px;
    }
    .summary-item {
      margin-bottom: 10px;
    }
    .component-list {
      list-style: none;
      padding: 0;
    }
    .component-list li {
      margin-bottom: 5px;
    }
    .component-list a {
      text-decoration: none;
      color: #0366d6;
    }
    .component-list a:hover {
      text-decoration: underline;
    }
    .component-twig-info {
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .twig-info-item {
      margin-bottom: 8px;
    }
    .template-suggestions {
      margin-top: 5px;
      padding-left: 20px;
    }
    .page-types {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .page-type {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
    }
    .page-type h3 {
      margin-top: 0;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    .page-type ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .page-type li {
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
    }
    .component-count {
      color: #666;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <h1>Component Library</h1>
  <p>Generated on ${new Date().toLocaleString()}</p>

  <div class="summary">
    <h2>Summary</h2>
    <div class="summary-item">
      <strong>Total Component Types:</strong> ${componentLibrary.types.length}
    </div>
    <div class="summary-item">
      <strong>Total Unique Components:</strong> ${Object.values(componentLibrary.components)
        .reduce((total, components) => total + components.length, 0)}
    </div>
    <div class="summary-item">
      <strong>Page Types:</strong> ${Object.keys(componentLibrary.pageTypes).length}
    </div>
  </div>

  <h2>Page Types</h2>
  <div class="page-types">
    ${Object.entries(componentLibrary.pageTypes).map(([pageType, pages]) => `
      <div class="page-type">
        <h3>${pageType} (${pages.length} pages)</h3>
        <ul>
          ${pages.map(page => `
            <li>
              <a href="${page.url}" target="_blank">${page.title}</a>
              <span class="component-count">${page.componentCount} components</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('')}
  </div>

  <h2>Component Types</h2>
  <ul class="component-list">
    ${componentLibrary.types.map(type => `
      <li><a href="#type-${type}">${type} (${componentLibrary.components[type].length})</a></li>
    `).join('')}
  </ul>

  ${componentLibrary.types.map(type => `
    <h2 id="type-${type}">${type}</h2>
    ${componentLibrary.components[type].map(component => `
      <div class="component" id="${component.signature}">
        <div class="component-header">
          <h3 class="component-name">${component.name}</h3>
          <span class="component-type">${component.type}</span>
        </div>
        <div class="component-description">${component.description}</div>
        <div class="component-usage">
          Used on ${component.instances.length} page(s)
        </div>

        ${component.instances[0].twigDebug ? `
        <div class="component-twig-info">
          <h4>Twig Template Information</h4>
          <div class="twig-info-item"><strong>Theme Hook:</strong> ${component.instances[0].themeHook || 'N/A'}</div>
          ${component.instances[0].paragraphType ? `<div class="twig-info-item"><strong>Paragraph Type:</strong> ${component.instances[0].paragraphType}</div>` : ''}
          <div class="twig-info-item"><strong>Template Used:</strong> ${component.instances[0].templateUsed || 'N/A'}</div>
          ${component.instances[0].templateSuggestions && component.instances[0].templateSuggestions.length > 0 ? `
          <div class="twig-info-item">
            <strong>Template Suggestions:</strong>
            <ul class="template-suggestions">
              ${component.instances[0].templateSuggestions.map(template => `<li>${template}</li>`).join('')}
            </ul>
          </div>` : ''}
        </div>` : ''}

        <h4>Recommended File Structure for Site Studio</h4>
        <div class="component-structure">
          ${component.recommendedStructure.directory}<br>
          ├── ${component.recommendedStructure.html}<br>
          ├── ${component.recommendedStructure.css}<br>
          ├── ${component.recommendedStructure.js}<br>
          └── ${component.recommendedStructure.json}
        </div>

        <div class="tabs">
          <div class="tab active" onclick="showTab(this, 'html-${component.signature}')">HTML</div>
          <div class="tab" onclick="showTab(this, 'css-${component.signature}')">CSS</div>
          <div class="tab" onclick="showTab(this, 'js-${component.signature}')">JavaScript</div>
        </div>

        <div id="html-${component.signature}" class="tab-content active">
          <div class="component-html">${escapeHtml(component.instances[0].html)}</div>
        </div>

        <div id="css-${component.signature}" class="tab-content">
          <div class="component-html">/* CSS for ${component.name} */
${generateCssForComponent(component)}</div>
        </div>

        <div id="js-${component.signature}" class="tab-content">
          <div class="component-html">// JavaScript for ${component.name}
${generateJsForComponent(component)}</div>
        </div>
      </div>
    `).join('')}
  `).join('')}

  <script>
    function showTab(tabElement, contentId) {
      // Get all tabs in this component
      const tabContainer = tabElement.parentElement;
      const tabs = tabContainer.querySelectorAll('.tab');
      const tabContents = tabContainer.parentElement.querySelectorAll('.tab-content');

      // Remove active class from all tabs and contents
      tabs.forEach(tab => tab.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Add active class to selected tab and content
      tabElement.classList.add('active');
      document.getElementById(contentId).classList.add('active');
    }
  </script>
</body>
</html>
  `;

  // Write to file
  fs.writeFileSync(outputPath, html);
  console.log(`Component report saved to ${outputPath}`);
}

/**
 * Escape HTML special characters
 * @param {string} html - HTML string to escape
 * @returns {string} - Escaped HTML
 */
function escapeHtml(html) {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate CSS for a component
 * @param {Object} component - Component data
 * @returns {string} - CSS code
 */
function generateCssForComponent(component) {
  // Get classes from the first instance
  const classes = component.instances[0].classes;

  // Generate CSS selectors
  let css = '';

  if (classes.length > 0) {
    // Main component selector
    const mainClass = classes[0];
    css += `.${mainClass} {\n  /* Base styles */\n}\n\n`;

    // Add selectors for variations
    classes.slice(1).forEach(className => {
      css += `.${className} {\n  /* Variation styles */\n}\n\n`;
    });

    // Add some common child selectors
    css += `.${mainClass} .title {\n  /* Title styles */\n}\n\n`;
    css += `.${mainClass} .content {\n  /* Content styles */\n}\n\n`;
  } else {
    css += `/* No classes found for this component */\n`;
  }

  return css;
}

/**
 * Generate JavaScript for a component
 * @param {Object} component - Component data
 * @returns {string} - JavaScript code
 */
function generateJsForComponent(component) {
  // Get classes from the first instance
  const classes = component.instances[0].classes;

  if (classes.length === 0) {
    return '/* No JavaScript needed for this component */';
  }

  // Main class for the component
  const mainClass = classes[0];

  return `(function() {
  'use strict';

  // Initialize the ${component.name} component
  function init${component.name.replace(/\s+/g, '')}() {
    // Find all instances of this component
    const components = document.querySelectorAll('.${mainClass}');

    components.forEach(function(component) {
      // Component initialization code here
      console.log('${component.name} component initialized');

      // Example: Add event listeners
      const buttons = component.querySelectorAll('button');
      buttons.forEach(function(button) {
        button.addEventListener('click', function(event) {
          // Handle button click
        });
      });
    });
  }

  // Run initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init${component.name.replace(/\s+/g, '')});
  } else {
    init${component.name.replace(/\s+/g, '')}();
  }
})();`;
}

// Export functions
module.exports = {
  extractComponents,
  generateComponentLibrary,
  saveComponentLibrary,
  generateComponentReport,
  COMPONENT_SELECTORS
};

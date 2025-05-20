/**
 * Animations CSS Extractor
 * - Extracts animation and transition-related CSS properties from the site
 */

/**
 * Extract animation information from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Object} Animation data
 */
async function extractAnimations(page) {
  return await page.evaluate(() => {
    const animations = {
      transitions: {
        properties: new Set(),
        durations: new Set(),
        timingFunctions: new Set(),
        delays: new Set(),
        complete: new Set()
      },
      keyframes: {
        names: new Set(),
        durations: new Set(),
        timingFunctions: new Set(),
        delays: new Set(),
        iterations: new Set(),
        directions: new Set(),
        fillModes: new Set(),
        complete: new Set()
      },
      transforms: new Set(),
      keyframeDefinitions: {}
    };

    // Function to normalize values
    const normalizeValue = (value) => {
      if (!value || value === 'none' || value === '0s' || value === '0ms' ||
          value === 'inherit' || value === 'initial') return null;
      return value;
    };

    // Extract transition and animation properties from all loaded stylesheets
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules).forEach(rule => {
            // Handle keyframe definitions
            if (rule.type === CSSRule.KEYFRAMES_RULE) {
              animations.keyframes.names.add(rule.name);

              // Store keyframe definition
              const keyframeSteps = [];
              Array.from(rule.cssRules).forEach(keyframeRule => {
                keyframeSteps.push({
                  keyText: keyframeRule.keyText,
                  properties: Object.values(keyframeRule.style)
                    .filter(prop => keyframeRule.style[prop])
                    .map(prop => ({
                      property: prop,
                      value: keyframeRule.style[prop]
                    }))
                });
              });

              animations.keyframeDefinitions[rule.name] = keyframeSteps;
            }

            if (rule.style) {
              // Transitions
              if (rule.style.transition) {
                const value = normalizeValue(rule.style.transition);
                if (value) animations.transitions.complete.add(value);
              }

              if (rule.style.transitionProperty) {
                const value = normalizeValue(rule.style.transitionProperty);
                if (value) {
                  value.split(',').forEach(prop => {
                    animations.transitions.properties.add(prop.trim());
                  });
                }
              }

              if (rule.style.transitionDuration) {
                const value = normalizeValue(rule.style.transitionDuration);
                if (value) animations.transitions.durations.add(value);
              }

              if (rule.style.transitionTimingFunction) {
                const value = normalizeValue(rule.style.transitionTimingFunction);
                if (value) animations.transitions.timingFunctions.add(value);
              }

              if (rule.style.transitionDelay) {
                const value = normalizeValue(rule.style.transitionDelay);
                if (value) animations.transitions.delays.add(value);
              }

              // Animations
              if (rule.style.animation) {
                const value = normalizeValue(rule.style.animation);
                if (value) animations.keyframes.complete.add(value);
              }

              if (rule.style.animationName) {
                const value = normalizeValue(rule.style.animationName);
                if (value) animations.keyframes.names.add(value);
              }

              if (rule.style.animationDuration) {
                const value = normalizeValue(rule.style.animationDuration);
                if (value) animations.keyframes.durations.add(value);
              }

              if (rule.style.animationTimingFunction) {
                const value = normalizeValue(rule.style.animationTimingFunction);
                if (value) animations.keyframes.timingFunctions.add(value);
              }

              if (rule.style.animationDelay) {
                const value = normalizeValue(rule.style.animationDelay);
                if (value) animations.keyframes.delays.add(value);
              }

              if (rule.style.animationIterationCount) {
                const value = normalizeValue(rule.style.animationIterationCount);
                if (value) animations.keyframes.iterations.add(value);
              }

              if (rule.style.animationDirection) {
                const value = normalizeValue(rule.style.animationDirection);
                if (value) animations.keyframes.directions.add(value);
              }

              if (rule.style.animationFillMode) {
                const value = normalizeValue(rule.style.animationFillMode);
                if (value) animations.keyframes.fillModes.add(value);
              }

              // Transforms
              if (rule.style.transform) {
                const value = normalizeValue(rule.style.transform);
                if (value) animations.transforms.add(value);
              }
            }
          });
        } catch (e) {
          // Skip cross-origin stylesheets
        }
      });
    } catch (e) {
      console.error('Error processing stylesheets:', e);
    }

    // Extract from common animated elements
    const animatedElements = [
      'button', '.button', '.btn', 'a', 'a:hover', 'nav a', '.card',
      '.box', '.panel', '.alert', '.notification', '.message',
      '[class*="animate"]', '[class*="hover"]', '[class*="fade"]',
      '[class*="slide"]', '[class*="transition"]'
    ];

    animatedElements.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector.replace(':hover', ''));
        elements.forEach(element => {
          const style = window.getComputedStyle(element);

          // Transitions
          if (style.transition && style.transition !== 'none') {
            animations.transitions.complete.add(style.transition);
          }

          // Animation
          if (style.animation && style.animation !== 'none') {
            animations.keyframes.complete.add(style.animation);
          }

          // Transform
          if (style.transform && style.transform !== 'none') {
            animations.transforms.add(style.transform);
          }
        });
      } catch (e) {
        console.error(`Error processing ${selector}:`, e);
      }
    });

    // Convert Sets to Arrays for JSON serialization
    return {
      transitions: {
        properties: [...animations.transitions.properties],
        durations: [...animations.transitions.durations],
        timingFunctions: [...animations.transitions.timingFunctions],
        delays: [...animations.transitions.delays],
        complete: [...animations.transitions.complete]
      },
      keyframes: {
        names: [...animations.keyframes.names],
        durations: [...animations.keyframes.durations],
        timingFunctions: [...animations.keyframes.timingFunctions],
        delays: [...animations.keyframes.delays],
        iterations: [...animations.keyframes.iterations],
        directions: [...animations.keyframes.directions],
        fillModes: [...animations.keyframes.fillModes],
        complete: [...animations.keyframes.complete]
      },
      transforms: [...animations.transforms],
      keyframeDefinitions: animations.keyframeDefinitions
    };
  });
}

export { extractAnimations };

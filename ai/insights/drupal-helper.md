# Drupal Helper Module

## Purpose
The Drupal Helper Module is designed to programmatically generate a `site-manifest.json` file that provides detailed information about the site's anatomy. This manifest enables the crawler to efficiently scan and understand the site by leveraging Drupal's internal knowledge.

## Features
- **Content Types**:
  - Lists all content types with their fields and field types.
  - Example:
    ```json
    "content_types": {
      "article": {
        "fields": {
          "title": "string",
          "body": "text_long",
          "image": "image"
        }
      }
    }
    ```
- **Views**:
  - Lists all views with their display configurations and exposed paths.
  - Example:
    ```json
    "views": {
      "recent_articles": {
        "path": "/recent-articles",
        "display": "block"
      }
    }
    ```
- **Blocks**:
  - Lists all blocks with their placements and regions.
  - Example:
    ```json
    "blocks": {
      "site_branding": {
        "region": "header",
        "theme": "bartik"
      }
    }
    ```
- **Paragraphs**:
  - Lists all paragraph types with their fields.
  - Example:
    ```json
    "paragraphs": {
      "image_text": {
        "fields": {
          "image": "image",
          "text": "text_long"
        }
      }
    }
    ```
- **Templates**:
  - Maps paths to their corresponding Twig templates (if Twig debug mode is enabled).
  - Example:
    ```json
    "templates": {
      "/node/1": "node--article.html.twig",
      "/recent-articles": "views-view--recent-articles.html.twig"
    }
    ```

## Handling Component Complexity
Drupal sites often include a mix of system-provided blocks, module-provided blocks (e.g., Views), and custom blocks. To help users understand this complexity:
- **Categorize Blocks**:
  - Identify whether a block is:
    - A **system block** (e.g., "Powered by Drupal").
    - A **module-provided block** (e.g., Views blocks).
    - A **custom block** created by the site administrator.
  - Include this categorization in the `site-manifest.json` under the `blocks` section.
  - Example:
    ```json
    "blocks": {
      "site_branding": {
        "region": "header",
        "theme": "bartik",
        "type": "system"
      },
      "recent_articles": {
        "region": "content",
        "theme": "bartik",
        "type": "module",
        "module": "views"
      },
      "custom_promo": {
        "region": "sidebar",
        "theme": "bartik",
        "type": "custom"
      }
    }
    ```

- **Link Blocks to Their Sources**:
  - For module-provided blocks (e.g., Views), include metadata about the source (e.g., the view name and display).
  - Example:
    ```json
    "blocks": {
      "recent_articles": {
        "region": "content",
        "theme": "bartik",
        "type": "module",
        "module": "views",
        "view": "recent_articles",
        "display": "block"
      }
    }
    ```

## Template Naming Patterns
Drupal templates follow common naming conventions that can help determine their purpose. The helper module can analyze template filenames and provide insights:
- **Template Categories**:
  - **Node Templates**:
    - `node.html.twig`: Generic node template.
    - `node--<content_type>.html.twig`: Specific to a content type (e.g., `node--article.html.twig`).
  - **Block Templates**:
    - `block.html.twig`: Generic block template.
    - `block--<block_type>.html.twig`: Specific to a block type (e.g., `block--views-block.html.twig`).
  - **Paragraph Templates**:
    - `paragraph.html.twig`: Generic paragraph template.
    - `paragraph--<paragraph_type>.html.twig`: Specific to a paragraph type (e.g., `paragraph--image-text.html.twig`).

- **Enhancements to the Manifest**:
  - Include a `templates` section in the `site-manifest.json` that categorizes templates based on their filenames.
  - Example:
    ```json
    "templates": {
      "node.html.twig": {
        "type": "node",
        "specificity": "generic"
      },
      "node--article.html.twig": {
        "type": "node",
        "specificity": "content_type",
        "content_type": "article"
      },
      "block.html.twig": {
        "type": "block",
        "specificity": "generic"
      },
      "block--views-block.html.twig": {
        "type": "block",
        "specificity": "block_type",
        "block_type": "views-block"
      },
      "paragraph.html.twig": {
        "type": "paragraph",
        "specificity": "generic"
      },
      "paragraph--image-text.html.twig": {
        "type": "paragraph",
        "specificity": "paragraph_type",
        "paragraph_type": "image_text"
      }
    }
    ```

- **Twig Debug Mode**:
  - If Twig debug mode is enabled, parse the debug comments in the HTML output to map paths to their corresponding templates.
  - Example:
    ```json
    "templates": {
      "/node/1": "node--article.html.twig",
      "/recent-articles": "views-view--recent-articles.html.twig"
    }
    ```

## Additional Capabilities
With access to the database and files, the helper module can provide the following insights:

1. **Site Studio Detection**:
   - Determine if the site is using Site Studio (formerly known as Acquia Cohesion).
   - Include this information in the `site-manifest.json` under a `site_studio` key.
   - Example:
     ```json
     "site_studio": {
       "enabled": true,
       "components": ["hero_banner", "image_gallery"]
     }
     ```

2. **Blocks in Use**:
   - Identify all blocks that are actively in use on the site.
   - Cross-reference block placements with active themes and regions.
   - Example:
     ```json
     "blocks_in_use": {
       "site_branding": {
         "region": "header",
         "theme": "bartik"
       },
       "recent_articles": {
         "region": "content",
         "theme": "bartik",
         "type": "views_block",
         "view": "recent_articles",
         "display": "block"
       }
     }
     ```

3. **Content Types and Paths**:
   - List all content types and map them to the paths where they are used.
   - Example:
     ```json
     "content_types": {
       "article": {
         "paths": ["/node/1", "/node/2", "/articles/*"]
       },
       "page": {
         "paths": ["/about", "/contact"]
       }
     }
     ```

4. **Fields, Paragraphs, and Structures**:
   - Provide a detailed breakdown of fields, paragraphs, and other structures used by each content type.
   - Example:
     ```json
     "content_type_fields": {
       "article": {
         "fields": {
           "title": "string",
           "body": "text_long",
           "image": "image"
         },
         "paragraphs": ["image_text", "quote"]
       }
     }
     ```

5. **Full List of Paragraphs**:
   - Generate a comprehensive list of all paragraph types known to the site.
   - Example:
     ```json
     "paragraphs": {
       "image_text": {
         "fields": {
           "image": "image",
           "text": "text_long"
         }
       },
       "quote": {
         "fields": {
           "quote_text": "text_long",
           "author": "string"
         }
       }
     }
     ```

6. **Single Directory Components**:
   - Detect if the site uses any single directory components (e.g., components stored in a specific directory structure).
   - Include their names and file paths in the manifest.
   - Example:
     ```json
     "single_directory_components": {
       "hero_banner": {
         "path": "themes/custom/my_theme/components/hero_banner"
       },
       "image_gallery": {
         "path": "themes/custom/my_theme/components/image_gallery"
       }
     }
     ```

7. **Template Locations**:
   - Identify the file paths for all templates used by the site (e.g., node, block, paragraph templates).
   - Example:
     ```json
     "template_locations": {
       "node--article.html.twig": "themes/custom/my_theme/templates/node/node--article.html.twig",
       "block--views-block.html.twig": "themes/custom/my_theme/templates/block/block--views-block.html.twig"
     }
     ```

8. **Path Mapping for Components**:
   - Build a list of paths where each component (e.g., blocks, paragraphs) is used.
   - Delegate the actual rendering of these components to other phases of the workflow.
   - Example:
     ```json
     "component_paths": {
       "hero_banner": ["/home", "/about"],
       "image_gallery": ["/gallery", "/portfolio"]
     }
     ```

## Updated Manifest Structure
The `site-manifest.json` will now include the following additional sections:
```json
{
  "site_studio": {
    "enabled": true,
    "components": ["hero_banner", "image_gallery"]
  },
  "blocks_in_use": {
    "site_branding": {
      "region": "header",
      "theme": "bartik"
    },
    "recent_articles": {
      "region": "content",
      "theme": "bartik",
      "type": "views_block",
      "view": "recent_articles",
      "display": "block"
    }
  },
  "content_types": {
    "article": {
      "paths": ["/node/1", "/node/2", "/articles/*"]
    },
    "page": {
      "paths": ["/about", "/contact"]
    }
  },
  "content_type_fields": {
    "article": {
      "fields": {
        "title": "string",
        "body": "text_long",
        "image": "image"
      },
      "paragraphs": ["image_text", "quote"]
    }
  },
  "paragraphs": {
    "image_text": {
      "fields": {
        "image": "image",
        "text": "text_long"
      }
    },
    "quote": {
      "fields": {
        "quote_text": "text_long",
        "author": "string"
      }
    }
  },
  "single_directory_components": {
    "hero_banner": {
      "path": "themes/custom/my_theme/components/hero_banner"
    },
    "image_gallery": {
      "path": "themes/custom/my_theme/components/image_gallery"
    }
  },
  "template_locations": {
    "node--article.html.twig": "themes/custom/my_theme/templates/node/node--article.html.twig",
    "block--views-block.html.twig": "themes/custom/my_theme/templates/block/block--views-block.html.twig"
  },
  "component_paths": {
    "hero_banner": ["/home", "/about"],
    "image_gallery": ["/gallery", "/portfolio"]
  }
}
```

## Benefits of These Enhancements
- **Comprehensive Insights**:
  - Provides a complete view of the site's structure, components, and usage.
- **Improved Efficiency**:
  - Delegates rendering tasks to later phases, reducing the workload on the helper module.
- **Actionable Data**:
  - Enables users to make informed decisions about which components and templates to modify or analyze further.

## Implementation Plan
1. **Module Setup**:
   - Name: `site_manifest_helper`
   - Dependencies: `jsonapi`, `views`, `block`, `field`, `twig_debug` (optional).

2. **Custom Route**:
   - Define a route to expose the `site-manifest.json` file.
   - Example path: `/site-manifest.json`.

3. **Manifest Generation**:
   - Use Drupal APIs to fetch:
     - Content types and their fields.
     - Views and their paths.
     - Blocks and their placements.
     - Paragraph types and their fields.
     - Twig template mappings (optional).
   - Aggregate this data into a structured JSON file.

4. **Caching**:
   - Cache the generated manifest to improve performance.
   - Invalidate the cache when relevant entities (e.g., content types, views, blocks) are updated.
# Configuration Folder

This folder contains templates for configuring the Design Token Crawler.

## Files

- `config.json.template`: Template configuration file that will be used to create the default configuration in the user's config folder if no configuration exists.

## Configuration Properties

The crawler supports the following configuration properties:

- `baseUrl`: The base URL of the site to crawl. (Required)
- `outputDir`: The directory to save results to. (Default: "./results")
- `maxPages`: Maximum number of pages to crawl. Use -1 for unlimited. (Default: 20)
- `timeout`: Timeout for page navigation in milliseconds. (Default: 30000)
- `screenshotsEnabled`: Whether to save screenshots of each page. (Default: true)
- `ignoreExtensions`: File extensions to ignore when crawling. (Default: [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".css", ".js", ".zip", ".tar", ".gz"])
- `ignorePatterns`: URL patterns to ignore when crawling (regex strings). (Default: ["\\?", "/admin/", "/user/", "/cart/", "/checkout/", "/search/"])
- `respectRobotsTxt`: Whether to respect robots.txt. (Default: true)
- `telemetry`: Configuration for telemetry collection.
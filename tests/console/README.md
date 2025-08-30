# Console E2E Tests

These tests exercise the CLI (`npm run all`, etc.) against a minimal static mock site.

## Running the tests

Execute the end-to-end suite with:

```bash
npx vitest run --environment node
```

## Test structure

- `mock-site/`: Static HTML pages served by the mock HTTP server.
- `utils/server.js`: Simple HTTP server serving files from `mock-site` on a random port.
- `basic-workflow.test.js`: Tests invoking the CLI for individual phases (`--help`, `initial`, `deepen`, `metadata`, `extract`), verifying exit codes, console output, and generated files in `./output`.
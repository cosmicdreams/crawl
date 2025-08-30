/**
 * @vitest-environment node
 */
import { describe, test, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import { startMockServer } from './utils/server.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOCK_SITE_DIR = path.resolve(__dirname, 'mock-site');
let server;
let baseUrl;

beforeAll(async () => {
  server = await startMockServer(MOCK_SITE_DIR);
  const address = server.address();
  const port = typeof address === 'string'
    ? parseInt(address.split(':').pop(), 10)
    : address.port;
  baseUrl = `http://localhost:${port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  const outDir = path.resolve(process.cwd(), 'output');
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(outDir, 'extract'), { recursive: true });
});

describe('CLI end-to-end tests', () => {
  test('prints help with --help', async () => {
    const { stdout, stderr } = await execAsync('node index.js --help', { cwd: process.cwd() });
    expect(stdout).toContain('Usage:');
    expect(stderr).toBe('');
  });

  test('initial phase only creates paths.json', async () => {
    await execAsync(
      `node index.js initial --url ${baseUrl}`,
      { cwd: process.cwd() }
    );
    expect(fs.existsSync(path.resolve('output', 'paths.json'))).toBe(true);
  });

  test('deepen phase only updates scan_type to deepen', async () => {
    await execAsync(
      `node index.js initial --url ${baseUrl}`,
      { cwd: process.cwd() }
    );
    await execAsync(
      `node index.js deepen --url ${baseUrl}`,
      { cwd: process.cwd() }
    );
    const paths = JSON.parse(fs.readFileSync(path.resolve('output', 'paths.json'), 'utf8'));
    expect(paths.scan_type).toBe('deepen');
    expect(Array.isArray(paths.all_paths)).toBe(true);
    expect(paths.total_paths).toBe(paths.all_paths.length);
  });

  test('metadata phase only creates metadata.json with expected keys', async () => {
    await execAsync(
      `node index.js initial --url ${baseUrl}`,
      { cwd: process.cwd() }
    );
    await execAsync(
      `node index.js metadata --url ${baseUrl}`,
      { cwd: process.cwd() }
    );
    const metadata = JSON.parse(fs.readFileSync(path.resolve('output', 'metadata.json'), 'utf8'));
    expect(metadata).toHaveProperty('baseUrl');
    expect(metadata).toHaveProperty('scan_time');
    expect(Array.isArray(metadata.paths_with_metadata)).toBe(true);
    expect(Array.isArray(metadata.paragraphs)).toBe(true);
    expect(Array.isArray(metadata.components)).toBe(true);
  });

  test('extract phase only creates extract files', async () => {
    const metadataFile = path.resolve(process.cwd(), 'output', 'metadata.json');
    const fakeMeta = {
      baseUrl,
      unique_paths: [
        { url: baseUrl, title: 'Index Page', depth: 0, reason: 'test', paragraphs: [], components: [] }
      ]
    };
    fs.writeFileSync(metadataFile, JSON.stringify(fakeMeta, null, 2));
    await execAsync(
      `node index.js extract --url ${baseUrl}`,
      { cwd: process.cwd() }
    );
    const extractDir = path.resolve(process.cwd(), 'output', 'extract');
    expect(fs.existsSync(extractDir)).toBe(true);
    const files = fs.readdirSync(extractDir).sort();
    expect(files).toEqual(expect.arrayContaining([
      'typography.json',
      'colors.json',
      'spacing.json',
      'borders.json',
      'animations.json',
      'summary.json',
    ]));
  });

  test.skip('full workflow completes and outputs files', async () => {
    const { stdout } = await execAsync(
      `node index.js all --url ${baseUrl}`,
      { cwd: process.cwd() }
    );
    expect(stdout).toContain('✅ All operations completed successfully!');
    expect(fs.existsSync(path.resolve('output', 'paths.json'))).toBe(true);
    expect(fs.existsSync(path.resolve('output', 'metadata.json'))).toBe(true);
    const extracts = fs.readdirSync(path.resolve('output', 'extract'));
    expect(extracts.length).toBeGreaterThan(0);
  });
});
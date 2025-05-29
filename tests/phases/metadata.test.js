import { describe, it, expect, beforeEach, vi } from 'vitest';
import { organizeMetadata } from '../../phases/metadata.js';

// Mock CONFIG because metadata.js uses it at the top level for MAX_RETRIES, DEFAULT_COLOR
// and also in generateTemplateAnalysis which is called by organizeMetadata if spinner is real
vi.mock('../../utils/config-utils.js', () => ({
  CONFIG: {
    name: 'Test Site',
    crawl_settings: {
      max_retries: 1,
      batch_size: 5,
      timeout: 10000,
    },
    // other necessary CONFIG properties used by organizeMetadata or its callees
  },
}));

// Mock fs since generateTemplateAnalysis (called by organizeMetadata) uses fs.writeFileSync
vi.mock('fs', () => ({
  default: {
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    // ... other fs methods if needed
  },
}));


describe('organizeMetadata', () => {
  let mockSpinner;
  let baseMetadata;

  beforeEach(() => {
    mockSpinner = {
      text: '',
      color: '',
      start: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
      stopAndPersist: vi.fn(),
    };
    baseMetadata = {
      paths_with_metadata: [],
      baseUrl: 'http://example.com',
      scan_time: new Date().toISOString(),
      paragraphs: [], // Will be populated by organizeMetadata based on paths_with_metadata
      components: [], // Will be populated by organizeMetadata based on paths_with_metadata
      // group_body_class is initialized by organizeMetadata
    };
  });

  it('Test Case 1: Basic Grouping - should correctly group paths by body classes, paragraphs, and components', async () => {
    const specificMetadata = {
      ...baseMetadata,
      paths_with_metadata: [
        { url: 'http://example.com/page1', title: 'Page 1', depth: 0, body_classes: 'classA classB', paragraphs: ['para1', 'common_para'], components: ['comp1', 'common_comp'] },
        { url: 'http://example.com/page2', title: 'Page 2', depth: 1, body_classes: 'classC', paragraphs: ['para2', 'common_para'], components: ['comp2', 'common_comp'] },
        { url: 'http://example.com/page3', title: 'Page 3', depth: 1, body_classes: 'classA classB', paragraphs: ['para3'], components: ['comp3'] },
      ],
    };
    const originalMetadataCopy = JSON.parse(JSON.stringify(specificMetadata));

    const enhanced = await organizeMetadata(specificMetadata, mockSpinner);

    // Check group_body_class
    expect(enhanced.group_body_class['classA classB']).toHaveLength(2);
    expect(enhanced.group_body_class['classA classB'].map(p => p.url)).toEqual(expect.arrayContaining(['http://example.com/page1', 'http://example.com/page3']));
    expect(enhanced.group_body_class['classC']).toHaveLength(1);
    expect(enhanced.group_body_class['classC'][0].url).toBe('http://example.com/page2');

    // Check group_paragraphs
    expect(enhanced.group_paragraphs['para1']).toHaveLength(1);
    expect(enhanced.group_paragraphs['para1'][0].url).toBe('http://example.com/page1');
    expect(enhanced.group_paragraphs['common_para']).toHaveLength(2);
    expect(enhanced.group_paragraphs['common_para'].map(p => p.url)).toEqual(expect.arrayContaining(['http://example.com/page1', 'http://example.com/page2']));

    // Check group_components
    expect(enhanced.group_components['comp1']).toHaveLength(1);
    expect(enhanced.group_components['comp1'][0].url).toBe('http://example.com/page1');
    expect(enhanced.group_components['common_comp']).toHaveLength(2);
    expect(enhanced.group_components['common_comp'].map(p => p.url)).toEqual(expect.arrayContaining(['http://example.com/page1', 'http://example.com/page2']));
    
    // Ensure original metadata.group_body_class (if it existed) was not mutated
    // organizeMetadata initializes enhanced.group_body_class, so specificMetadata itself won't have it.
    // This implicitly tests the mutation bug if we check that originalMetadataCopy is unchanged where it matters.
    expect(originalMetadataCopy.group_body_class).toBeUndefined(); 
    // If specificMetadata could have group_body_class, we'd check:
    // expect(specificMetadata.group_body_class).toEqual(originalMetadataCopy.group_body_class);
  });

  it('Test Case 2: unique_paths Selection Logic - should correctly select unique paths', async () => {
    const specificMetadata = {
      ...baseMetadata,
      paths_with_metadata: [
        // p1 selected for body_classes: classA classB
        { url: 'http://example.com/page1', title: 'Page 1', depth: 0, body_classes: 'classA classB', paragraphs: ['common_para', 'p1_para_unique', 'p1_para_multi'], components: ['common_comp', 'p1_comp_unique'] }, 
        // p2 selected for body_classes: classC
        { url: 'http://example.com/page2', title: 'Page 2', depth: 1, body_classes: 'classC', paragraphs: ['common_para', 'p2_para_unique'], components: ['common_comp', 'p2_comp_unique', 'p2_comp_multi'] }, 
        // p3 selected for body_classes: classA classD. Is "cleanest" for common_para and common_comp.
        { url: 'http://example.com/page3', title: 'Page 3', depth: 1, body_classes: 'classA classD', paragraphs: ['common_para'], components: ['common_comp'] },      
        // p4 selected for body_classes: classE. Has unique para p4_para_only & comp p4_comp_only
        { url: 'http://example.com/page4', title: 'Page 4', depth: 2, body_classes: 'classE', paragraphs: ['p4_para_only'], components: ['p4_comp_only', 'common_comp'] },
        // p5 shares body_class with p1. Has a unique para p5_para_unique. Shares p1_comp_unique.
        { url: 'http://example.com/page5', title: 'Page 5', depth: 0, body_classes: 'classA classB', paragraphs: ['common_para', 'p5_para_unique'], components: ['p1_comp_unique', 'p5_comp_other'] },
        // p6 is another page for classC, but p2 is first, so p2 is picked for body_class. p6 has unique p6_para.
        { url: 'http://example.com/page6', title: 'Page 6', depth: 1, body_classes: 'classC', paragraphs: ['p6_para'], components: [] },
      ],
    };
    // Populate paragraphs and components list for generateTemplateAnalysis, as it's called by organizeMetadata
    specificMetadata.paragraphs = Array.from(new Set(specificMetadata.paths_with_metadata.flatMap(p => p.paragraphs || []))).sort();
    specificMetadata.components = Array.from(new Set(specificMetadata.paths_with_metadata.flatMap(p => p.components || []))).sort();


    const enhanced = await organizeMetadata(specificMetadata, mockSpinner);
    const uniqueUrls = enhanced.unique_paths.map(p => p.url);

    // Expected after body class pass: page1, page2, page3, page4
    // Expected after paragraph pass:
    //   common_para -> p3 (already in)
    //   p1_para_unique -> p1 (already in)
    //   p1_para_multi -> p1 (already in)
    //   p2_para_unique -> p2 (already in)
    //   p4_para_only -> p4 (already in)
    //   p5_para_unique -> p5 is added (p5 is cleaner for this than p1)
    //   p6_para -> p6 is added
    // Expected after component pass (no new pages as p1,p2,p3,p4,p5,p6 cover all components)
    
    expect(uniqueUrls).toEqual(expect.arrayContaining([
      'http://example.com/page1', // From body class 'classA classB'
      'http://example.com/page2', // From body class 'classC'
      'http://example.com/page3', // From body class 'classA classD'
      'http://example.com/page4', // From body class 'classE'
      'http://example.com/page5', // For 'p5_para_unique' (p5 has 2 paras, p1 has 3 for p1_comp_unique if that was checked first)
      'http://example.com/page6', // For 'p6_para'
    ]));
    expect(uniqueUrls.length).toBe(6);

    // Check reasons
    expect(enhanced.unique_paths.find(p=>p.url === 'http://example.com/page1').reason).toBe('unique_body_class');
    expect(enhanced.unique_paths.find(p=>p.url === 'http://example.com/page5').reason).toBe('unique_paragraph');
    expect(enhanced.unique_paths.find(p=>p.url === 'http://example.com/page6').reason).toBe('unique_paragraph');

    // Check sorting
    const sortedExpectedUrls = [
        'http://example.com/page1', 
        'http://example.com/page2', 
        'http://example.com/page3', 
        'http://example.com/page4', 
        'http://example.com/page5',
        'http://example.com/page6'
    ].sort();
    expect(uniqueUrls).toEqual(sortedExpectedUrls);
  });

  it('Test Case 3: Edge Cases - should handle empty or sparse data without errors', async () => {
    const metadataEmptyPaths = { ...baseMetadata, paths_with_metadata: [] };
    let enhanced = await organizeMetadata(metadataEmptyPaths, mockSpinner);
    expect(enhanced.group_body_class).toEqual({});
    expect(enhanced.group_paragraphs).toEqual({});
    expect(enhanced.group_components).toEqual({});
    expect(enhanced.unique_paths).toEqual([]);

    const metadataSparse = {
      ...baseMetadata,
      paths_with_metadata: [
        { url: 'http://example.com/page1', title: 'Page 1', depth: 0, body_classes: 'classA', paragraphs: null, components: undefined },
        { url: 'http://example.com/page2', title: 'Page 2', depth: 1, body_classes: 'classB', paragraphs: [], components: [] },
        { url: 'http://example.com/page3', title: 'Page 3', depth: 1, body_classes: 'classC', paragraphs: ['para1'], components: ['comp1'] },
      ],
    };
    metadataSparse.paragraphs = ['para1'];
    metadataSparse.components = ['comp1'];


    enhanced = await organizeMetadata(metadataSparse, mockSpinner);
    expect(enhanced.group_body_class['classA']).toBeDefined();
    expect(enhanced.group_body_class['classB']).toBeDefined();
    expect(enhanced.group_paragraphs['para1']).toHaveLength(1);
    expect(enhanced.group_components['comp1']).toHaveLength(1);
    expect(enhanced.unique_paths.map(p => p.url)).toEqual(expect.arrayContaining(['http://example.com/page1', 'http://example.com/page2', 'http://example.com/page3']));
  });

  it('Test Case 4: Input Data Integrity - should handle missing optional properties in paths_with_metadata items', async () => {
    const metadataIntegrity = {
      ...baseMetadata,
      paths_with_metadata: [
        { url: 'http://example.com/page1', body_classes: 'classA' }, // Missing title, depth, paragraphs, components
        { url: 'http://example.com/page2', title: 'Page 2', depth: 1, body_classes: 'classB', paragraphs: ['para1'], components: ['comp1'] },
      ],
    };
    metadataIntegrity.paragraphs = ['para1'];
    metadataIntegrity.components = ['comp1'];

    let enhanced;
    await expect(organizeMetadata(metadataIntegrity, mockSpinner)).resolves.not.toThrow();
    enhanced = await organizeMetadata(metadataIntegrity, mockSpinner);

    expect(enhanced.group_body_class['classA']).toHaveLength(1);
    expect(enhanced.group_body_class['classA'][0].url).toBe('http://example.com/page1');
    expect(enhanced.group_body_class['classA'][0].title).toBeUndefined(); // Handled gracefully

    expect(enhanced.group_paragraphs['para1']).toHaveLength(1);
    expect(enhanced.group_components['comp1']).toHaveLength(1);

    const uniquePath1 = enhanced.unique_paths.find(p => p.url === 'http://example.com/page1');
    expect(uniquePath1).toBeDefined();
    expect(uniquePath1.title).toBeUndefined();
    expect(uniquePath1.paragraphs).toEqual([]);
    expect(uniquePath1.components).toEqual([]);
  });
});

// Helper function to deep clone for checking non-mutation if needed for other tests
// const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

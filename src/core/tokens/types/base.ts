// src/core/tokens/types/base.ts
/**
 * Design Tokens Specification 2025.10 - Base Types
 * https://www.designtokens.org/tr/2025.10/format/
 *
 * This module implements the foundational types required by the Design Tokens specification.
 */

/**
 * Token types as defined by the specification.
 *
 * Primitive types represent atomic values.
 * Composite types combine multiple sub-values.
 */
export type TokenType =
    // Primitive types
    | 'color'
    | 'dimension'
    | 'fontFamily'
    | 'fontWeight'
    | 'duration'
    | 'cubicBezier'
    | 'number'
    // Composite types
    | 'border'
    | 'shadow'
    | 'transition'
    | 'strokeStyle'
    | 'gradient'
    | 'typography';

/**
 * Base token properties that all tokens may have.
 * These properties use the $ prefix as required by the spec.
 */
export interface BaseTokenProperties {
    /**
     * The token's type. Can be inherited from parent group.
     * REQUIRED: Either explicit on token or inherited from group.
     */
    $type?: TokenType;

    /**
     * Human-readable description of the token's purpose.
     * OPTIONAL but recommended for documentation.
     */
    $description?: string;

    /**
     * Deprecation status. Boolean or string explaining why deprecated.
     * OPTIONAL - signals tokens scheduled for removal.
     */
    $deprecated?: boolean | string;

    /**
     * Vendor-specific metadata using reverse domain notation.
     * OPTIONAL - tools must preserve unrecognized extensions.
     *
     * Example:
     * {
     *   "com.yourcompany.crawler": {
     *     "usageCount": 42,
     *     "source": "homepage.css:123"
     *   }
     * }
     */
    $extensions?: {
        [vendorDomain: string]: Record<string, any>;
    };
}

/**
 * A design token as defined by the specification.
 * Generic over the value type to support all token types.
 *
 * SPEC REQUIREMENTS:
 * - Token name is the object key (not a property)
 * - $value is REQUIRED
 * - $type is REQUIRED (explicit or inherited)
 * - Names cannot start with $
 * - Names cannot contain: { } .
 */
export interface Token<T = any> extends BaseTokenProperties {
    /**
     * The token's value. Format depends on $type.
     * REQUIRED for all tokens.
     */
    $value: T;
}

/**
 * A reference to another token using curly brace syntax.
 * Format: "{group.subgroup.token}" or "{token}"
 *
 * SPEC REQUIREMENTS:
 * - Always resolves to complete $value of target token
 * - Cannot reference partial properties (use JSON Pointer for that)
 * - Must resolve to existing token
 * - Circular references are invalid
 */
export type TokenReference = `{${string}}`;

/**
 * A JSON Pointer reference as defined by RFC 6901.
 * Format: "#/path/to/property"
 *
 * SPEC REQUIREMENTS:
 * - Enables property-level access
 * - ~ must be escaped as ~0
 * - / must be escaped as ~1
 * - Can reference any document location
 */
export interface JSONPointerReference {
    $ref: `#/${string}`;
}

/**
 * A token value that may be an explicit value or a reference.
 */
export type TokenValue<T> = T | TokenReference | JSONPointerReference;

/**
 * Group properties for organizing tokens hierarchically.
 * Groups are objects WITHOUT $value properties.
 *
 * SPEC REQUIREMENTS:
 * - Groups organize tokens but are not tokens themselves
 * - May contain $type for type inheritance
 * - May contain $extends for group inheritance
 * - Can contain child tokens and nested groups
 */
export interface GroupProperties extends Omit<BaseTokenProperties, '$type'> {
    /**
     * Type that all child tokens inherit (unless overridden).
     * OPTIONAL - enables concise token definitions.
     */
    $type?: TokenType;

    /**
     * Reference to parent group to extend/inherit from.
     * OPTIONAL - follows JSON Schema $ref semantics.
     * Deep merge with local properties overriding inherited ones.
     */
    $extends?: string;
}

/**
 * A group containing tokens and/or nested groups.
 * Detected by absence of $value property.
 */
export interface TokenGroup extends GroupProperties {
    /**
     * Child tokens and groups.
     * Token names as keys, Token or Group as values.
     */
    [tokenName: string]: Token<any> | TokenGroup | any;

    /**
     * Special root token accessible via "{groupName.$root}"
     * OPTIONAL - provides group-level token.
     */
    $root?: Token<any>;
}

/**
 * The root document containing all tokens and groups.
 * Must be a valid JSON object.
 *
 * SPEC REQUIREMENTS:
 * - File extension: .tokens or .tokens.json
 * - MIME type: application/design-tokens+json (or application/json)
 * - Must follow RFC 8259 JSON standards
 */
export interface TokenDocument {
    [groupOrTokenName: string]: Token<any> | TokenGroup;
}

/**
 * Metadata about where a token was discovered.
 * This goes in $extensions, not as top-level properties.
 */
export interface CrawlerMetadata {
    /**
     * Number of times this token value appeared on crawled pages.
     */
    usageCount?: number;

    /**
     * CSS selector or file location where token was found.
     */
    source?: string;

    /**
     * Semantic category (e.g., "primary", "accent", "heading").
     */
    category?: string;

    /**
     * URLs where this token was observed.
     */
    sourceUrls?: string[];

    /**
     * Original CSS value before conversion to spec format.
     */
    originalValue?: string;
}

/**
 * Extensions namespace for this crawler.
 */
export const CRAWLER_EXTENSION_NAMESPACE = 'com.designtokencrawler';

/**
 * Helper to create properly namespaced crawler extensions.
 */
export function createCrawlerExtensions(metadata: CrawlerMetadata): Token<any>['$extensions'] {
    return {
        [CRAWLER_EXTENSION_NAMESPACE]: metadata
    };
}

/**
 * Type guard to check if an object is a Token (has $value).
 */
export function isToken(obj: any): obj is Token {
    return obj && typeof obj === 'object' && '$value' in obj;
}

/**
 * Type guard to check if an object is a Group (no $value).
 */
export function isGroup(obj: any): obj is TokenGroup {
    return obj && typeof obj === 'object' && !('$value' in obj);
}

/**
 * Type guard to check if a value is a token reference.
 */
export function isTokenReference(value: any): value is TokenReference {
    return typeof value === 'string' && value.startsWith('{') && value.endsWith('}');
}

/**
 * Type guard to check if a value is a JSON Pointer reference.
 */
export function isJSONPointerReference(value: any): value is JSONPointerReference {
    return value && typeof value === 'object' && '$ref' in value && typeof value.$ref === 'string';
}

/**
 * Validate token name according to spec rules.
 *
 * SPEC REQUIREMENTS:
 * - Cannot start with $
 * - Cannot contain { } .
 * - Must be valid JSON string
 */
export function validateTokenName(name: string): { valid: boolean; error?: string } {
    if (name.startsWith('$') && name !== '$root') {
        return { valid: false, error: 'Token names cannot start with $ (reserved for spec properties)' };
    }

    if (name.includes('{') || name.includes('}')) {
        return { valid: false, error: 'Token names cannot contain { or } (used for references)' };
    }

    if (name.includes('.')) {
        return { valid: false, error: 'Token names cannot contain . (used for path navigation)' };
    }

    return { valid: true };
}

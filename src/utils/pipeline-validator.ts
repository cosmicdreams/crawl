// src/utils/pipeline-validator.ts
// Using ESM syntax
import { logger } from './logger.js';

export interface ValidationSchema {
    type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'any';
    required?: boolean;
    properties?: Record<string, ValidationSchema>;
    items?: ValidationSchema;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    minimum?: number;
    maximum?: number;
    enum?: any[];
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export class PipelineValidator {
    /**
     * Validates data against a schema
     */
    static validate(data: any, schema: ValidationSchema, path: string = ''): ValidationResult {
        const result: ValidationResult = { valid: true, errors: [] };

        // Check if data is required but undefined or null
        if (schema.required && (data === undefined || data === null)) {
            result.valid = false;
            result.errors.push(`${path || 'data'} is required but was not provided`);
            return result;
        }

        // If data is undefined or null and not required, it's valid
        if (data === undefined || data === null) {
            return result;
        }

        // Validate type
        if (schema.type !== 'any') {
            const actualType = Array.isArray(data) ? 'array' : typeof data;
            if (actualType !== schema.type) {
                result.valid = false;
                result.errors.push(`${path || 'data'} should be of type ${schema.type}, but got ${actualType}`);
                return result;
            }
        }

        // Validate object properties
        if (schema.type === 'object' && schema.properties) {
            for (const [propName, propSchema] of Object.entries(schema.properties)) {
                const propPath = path ? `${path}.${propName}` : propName;
                const propData = data[propName];
                
                const propResult = this.validate(propData, propSchema, propPath);
                if (!propResult.valid) {
                    result.valid = false;
                    result.errors.push(...propResult.errors);
                }
            }
        }

        // Validate array items
        if (schema.type === 'array' && schema.items && Array.isArray(data)) {
            for (let i = 0; i < data.length; i++) {
                const itemPath = path ? `${path}[${i}]` : `[${i}]`;
                const itemResult = this.validate(data[i], schema.items, itemPath);
                if (!itemResult.valid) {
                    result.valid = false;
                    result.errors.push(...itemResult.errors);
                }
            }
        }

        // Validate string constraints
        if (schema.type === 'string') {
            if (schema.minLength !== undefined && data.length < schema.minLength) {
                result.valid = false;
                result.errors.push(`${path || 'data'} should have a minimum length of ${schema.minLength}`);
            }
            if (schema.maxLength !== undefined && data.length > schema.maxLength) {
                result.valid = false;
                result.errors.push(`${path || 'data'} should have a maximum length of ${schema.maxLength}`);
            }
            if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
                result.valid = false;
                result.errors.push(`${path || 'data'} should match pattern ${schema.pattern}`);
            }
        }

        // Validate number constraints
        if (schema.type === 'number') {
            if (schema.minimum !== undefined && data < schema.minimum) {
                result.valid = false;
                result.errors.push(`${path || 'data'} should be at least ${schema.minimum}`);
            }
            if (schema.maximum !== undefined && data > schema.maximum) {
                result.valid = false;
                result.errors.push(`${path || 'data'} should be at most ${schema.maximum}`);
            }
        }

        // Validate enum values
        if (schema.enum && !schema.enum.includes(data)) {
            result.valid = false;
            result.errors.push(`${path || 'data'} should be one of [${schema.enum.join(', ')}]`);
        }

        return result;
    }

    /**
     * Validates that the output of one stage can be used as input for the next stage
     */
    static validateStageTransition(
        outputData: any,
        outputSchema: ValidationSchema,
        inputSchema: ValidationSchema
    ): ValidationResult {
        // First validate that the output matches its schema
        const outputResult = this.validate(outputData, outputSchema);
        if (!outputResult.valid) {
            return {
                valid: false,
                errors: [
                    'Output data does not match output schema:',
                    ...outputResult.errors.map(err => `  - ${err}`)
                ]
            };
        }

        // Then validate that the output can be used as input for the next stage
        const inputResult = this.validate(outputData, inputSchema);
        if (!inputResult.valid) {
            return {
                valid: false,
                errors: [
                    'Output data cannot be used as input for the next stage:',
                    ...inputResult.errors.map(err => `  - ${err}`)
                ]
            };
        }

        return { valid: true, errors: [] };
    }

    /**
     * Logs validation errors
     */
    static logValidationErrors(stageName: string, result: ValidationResult): void {
        if (!result.valid) {
            logger.error(`Validation failed for stage ${stageName}:`, {
                errors: result.errors
            });
        }
    }
}

export default PipelineValidator;

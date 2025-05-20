// src/core/pipeline.ts
// Using ESM syntax
import { pipelineMonitor } from './monitoring/index.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import PipelineValidator, { ValidationSchema } from '../utils/pipeline-validator.js';
export interface PipelineStage<InputType, OutputType> {
    name: string;
    process: (input: InputType) => Promise<OutputType>;
    canSkip?: (input: InputType, state: Record<string, any>) => boolean;
    onError?: (error: Error, state: Record<string, any>) => Promise<void>;
    inputSchema?: ValidationSchema;
    outputSchema?: ValidationSchema;
}

export class Pipeline<FinalOutputType = any> {
    private stages: PipelineStage<any, any>[] = [];
    private state: Record<string, any> = {};
    private id: string = uuidv4();

    addStage<I, O>(stage: PipelineStage<I, O>): Pipeline<FinalOutputType> {
        this.stages.push(stage);
        return this;
    }

    async run<InitialInputType>(initialInput: InitialInputType): Promise<FinalOutputType> {
        let input = initialInput;

        // Start monitoring the pipeline
        pipelineMonitor.startPipeline(
            this.id,
            this.stages.map(stage => stage.name)
        );

        for (const stage of this.stages) {
            try {
                logger.info(`Running stage: ${stage.name}`);

                // Check if we can skip this stage
                if (stage.canSkip && stage.canSkip(input, this.state)) {
                    logger.info(`Skipping stage: ${stage.name}`, { reason: 'canSkip returned true' });
                    pipelineMonitor.updateStage(this.id, stage.name, {
                        status: 'completed',
                        progress: 100,
                        details: { skipped: true }
                    });
                    continue;
                }

                // Update stage status to running
                pipelineMonitor.updateStage(this.id, stage.name, {
                    status: 'running',
                    progress: 0
                });

                // Validate input if schema is provided
                if (stage.inputSchema) {
                    const validationResult = PipelineValidator.validate(input, stage.inputSchema);
                    if (!validationResult.valid) {
                        PipelineValidator.logValidationErrors(stage.name, validationResult);
                        logger.warn(`Input validation failed for stage ${stage.name}, but continuing anyway`, {
                            errors: validationResult.errors
                        });
                    }
                }

                // Process the stage
                const output = await stage.process(input);

                // Validate output if schema is provided
                if (stage.outputSchema) {
                    const validationResult = PipelineValidator.validate(output, stage.outputSchema);
                    if (!validationResult.valid) {
                        PipelineValidator.logValidationErrors(stage.name, validationResult);
                        logger.warn(`Output validation failed for stage ${stage.name}, but continuing anyway`, {
                            errors: validationResult.errors
                        });
                    }
                }

                // Validate stage transition if next stage has an input schema
                const nextStageIndex = this.stages.indexOf(stage) + 1;
                if (nextStageIndex < this.stages.length) {
                    const nextStage = this.stages[nextStageIndex];
                    if (nextStage.inputSchema && stage.outputSchema) {
                        const transitionResult = PipelineValidator.validateStageTransition(
                            output,
                            stage.outputSchema,
                            nextStage.inputSchema
                        );
                        if (!transitionResult.valid) {
                            PipelineValidator.logValidationErrors(`${stage.name} -> ${nextStage.name}`, transitionResult);
                            logger.warn(`Stage transition validation failed from ${stage.name} to ${nextStage.name}, but continuing anyway`, {
                                errors: transitionResult.errors
                            });
                        }
                    }
                }

                // Store the result in state
                this.state[stage.name] = output;

                // Pass to next stage
                input = output;

                logger.info(`Completed stage: ${stage.name}`, {
                    resultSize: JSON.stringify(output).length,
                    timestamp: Date.now()
                });

                // Update stage status to completed
                pipelineMonitor.updateStage(this.id, stage.name, {
                    status: 'completed',
                    progress: 100,
                    details: {
                        resultSize: JSON.stringify(output).length,
                        timestamp: Date.now()
                    }
                });
            } catch (error) { // error is unknown
                // Check if error is an Error instance before accessing properties
                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorStack = error instanceof Error ? error.stack : undefined;
                const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';

                logger.error(`Error in stage ${stage.name}:`, {
                    error: errorMessage,
                    errorType: errorType,
                    stack: errorStack
                });

                // Store the error in the state
                this.state[`${stage.name}_error`] = {
                    message: errorMessage,
                    timestamp: new Date().toISOString(),
                    stage: stage.name
                };

                // Call the stage's error handler if it exists
                if (stage.onError) {
                    try {
                        // Explicitly cast or handle 'unknown' before passing
                        const errorToPass = error instanceof Error ? error : new Error(String(error));
                        await stage.onError(errorToPass, this.state);
                    } catch (handlerError) { // handlerError is unknown
                        // Check if handlerError is an Error instance
                        const handlerErrorMessage = handlerError instanceof Error ? handlerError.message : String(handlerError);
                        const handlerErrorStack = handlerError instanceof Error ? handlerError.stack : undefined;
                        const handlerErrorType = handlerError instanceof Error ? handlerError.constructor.name : 'UnknownError';

                        logger.error(`Error in error handler for stage ${stage.name}:`, {
                            error: handlerErrorMessage,
                            errorType: handlerErrorType,
                            stack: handlerErrorStack
                        });
                        // Don't throw from the error handler to avoid nested errors
                    }
                }

                // Update stage status to error
                pipelineMonitor.updateStage(this.id, stage.name, {
                    status: 'error',
                    progress: 0,
                    // Use the checked error message and type
                    error: errorMessage,
                    details: {
                        timestamp: Date.now(),
                        errorType: errorType
                    }
                });

                // Rethrow with more context, ensuring it's an Error instance
                if (error instanceof Error) {
                    error.message = `Error in stage ${stage.name}: ${error.message}`;
                    throw error;
                } else {
                    // Create a new Error instance for unknown errors
                    throw new Error(`Error in stage ${stage.name}: ${String(error)}`);
                }
            }
        }

        return input as unknown as FinalOutputType;
    }

    getState(): Record<string, any> {
        return { ...this.state };
    }

    getId(): string {
        return this.id;
    }
}
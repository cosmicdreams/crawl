// src/utils/logger.ts
// Using ESM syntax
import fs from 'node:fs';
import path from 'node:path';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export interface LoggerOptions {
    level: LogLevel;
    outputDir?: string;
    logToConsole?: boolean;
    logToFile?: boolean;
    filename?: string;
}

export class Logger {
    private options: LoggerOptions;
    private logFile: string | null = null;

    constructor(options: Partial<LoggerOptions> = {}) {
        this.options = {
            level: options.level ?? LogLevel.INFO,
            outputDir: options.outputDir ?? './logs',
            logToConsole: options.logToConsole ?? true,
            logToFile: options.logToFile ?? false,
            filename: options.filename ?? `log-${new Date().toISOString().replace(/:/g, '-')}.log`
        };

        if (this.options.logToFile) {
            this.setupLogFile();
        }
    }

    private setupLogFile(): void {
        if (!this.options.outputDir) {
            return;
        }

        // Create output directory if it doesn't exist
        if (!fs.existsSync(this.options.outputDir)) {
            fs.mkdirSync(this.options.outputDir, { recursive: true });
        }

        this.logFile = path.join(this.options.outputDir, this.options.filename!);

        // Initialize log file with header
        fs.writeFileSync(
            this.logFile,
            `# Log started at ${new Date().toISOString()}\n`,
            { flag: 'a' }
        );
    }

    private formatMessage(level: string, message: string, context?: any): string {
        const timestamp = new Date().toISOString();
        let formattedMessage = `[${timestamp}] [${level}] ${message}`;

        if (context) {
            try {
                formattedMessage += ` ${JSON.stringify(context)}`;
            } catch (e) {
                formattedMessage += ` [Context serialization failed]`;
            }
        }

        return formattedMessage;
    }

    private log(level: LogLevel, levelName: string, message: string, context?: any): void {
        if (level < this.options.level) {
            return;
        }

        const formattedMessage = this.formatMessage(levelName, message, context);

        // Log to console if enabled
        if (this.options.logToConsole) {
            switch (level) {
                case LogLevel.DEBUG:
                    console.debug(formattedMessage);
                    break;
                case LogLevel.INFO:
                    console.info(formattedMessage);
                    break;
                case LogLevel.WARN:
                    console.warn(formattedMessage);
                    break;
                case LogLevel.ERROR:
                    console.error(formattedMessage);
                    break;
            }
        }

        // Log to file if enabled
        if (this.options.logToFile && this.logFile) {
            fs.appendFileSync(this.logFile, formattedMessage + '\n');
        }
    }

    debug(message: string, context?: any): void {
        this.log(LogLevel.DEBUG, 'DEBUG', message, context);
    }

    info(message: string, context?: any): void {
        this.log(LogLevel.INFO, 'INFO', message, context);
    }

    warn(message: string, context?: any): void {
        this.log(LogLevel.WARN, 'WARN', message, context);
    }

    error(message: string, context?: any): void {
        this.log(LogLevel.ERROR, 'ERROR', message, context);
    }
}

// Create a default logger instance
export const logger = new Logger();

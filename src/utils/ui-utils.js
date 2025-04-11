import oraPkg from 'ora';
const ora = oraPkg;
import cliProgressPkg from 'cli-progress';
const { createBar } = cliProgressPkg;
import boxenPkg from 'boxen';
const boxen = boxenPkg;
import tablePkg from 'table';
const { table } = tablePkg;
import inquirerPkg from 'inquirer';
const inquirer = inquirerPkg;
import figletPkg from 'figlet';
const figlet = figletPkg;
import colors from './colors.js';

class UIUtils {
  constructor(options = {}) {
    this.options = {
      colors: true,
      verbose: false,
      ...options
    };
  }

  // Basic styling methods
  header(message) {
    console.log('\n' + (this.options.colors ? colors.blue(colors.bold(`=== ${message} ===`)) : `=== ${message} ===`));
  }

  success(message) {
    console.log(this.options.colors ? colors.green(`✓ ${message}`) : `✓ ${message}`);
  }

  warning(message) {
    console.log(this.options.colors ? colors.yellow(`⚠ ${message}`) : `⚠ ${message}`);
  }

  error(message) {
    console.log(this.options.colors ? colors.red(`✗ ${message}`) : `✗ ${message}`);
  }

  info(message) {
    console.log(this.options.colors ? colors.cyan(`ℹ ${message}`) : `ℹ ${message}`);
  }

  // Progress indicators
  createSpinner(message) {
    return ora({
      text: message,
      spinner: 'dots',
      color: this.options.colors ? 'cyan' : 'white'
    });
  }

  createProgressBar(total, format) {
    return new createBar({
      format: format || 'Progress |{bar}| {percentage}% | {value}/{total}',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
      clearOnComplete: true
    });
  }

  // Boxed content
  box(message, options = {}) {
    const defaultOptions = {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'blue',
      backgroundColor: '#555555'
    };

    const boxOptions = { ...defaultOptions, ...options };
    console.log(boxen(message, boxOptions));
  }

  // Table display
  table(data, options = {}) {
    const defaultOptions = {
      border: {
        topBody: '─',
        topJoin: '┬',
        topLeft: '┌',
        topRight: '┐',
        bottomBody: '─',
        bottomJoin: '┴',
        bottomLeft: '└',
        bottomRight: '┘',
        bodyLeft: '│',
        bodyRight: '│',
        bodyJoin: '│',
        joinBody: '─',
        joinLeft: '├',
        joinRight: '┤',
        joinJoin: '┼'
      }
    };

    console.log(table(data, { ...defaultOptions, ...options }));
  }

  // Interactive prompts
  async confirm(message, defaultValue = true) {
    const { confirmed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue
    }]);
    return confirmed;
  }

  async select(message, choices) {
    const { selected } = await inquirer.prompt([{
      type: 'list',
      name: 'selected',
      message,
      choices
    }]);
    return selected;
  }

  async checkbox(message, choices) {
    const { selected } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selected',
      message,
      choices
    }]);
    return selected;
  }

  // ASCII art
  logo() {
    console.log(
      colors.cyan(
        figlet.textSync('Design Token Crawler', {
          font: 'Standard',
          horizontalLayout: 'default',
          verticalLayout: 'default'
        })
      )
    );
    console.log(colors.cyan('v1.0.0') + colors.underline(' - Extract design tokens from websites\n'));
  }
}

// Create a singleton instance
const ui = new UIUtils();

// Export both the class and the pre-initialized instance
export { UIUtils, ui };
export default UIUtils;
import chalkPkg from 'chalk';
const chalk = chalkPkg;

export default {
  cyan: (text) => chalk.cyan(text),
  green: (text) => chalk.green(text),
  red: (text) => chalk.red(text),
  yellow: (text) => chalk.yellow(text),
  blue: (text) => chalk.blue(text),
  bold: (text) => chalk.bold(text),
  underline: (text) => chalk.underline(text)
};
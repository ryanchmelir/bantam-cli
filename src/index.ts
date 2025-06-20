#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { deployCommand } from './commands/deploy.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { listCommand } from './commands/list.js';
import { deleteCommand } from './commands/delete.js';
import { whoamiCommand } from './commands/whoami.js';
import { domainsCommand } from './commands/domains.js';
import { primary } from './utils/display.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

const program = new Command();

program
  .name('bantam')
  .description(primary('Bantam CLI') + ' - Deploy and manage your static sites')
  .version(packageJson.version, '-v, --version', 'output the version number');

program.addCommand(deployCommand);
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(listCommand);
program.addCommand(deleteCommand);
program.addCommand(whoamiCommand);
program.addCommand(domainsCommand);

program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (error: any) {
  if (error.code === 'commander.help' || error.code === 'commander.version') {
    process.exit(0);
  }
  if (error.message && error.message !== '(outputHelp)') {
    console.error(chalk.red('Error:'), error.message);
  }
  process.exit(1);
}
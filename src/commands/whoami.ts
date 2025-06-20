import { Command } from 'commander';
import chalk from 'chalk';
import { getConfig, isAuthenticated } from '../utils/config.js';
import { apiClient } from '../utils/api.js';
import { error, info } from '../utils/display.js';

export const whoamiCommand = new Command('whoami')
  .description('Display information about the current user')
  .action(async () => {
    try {
      if (!isAuthenticated()) {
        info('Not logged in. Run "bantam login" to authenticate.');
        return;
      }
      
      const config = getConfig();
      const result = await apiClient.validateToken();
      
      if (!result.success || !result.data?.valid) {
        error('Your authentication token is invalid or expired. Please login again.');
        process.exit(1);
      }
      
      console.log(chalk.cyan('Current User:'));
      console.log(`  Email: ${chalk.bold(result.data.user.email || 'N/A')}`);
      console.log(`  User ID: ${chalk.gray(result.data.user.id)}`);
      
      if (result.data.user.tier) {
        console.log(`  Tier: ${chalk.bold(result.data.user.tier)}`);
      }
      
      console.log(`  API URL: ${chalk.gray(config.apiUrl)}`);
    } catch (err) {
      error(`Failed to get user info: ${err instanceof Error ? err.message : 'Unknown error'}`);
      process.exit(1);
    }
  });
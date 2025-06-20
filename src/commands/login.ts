import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { setToken, setEmail } from '../utils/config.js';
import { apiClient } from '../utils/api.js';
import { success, error, info, primary } from '../utils/display.js';

export const loginCommand = new Command('login')
  .description('Authenticate with your Bantam account')
  .option('-t, --token <token>', 'Use a personal access token')
  .action(async (options) => {
    try {
      let token: string;
      
      if (options.token) {
        token = options.token;
      } else {
        console.log(primary('Login to Bantam'));
        console.log(chalk.gray('You can create a personal access token at: ') + primary.underline('https://bantam.host/account'));
        console.log();
        
        const answers = await inquirer.prompt([
          {
            type: 'password',
            name: 'token',
            message: 'Personal Access Token:',
            validate: (input) => {
              if (!input) {
                return 'Token is required';
              }
              return true;
            }
          }
        ]);
        
        token = answers.token;
      }
      
      // Set the token temporarily to validate it
      setToken(token);
      
      // Validate the token
      const result = await apiClient.validateToken();
      
      if (!result.success) {
        error('Authentication failed: ' + (result.error?.error || 'Unknown error'));
        process.exit(1);
      }
      
      // Save the email if available
      if (result.data?.user?.email) {
        setEmail(result.data.user.email);
      }
      
      success(`Logged in successfully${result.data?.user?.email ? ` as ${result.data.user.email}` : ''}`);
      
      if (result.data?.user?.tier) {
        info(`Account tier: ${chalk.bold(result.data.user.tier)}`);
      }
    } catch (err) {
      error(`Login failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      process.exit(1);
    }
  });
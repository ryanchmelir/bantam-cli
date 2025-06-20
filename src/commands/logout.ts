import { Command } from 'commander';
import { clearConfig, getConfig } from '../utils/config.js';
import { success, info } from '../utils/display.js';

export const logoutCommand = new Command('logout')
  .description('Log out from your Bantam account')
  .action(() => {
    const config = getConfig();
    const email = config.email;
    
    clearConfig();
    
    success('Logged out successfully');
    if (email) {
      info(`You were logged in as ${email}`);
    }
  });
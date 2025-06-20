import { Command } from 'commander';
import chalk from 'chalk';
import { isAuthenticated } from '../utils/config.js';
import { apiClient } from '../utils/api.js';
import { error, info, success, warning, printTable } from '../utils/display.js';

export const domainsCommand = new Command('domains')
  .description('List your custom domains')
  .option('--verbose', 'Show detailed domain information')
  .action(async (options) => {
    try {
      if (!isAuthenticated()) {
        error('Authentication required. Run "bantam login" first.');
        process.exit(1);
      }

      const result = await apiClient.getDomains();
      
      if (!result.success || !result.data) {
        error('Failed to fetch domains: ' + (result.error?.message || 'Unknown error'));
        process.exit(1);
      }

      const domains = result.data;
      
      if (domains.length === 0) {
        info('No custom domains found.');
        console.log();
        console.log('To add a custom domain:');
        console.log('  1. Visit https://bantam.host/domains');
        console.log('  2. Add and verify your domain');
        console.log('  3. Deploy with: bantam deploy --domain yourdomain.com');
        console.log();
        console.log('Pro tip: Enable wildcard support to deploy to any subdomain!');
        return;
      }

      console.log(chalk.cyan(`\nFound ${domains.length} domain${domains.length === 1 ? '' : 's'}:\n`));

      if (options.verbose) {
        domains.forEach((domain, index) => {
          if (index > 0) console.log(chalk.gray('─'.repeat(50)));
          
          console.log(`${chalk.bold('Domain:')} ${domain.domain}`);
          console.log(`${chalk.bold('Status:')} ${domain.verification_status === 'verified' ? chalk.green('Verified ✓') : chalk.yellow('Pending verification')}`);
          console.log(`${chalk.bold('Active:')} ${domain.status === 'active' ? chalk.green('Yes') : chalk.red('No')}`);
          console.log(`${chalk.bold('Wildcard:')} ${domain.wildcard_enabled ? chalk.green('Enabled') : chalk.gray('Disabled')}`);
          
          if (domain.wildcard_enabled && domain.wildcard_verification_status) {
            console.log(`${chalk.bold('Wildcard Status:')} ${domain.wildcard_verification_status === 'verified' ? chalk.green('Verified ✓') : chalk.yellow('Pending')}`);
          }
          
          if (domain.verification_status !== 'verified') {
            console.log();
            warning('This domain needs verification. Visit https://bantam.host/domains to complete setup.');
          }
          
          if (domain.wildcard_enabled && domain.wildcard_verification_status !== 'verified') {
            console.log();
            warning('Wildcard subdomain needs verification. Visit https://bantam.host/domains to complete setup.');
          }
          
          console.log(`${chalk.bold('Verification Method:')} ${domain.verification_method.toUpperCase()}`);
          console.log(`${chalk.bold('Created:')} ${new Date(domain.created_at).toLocaleDateString()}`);
          console.log(`${chalk.bold('ID:')} ${chalk.gray(domain.id)}`);
          console.log();
        });
      } else {
        const tableData = domains.map(domain => ({
          Domain: domain.domain,
          Status: domain.verification_status === 'verified' ? chalk.green('Verified') : chalk.yellow('Pending'),
          Active: domain.status === 'active' ? chalk.green('Yes') : chalk.red('No'),
          Wildcard: domain.wildcard_enabled ? chalk.green('Enabled') : chalk.gray('Disabled')
        }));
        
        printTable(tableData);
      }

      const verifiedCount = domains.filter(d => d.verification_status === 'verified').length;
      const pendingCount = domains.filter(d => d.verification_status !== 'verified').length;
      
      console.log();
      success(`${verifiedCount} verified domain${verifiedCount === 1 ? '' : 's'}`);
      if (pendingCount > 0) {
        warning(`${pendingCount} domain${pendingCount === 1 ? '' : 's'} pending verification`);
      }

      console.log();
      console.log(chalk.gray('Deploy to a custom domain with: bantam deploy --domain yourdomain.com'));
      
      const wildcardDomains = domains.filter(d => d.wildcard_enabled && d.wildcard_verification_status === 'verified');
      if (wildcardDomains.length > 0) {
        console.log(chalk.gray('Deploy to a subdomain with: bantam deploy --domain subdomain.yourdomain.com'));
      }
      
      console.log();
      console.log(chalk.gray('Manage domains at: https://bantam.host/domains'));

    } catch (err) {
      error(`Failed to list domains: ${err instanceof Error ? err.message : 'Unknown error'}`);
      process.exit(1);
    }
  });
import { Command } from 'commander';
import chalk from 'chalk';
import { isAuthenticated } from '../utils/config.js';
import { apiClient } from '../utils/api.js';
import { error, info, warning, formatBytes, formatDate, printTable, primary } from '../utils/display.js';

export const listCommand = new Command('list')
  .alias('ls')
  .description('List your projects')
  .option('-l, --long', 'Show detailed information')
  .option('-a, --all', 'Show all projects including expired ones')
  .action(async (options) => {
    try {
      if (!isAuthenticated()) {
        error('Authentication required. Run "bantam login" first.');
        process.exit(1);
      }

      const result = await apiClient.getProjects();
      
      if (!result.success || !result.data) {
        error('Failed to fetch projects: ' + (result.error?.message || 'Unknown error'));
        process.exit(1);
      }

      const projects = result.data;
      
      if (projects.length === 0) {
        info('No projects found. Deploy your first project with "bantam deploy"');
        return;
      }

      // Filter out expired projects unless --all is specified
      const now = new Date();
      const filteredProjects = options.all 
        ? projects 
        : projects.filter(p => !p.expires_at || new Date(p.expires_at) > now);

      if (filteredProjects.length === 0) {
        info('No active projects found. Use --all to see expired projects.');
        return;
      }

      console.log(chalk.cyan(`\nFound ${filteredProjects.length} project${filteredProjects.length === 1 ? '' : 's'}:\n`));

      if (options.long) {
        filteredProjects.forEach((project, index) => {
          if (index > 0) console.log(chalk.gray('─'.repeat(50)));
          
          console.log(`${chalk.bold('Name:')} ${project.name}`);
          console.log(`${chalk.bold('URL:')} ${primary.underline(`https://${project.url}`)}`);
          console.log(`${chalk.bold('Type:')} ${project.type}`);
          console.log(`${chalk.bold('Status:')} ${project.status === 'active' ? chalk.green(project.status) : chalk.yellow(project.status)}`);
          
          if (project.r2_status) {
            let deployStatus = project.r2_status;
            let deployColor = chalk.yellow;
            
            if (project.r2_status === 'ready' || project.r2_status === 'deployed') {
              deployColor = chalk.green;
              deployStatus = 'deployed';
            } else if (project.r2_status === 'failed') {
              deployColor = chalk.red;
              deployStatus = `failed${project.cdn_error ? `: ${project.cdn_error}` : ''}`;
            } else if (project.r2_status === 'processing' || project.r2_status === 'syncing_to_cdn') {
              deployColor = chalk.blue;
              deployStatus = 'deploying...';
            }
            
            console.log(`${chalk.bold('Deploy:')} ${deployColor(deployStatus)}`);
          }
          
          console.log(`${chalk.bold('Created:')} ${formatDate(project.created_at)}`);
          
          if (project.expires_at) {
            const expiryDate = new Date(project.expires_at);
            const isExpired = expiryDate < now;
            console.log(`${chalk.bold('Expires:')} ${isExpired ? chalk.red(formatDate(project.expires_at) + ' (EXPIRED)') : chalk.yellow(formatDate(project.expires_at))}`);
          } else {
            console.log(`${chalk.bold('Expires:')} ${chalk.green('Never (Permanent)')}`);
          }
          
          if (project.file_count !== undefined) {
            console.log(`${chalk.bold('Files:')} ${project.file_count}`);
          }
          
          if (project.storage_size !== undefined) {
            console.log(`${chalk.bold('Size:')} ${formatBytes(project.storage_size)}`);
          }
          
          console.log(`${chalk.bold('ID:')} ${chalk.gray(project.id)}`);
          console.log();
        });
      } else {
        const tableData = filteredProjects.map(project => {
          const expiryDate = project.expires_at ? new Date(project.expires_at) : null;
          const isExpired = expiryDate && expiryDate < now;
          
          return {
            Name: project.name,
            URL: project.url,
            Type: project.type,
            Status: project.status,
            Expires: expiryDate 
              ? (isExpired ? chalk.red('EXPIRED') : formatDate(project.expires_at!))
              : chalk.green('Never'),
            ID: chalk.gray(project.id.substring(0, 8) + '...')
          };
        });
        
        printTable(tableData);
      }

      const activeCount = filteredProjects.filter(p => !p.expires_at || new Date(p.expires_at) > now).length;
      const expiredCount = filteredProjects.filter(p => p.expires_at && new Date(p.expires_at) <= now).length;
      
      console.log();
      if (expiredCount > 0) {
        warning(`${expiredCount} project${expiredCount === 1 ? ' has' : 's have'} expired`);
      }
      info(`${activeCount} active project${activeCount === 1 ? '' : 's'}`);
      
      console.log();
      console.log(chalk.gray('Tip: Use --long flag to see full project IDs for delete/manage commands'));

    } catch (err) {
      error(`Failed to list projects: ${err instanceof Error ? err.message : 'Unknown error'}`);
      process.exit(1);
    }
  });
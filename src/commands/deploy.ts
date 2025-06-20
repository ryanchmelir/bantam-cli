import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { isAuthenticated } from '../utils/config.js';
import { apiClient } from '../utils/api.js';
import { 
  getFileInfo, 
  createZipFromDirectory, 
  findIndexFile, 
  isDirectory,
  getDirectorySize
} from '../utils/files.js';
import { 
  success, 
  error, 
  warning, 
  info, 
  createSpinner,
  createProgressBar,
  formatBytes,
  primary
} from '../utils/display.js';
import type { DeployOptions } from '../types/index.js';

export const deployCommand = new Command('deploy')
  .description('Deploy a file or directory to Bantam')
  .argument('[path]', 'Path to file or directory to deploy', '.')
  .option('-s, --subdomain <subdomain>', 'Custom subdomain on bantam.site (e.g., -s myapp → myapp.bantam.site)')
  .option('-d, --domain <domain>', 'Custom domain (e.g., example.com or app.example.com)')
  .option('-p, --permanent', 'Create a permanent project (requires authentication)')
  .option('-e, --expiry-days <days>', 'Number of days before project expires', parseInt)
  .option('-y, --yes', 'Skip confirmation prompts')
  .addHelpText('after', `
Examples:
  $ bantam deploy                        # Deploy to random subdomain on bantam.site
  $ bantam deploy -s myapp               # Deploy to myapp.bantam.site
  $ bantam deploy -d example.com         # Deploy to apex domain (example.com)
  $ bantam deploy -d app.example.com     # Deploy to subdomain (requires wildcard)

Note: -s is for bantam.site subdomains only. For custom domain subdomains, use -d with the full domain.
`)
  .action(async (deployPath: string, options: DeployOptions) => {
    try {
      // Check if path exists
      const fullPath = path.resolve(deployPath);
      if (!fs.existsSync(fullPath)) {
        error(`Path does not exist: ${fullPath}`);
        process.exit(1);
      }

      if (options.subdomain && options.domain) {
        error('Cannot use both -s (subdomain) and -d (domain) together.');
        info('Use -s for bantam.site subdomains, or -d for custom domains.');
        process.exit(1);
      }

      const authenticated = isAuthenticated();
      if (options.permanent && !authenticated) {
        error('Authentication required for permanent projects. Run "bantam login" first.');
        process.exit(1);
      }

      if (options.domain && !authenticated) {
        error('Authentication required for custom domains. Run "bantam login" first.');
        process.exit(1);
      }

      let fileToUpload: string;
      let projectName: string;
      
      if (isDirectory(fullPath)) {
        const indexFile = findIndexFile(fullPath);
        if (!indexFile && !options.yes) {
          const { proceed } = await inquirer.prompt([{
            type: 'confirm',
            name: 'proceed',
            message: 'No index.html found. Deploy anyway?',
            default: true
          }]);
          
          if (!proceed) {
            info('Deployment cancelled.');
            return;
          }
        }

        const dirSize = await getDirectorySize(fullPath);
        info(`Directory size: ${formatBytes(dirSize)}`);

        const spinner = createSpinner('Creating archive...');
        fileToUpload = await createZipFromDirectory(fullPath);
        spinner.succeed('Archive created');
        
        projectName = path.basename(fullPath);
      } else {
        fileToUpload = fullPath;
        projectName = path.basename(fullPath, path.extname(fullPath));
      }

      const fileInfo = await getFileInfo(fileToUpload);
      
      let subdomain = options.subdomain;
      let domainId: string | undefined;
      
      if (options.domain && authenticated) {
        const domainsResult = await apiClient.getDomains();
        if (!domainsResult.success || !domainsResult.data) {
          error('Failed to fetch domains');
          process.exit(1);
        }
        
        const domainParts = options.domain.split('.');
        const isLikelySubdomain = domainParts.length > 2;
        
        let domain = domainsResult.data.find(d => d.domain === options.domain);
        
        if (!domain && isLikelySubdomain) {
          for (const d of domainsResult.data) {
            if (options.domain.endsWith('.' + d.domain)) {
              subdomain = options.domain.slice(0, -(d.domain.length + 1));
              domain = d;
              
              if (!d.wildcard_enabled) {
                error(`Domain ${d.domain} does not have wildcard support enabled.`);
                info(`To deploy to ${options.domain}, enable wildcard support at https://bantam.host/domains`);
                process.exit(1);
              }
              
              if (d.wildcard_verification_status !== 'verified') {
                error(`Wildcard support for ${d.domain} is not verified.`);
                info('Please complete DNS verification at https://bantam.host/domains');
                process.exit(1);
              }
              
              info(`Deploying to: ${chalk.bold(options.domain)}`);
              break;
            }
          }
        }
        
        if (!domain) {
          error(`Domain ${options.domain} not found or not verified.`);
          info('Add and verify your domain at https://bantam.host/domains');
          process.exit(1);
        }
        
        domainId = domain.id;
      }

      if (subdomain) {
        const spinner = createSpinner('Checking subdomain availability...');
        const checkResult = await apiClient.checkSubdomainAvailability(subdomain, domainId);
        
        if (!checkResult.success || !checkResult.data?.available) {
          spinner.fail('Subdomain not available');
          
          const genResult = await apiClient.generateSubdomain(domainId);
          if (genResult.success && genResult.data) {
            subdomain = genResult.data.slug;
            info(`Generated subdomain: ${chalk.bold(subdomain)}`);
          } else {
            error('Failed to generate subdomain');
            process.exit(1);
          }
        } else {
          spinner.succeed('Subdomain available');
        }
      }

      if (!options.yes) {
        console.log('\n' + chalk.cyan('Deployment Summary:'));
        console.log(`  File: ${chalk.bold(fileInfo.name)}`);
        console.log(`  Size: ${chalk.bold(formatBytes(fileInfo.size))}`);
        console.log(`  Project: ${chalk.bold(projectName)}`);
        
        if (options.domain) {
          console.log(`  URL: ${chalk.bold('https://' + options.domain)}`);
        } else if (subdomain) {
          console.log(`  URL: ${chalk.bold('https://' + subdomain + '.bantam.site')}`);
        } else {
          console.log(`  URL: ${chalk.bold('[random].bantam.site')} (generated after upload)`);
        }
        
        console.log(`  Type: ${chalk.bold(options.permanent ? 'Permanent' : 'Temporary')}`);
        if (!options.permanent && options.expiryDays) {
          console.log(`  Expires in: ${chalk.bold(options.expiryDays + ' days')}`);
        }
        console.log();

        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: primary('Deploy to Bantam?'),
          default: true
        }]);

        if (!confirm) {
          info('Deployment cancelled.');
          return;
        }
      }

      const presignSpinner = createSpinner('Getting upload URL...');
      const presignResult = await apiClient.getPresignedUrl(fileInfo);
      
      if (!presignResult.success || !presignResult.data) {
        presignSpinner.fail('Failed to get upload URL');
        error(presignResult.error?.message || 'Unknown error');
        process.exit(1);
      }
      presignSpinner.succeed('Upload URL obtained');

      console.log();
      const progressBar = createProgressBar(fileInfo.size);
      
      const uploadResult = await apiClient.uploadFile(
        fileToUpload,
        presignResult.data.uploadUrl,
        (progress) => {
          progressBar.update(progress / 100);
        }
      );

      if (!uploadResult.success) {
        error('Upload failed: ' + (uploadResult.error?.error || 'Unknown error'));
        process.exit(1);
      }

      const completeSpinner = createSpinner('Finalizing upload...');
      const completeResult = await apiClient.completeUpload(presignResult.data.fileId);
      
      if (!completeResult.success) {
        completeSpinner.fail('Failed to finalize upload');
        process.exit(1);
      }
      completeSpinner.succeed('Upload finalized');

      const projectSpinner = createSpinner('Creating project...');
      const projectResult = await apiClient.createProject(
        presignResult.data.fileId,
        projectName,
        {
          subdomain,
          domain_id: domainId,
          permanent: options.permanent,
          expiry_days: options.expiryDays
        }
      );

      if (!projectResult.success || !projectResult.data) {
        projectSpinner.fail('Failed to create project');
        error(projectResult.error?.message || 'Unknown error');
        process.exit(1);
      }
      
      projectSpinner.succeed('Project created successfully!');

      if (isDirectory(fullPath)) {
        fs.unlinkSync(fileToUpload);
      }

      const deploymentSpinner = createSpinner('Processing deployment...');
      const projectId = projectResult.data.project.id;
      let retries = 0;
      const maxRetries = 60;
      let deploymentSuccess = false;
      
      while (retries < maxRetries) {
        const statusResult = await apiClient.checkProjectStatus(projectId);
        
        if (!statusResult.success || !statusResult.data) {
          deploymentSpinner.warn('Unable to monitor deployment status');
          break;
        }
        
        const status = statusResult.data;
        
        switch (status.r2_status) {
          case 'awaiting_upload':
            deploymentSpinner.text = 'Awaiting upload...';
            break;
          case 'uploading':
            deploymentSpinner.text = 'Uploading files...';
            break;
          case 'upload_complete':
            deploymentSpinner.text = 'Upload complete...';
            break;
          case 'creating_project':
            deploymentSpinner.text = 'Creating project...';
            break;
          case 'project_created':
            deploymentSpinner.text = 'Project created, starting processing...';
            break;
          case 'queued_for_processing':
            deploymentSpinner.text = 'Queued for processing...';
            break;
          case 'validating':
            deploymentSpinner.text = 'Validating files...';
            break;
          case 'processing':
            deploymentSpinner.text = 'Processing files...';
            break;
          case 'moving_to_storage':
            deploymentSpinner.text = 'Moving to storage...';
            break;
          case 'syncing_to_cdn':
            deploymentSpinner.text = 'Syncing to CDN...';
            break;
          case 'ready':
          case 'deployed':
            deploymentSpinner.succeed('Deployment complete!');
            deploymentSuccess = true;
            break;
          case 'failed':
            deploymentSpinner.fail(`Deployment failed: ${status.cdn_error || 'Unknown error'}`);
            process.exit(1);
          case 'cancelled':
            deploymentSpinner.fail('Deployment was cancelled');
            process.exit(1);
          default:
            deploymentSpinner.text = `Processing: ${status.r2_status}...`;
        }
        
        if (deploymentSuccess || status.r2_status === 'failed' || status.r2_status === 'cancelled') {
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        retries++;
      }
      
      if (retries >= maxRetries) {
        deploymentSpinner.warn('Deployment monitoring timed out. Check your project status online.');
      }

      console.log();
      console.log(primary('✓ Deployment complete! 🎉'));
      console.log();
      console.log(chalk.cyan('Project Details:'));
      console.log(`  URL: ${primary.bold.underline(`https://${projectResult.data.project.url}`)}`);
      console.log(`  Project ID: ${chalk.gray(projectResult.data.project.id)}`);
      
      if (projectResult.data.project.expires_at) {
        console.log(`  Expires: ${chalk.yellow(new Date(projectResult.data.project.expires_at).toLocaleDateString())}`);
      } else if (options.permanent) {
        console.log(`  Type: ${chalk.green('Permanent')}`);
      }
      
      console.log();
      if (deploymentSuccess) {
        info('Your site is now live!');
      } else {
        info('Your site will be live shortly. Check status with: bantam list');
      }

    } catch (err) {
      error(`Deployment failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      process.exit(1);
    }
  });
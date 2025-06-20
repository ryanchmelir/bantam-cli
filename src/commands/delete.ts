import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { isAuthenticated } from '../utils/config.js';
import { apiClient } from '../utils/api.js';
import { error, success, warning, createSpinner } from '../utils/display.js';

export const deleteCommand = new Command('delete')
  .alias('rm')
  .description('Delete a project')
  .argument('<projectId>', 'Project ID (use "bantam list" to see IDs)')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (projectId: string, options) => {
    try {
      if (!isAuthenticated()) {
        error('Authentication required. Run "bantam login" first.');
        process.exit(1);
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(projectId)) {
        error('Invalid project ID format. Use "bantam list" to see project IDs.');
        process.exit(1);
      }

      const projectsResult = await apiClient.getProjects();
      
      if (!projectsResult.success || !projectsResult.data) {
        error('Failed to fetch projects');
        process.exit(1);
      }

      const project = projectsResult.data.find(p => p.id === projectId);

      if (!project) {
        error(`Project not found: ${projectId}`);
        error('Use "bantam list" to see available projects.');
        process.exit(1);
      }

      console.log(chalk.cyan('\nProject to delete:'));
      console.log(`  Name: ${chalk.bold(project.name)}`);
      console.log(`  URL: ${chalk.bold(project.url)}`);
      console.log(`  Created: ${new Date(project.created_at).toLocaleDateString()}`);
      
      if (!options.yes) {
        console.log();
        warning('This action cannot be undone!');
        
        const { confirmDelete } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirmDelete',
          message: `Are you sure you want to delete "${project.name}"?`,
          default: false
        }]);

        if (!confirmDelete) {
          console.log('Deletion cancelled.');
          return;
        }

        const { confirmName } = await inquirer.prompt([{
          type: 'input',
          name: 'confirmName',
          message: `Type the project name "${project.name}" to confirm:`,
          validate: (input) => {
            if (input !== project.name) {
              return 'Project name does not match';
            }
            return true;
          }
        }]);

        if (confirmName !== project.name) {
          console.log('Deletion cancelled.');
          return;
        }
      }

      const spinner = createSpinner('Deleting project...');
      
      const deleteResult = await apiClient.deleteProject(project.id);
      
      if (!deleteResult.success) {
        spinner.fail('Failed to delete project');
        error(deleteResult.error?.message || 'Unknown error');
        process.exit(1);
      }

      spinner.succeed('Project deleted successfully');
      success(`Project "${project.name}" has been deleted`);

    } catch (err) {
      error(`Failed to delete project: ${err instanceof Error ? err.message : 'Unknown error'}`);
      process.exit(1);
    }
  });
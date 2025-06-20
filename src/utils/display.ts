import chalk from 'chalk';
import ora, { Ora } from 'ora';
import ProgressBar from 'progress';

export const primary = chalk.hex('#f45c48');

export const success = (message: string): void => {
  console.log(chalk.green('✓'), message);
};

export const error = (message: string): void => {
  console.error(chalk.red('✗'), message);
};

export const warning = (message: string): void => {
  console.log(chalk.yellow('⚠'), message);
};

export const info = (message: string): void => {
  console.log(chalk.blue('ℹ'), message);
};

export const createSpinner = (text: string): Ora => {
  return ora({
    text,
    spinner: 'dots'
  }).start();
};

export const createProgressBar = (total: number, format: string = 'Uploading [:bar] :percent :etas'): ProgressBar => {
  return new ProgressBar(format, {
    complete: '█',
    incomplete: '░',
    width: 40,
    total
  });
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getVisualLength = (str: string): number => {
  return str.replace(/\u001b\[[0-9;]*m/g, '').length;
};

export const printTable = (data: Record<string, any>[]): void => {
  if (data.length === 0) return;
  
  const keys = Object.keys(data[0]);
  const columnWidths: Record<string, number> = {};
  
  // Calculate column widths based on visual length
  keys.forEach(key => {
    columnWidths[key] = Math.max(
      key.length,
      ...data.map(row => getVisualLength(String(row[key] || '')))
    );
  });
  
  // Print header
  const header = keys.map(key => key.padEnd(columnWidths[key])).join(' | ');
  console.log(chalk.bold(header));
  console.log(keys.map(key => '-'.repeat(columnWidths[key])).join('-+-'));
  
  // Print rows
  data.forEach(row => {
    const rowStr = keys.map(key => {
      const value = String(row[key] || '');
      const visualLen = getVisualLength(value);
      const padding = columnWidths[key] - visualLen;
      return value + ' '.repeat(padding);
    }).join(' | ');
    console.log(rowStr);
  });
};
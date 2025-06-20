import Conf from 'conf';
import type { AuthConfig } from '../types/index.js';

const config = new Conf<AuthConfig>({
  projectName: 'bantam-cli',
  projectSuffix: '',
  configName: 'config',
  schema: {
    token: { type: 'string' },
    email: { type: 'string' },
    apiUrl: { type: 'string' }
  }
});

export const getConfig = (): AuthConfig => {
  return {
    token: config.get('token'),
    email: config.get('email'),
    apiUrl: config.get('apiUrl') || process.env.BANTAM_API_URL || 'https://api.bantam.host'
  };
};

export const setToken = (token: string): void => {
  config.set('token', token);
};

export const setEmail = (email: string): void => {
  config.set('email', email);
};

export const clearConfig = (): void => {
  config.clear();
};

export const isAuthenticated = (): boolean => {
  return !!config.get('token');
};
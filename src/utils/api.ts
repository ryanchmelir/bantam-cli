import fetch, { Response } from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getConfig } from './config.js';
import type { ApiResponse, PresignResponse, CreateProjectResponse, Project, Domain } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8')
);

class ApiClient {
  private getHeaders(): Record<string, string> {
    const config = getConfig();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': `Bantam-CLI/${packageJson.version}`,
      'Accept': 'application/json',
    };

    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      
      if (!response.ok) {
        return {
          success: false,
          error: data
        };
      }
      
      return {
        success: true,
        data: data as T
      };
    } catch (error) {
      return {
        success: false,
        error: {
          error: response.ok 
            ? 'Invalid JSON response from server' 
            : `Request failed with status ${response.status}`
        }
      };
    }
  }

  async getPresignedUrl(file: { name: string; size: number; type: string }): Promise<ApiResponse<PresignResponse>> {
    const config = getConfig();
    const response = await fetch(`${config.apiUrl}/uploads/presign`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        filename: file.name,
        type: file.type,
        size: file.size
      })
    });

    return this.handleResponse<PresignResponse>(response);
  }

  async uploadFile(
    filePath: string, 
    uploadUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<void>> {
    try {
      const fileStream = fs.createReadStream(filePath);
      const stats = fs.statSync(filePath);
      
      let uploaded = 0;
      fileStream.on('data', (chunk) => {
        uploaded += chunk.length;
        if (onProgress) {
          const progress = (uploaded / stats.size) * 100;
          onProgress(progress);
        }
      });

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: fileStream,
        headers: {
          'Content-Length': stats.size.toString(),
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            error: `Upload failed with status ${response.status}`
          }
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          error: error instanceof Error ? error.message : 'Upload failed'
        }
      };
    }
  }

  async completeUpload(fileId: string): Promise<ApiResponse<{ fileId: string }>> {
    const config = getConfig();
    const response = await fetch(`${config.apiUrl}/uploads/${fileId}/complete`, {
      method: 'POST',
      headers: this.getHeaders()
    });

    return this.handleResponse<{ fileId: string }>(response);
  }

  async createProject(
    fileId: string,
    name: string,
    options?: {
      subdomain?: string;
      domain_id?: string;
      description?: string;
      permanent?: boolean;
      expiry_days?: number;
    }
  ): Promise<ApiResponse<CreateProjectResponse>> {
    const config = getConfig();
    const response = await fetch(`${config.apiUrl}/projects`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        fileId,
        name,
        type: 'site',
        ...options
      })
    });

    return this.handleResponse<CreateProjectResponse>(response);
  }

  async getProjects(): Promise<ApiResponse<Project[]>> {
    const config = getConfig();
    const response = await fetch(`${config.apiUrl}/account/projects`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: { 
          error: `HTTP ${response.status}`, 
          message: error || response.statusText 
        }
      };
    }

    // The API returns projects through an RPC function, we need to extract them
    const result = await response.json() as any;
    if (Array.isArray(result)) {
      return {
        success: true,
        data: result as Project[]
      };
    }

    // If we got a non-array response, handle it as an error
    return {
      success: false,
      error: { 
        error: 'Invalid response format', 
        message: 'Expected an array of projects' 
      }
    };
  }

  async deleteProject(projectId: string): Promise<ApiResponse<void>> {
    const config = getConfig();
    const response = await fetch(`${config.apiUrl}/projects/status/${projectId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status: 'deleted' })
    });

    return this.handleResponse<void>(response);
  }

  async getDomains(): Promise<ApiResponse<Domain[]>> {
    const config = getConfig();
    const response = await fetch(`${config.apiUrl}/domains`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    return this.handleResponse<Domain[]>(response);
  }

  async validateToken(): Promise<ApiResponse<{ valid: boolean; user: { id: string; email?: string; tier?: string } }>> {
    const config = getConfig();
    const response = await fetch(`${config.apiUrl}/auth/tokens/validate`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    return this.handleResponse<{ valid: boolean; user: { id: string; email?: string; tier?: string } }>(response);
  }

  async checkSubdomainAvailability(subdomain: string, domainId?: string): Promise<ApiResponse<{ available: boolean; subdomain: string; domain_id: string }>> {
    const config = getConfig();
    const params = new URLSearchParams({ subdomain });
    if (domainId) {
      params.append('domain_id', domainId);
    }

    const response = await fetch(`${config.apiUrl}/slugs/check?${params}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    return this.handleResponse<{ available: boolean; subdomain: string; domain_id: string }>(response);
  }

  async generateSubdomain(domainId?: string): Promise<ApiResponse<{ slug: string }>> {
    const config = getConfig();
    const params = new URLSearchParams();
    if (domainId) {
      params.append('domain_id', domainId);
    }

    const response = await fetch(`${config.apiUrl}/slugs/generate?${params}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    return this.handleResponse<{ slug: string }>(response);
  }

  async checkProjectStatus(projectId: string): Promise<ApiResponse<{
    id: string;
    r2_status: string;
    cdn_error?: string | null;
    file_count?: number;
    storage?: { 
      used: number;
      percentageOfUserStorage: number;
    };
  } | null>> {
    const config = getConfig();
    const response = await fetch(`${config.apiUrl}/projects/${projectId}/status`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    return this.handleResponse<{
      id: string;
      r2_status: string;
      cdn_error?: string | null;
      file_count?: number;
      storage?: { 
        used: number;
        percentageOfUserStorage: number;
      };
    } | null>(response);
  }
}

export const apiClient = new ApiClient();
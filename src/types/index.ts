export interface AuthConfig {
  token?: string;
  email?: string;
  apiUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  subdomain: string;
  domain_id: string;
  url: string;
  type: 'site' | 'spa' | 'docs';
  status: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  file_count?: number;
  storage_size?: number;
  r2_status?: string;
  cdn_error?: string | null;
}

export interface Domain {
  id: string;
  domain: string;
  owner_id: string;
  status: string;
  upstream_id: string;
  domain_id: string;
  verification_method: string;
  verification_token: string;
  verification_status: string;
  wildcard_enabled: boolean;
  created_at: string;
  updated_at: string;
  wildcard_domain_id?: string;
  wildcard_verification_status?: string;
  wildcard_verification_token?: string;
  apex_verification_required?: boolean;
  domain_mappings?: any[];
}

export interface UploadProgress {
  percentage: number;
  stage: string;
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    error: string;
    message?: string;
    [key: string]: any;
  };
}

export interface PresignResponse {
  uploadUrl: string;
  fileId: string;
  tempPath: string;
}

export interface CreateProjectResponse {
  success: boolean;
  project: {
    id: string;
    domain_id: string;
    subdomain: string;
    url: string;
    type: string;
    status: string;
    expires_at?: string;
    r2_status: string;
    fileId: string;
  };
  jobId: string;
}

export interface DeployOptions {
  path?: string;
  subdomain?: string;
  domain?: string;
  permanent?: boolean;
  expiryDays?: number;
  yes?: boolean;
}
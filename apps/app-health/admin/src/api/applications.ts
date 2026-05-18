import { apiDelete, apiGet, apiPatch, apiPost } from './client';

export interface Application {
  id: string;
  projectId?: string;
  projectName?: string;
  name: string;
  slug: string;
  description: string;
  defaultEnvironment: string;
  platforms: string[];
  status: 'active' | 'disabled';
  createdAt?: string;
  updatedAt?: string;
}

export interface ApplicationSummary extends Application {
  effectiveTokenCount: number;
  eventCount: number;
  issueCount: number;
  lastEventAt?: string;
}

export interface IngestToken {
  id: string;
  applicationId: string;
  name: string;
  prefix: string;
  plainText?: string;
  lastUsedAt?: string;
  revokedAt?: string;
  createdAt?: string;
}

export interface CreateApplicationInput {
  name: string;
  slug: string;
  description: string;
  defaultEnvironment: string;
  platforms: string[];
}

export function listApplications() {
  return apiGet<{ items: ApplicationSummary[]; total: number }>('/api/app-health/applications');
}

export function getApplication(id: string) {
  return apiGet<{ application: Application; tokens: IngestToken[] }>(
    `/api/app-health/applications/${id}`
  );
}

export function createApplication(input: CreateApplicationInput) {
  return apiPost<{ application: Application; token: IngestToken }>(
    '/api/app-health/applications',
    input
  );
}

export function updateApplication(id: string, input: Partial<Application>) {
  return apiPatch<{ application: Application }>(`/api/app-health/applications/${id}`, input);
}

export function createToken(applicationId: string, name: string) {
  return apiPost<{ token: IngestToken }>(`/api/app-health/applications/${applicationId}/tokens`, {
    name,
  });
}

export function revokeToken(id: string) {
  return apiPost<{ token: IngestToken }>(`/api/app-health/tokens/${id}/revoke`);
}

export function enableApplication(id: string) {
  return apiPost<{ application: Application }>(`/api/app-health/applications/${id}/enable`);
}

export function disableApplication(id: string) {
  return apiPost<{ application: Application }>(`/api/app-health/applications/${id}/disable`);
}

export function deleteApplication(id: string) {
  return apiDelete<{ application: Application }>(`/api/app-health/applications/${id}`);
}

export function deleteApplicationWithData(id: string, confirmAppId: string) {
  return apiDelete<{ application: Application; deletedEvents: number; deletedIssues: number }>(
    `/api/app-health/applications/${id}/data`,
    { confirmAppId }
  );
}

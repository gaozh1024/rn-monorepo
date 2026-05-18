import type { ApplicationSummary } from '../api/applications';

export interface ProjectAppOption {
  projectId: string;
  projectName: string;
  appId: string;
  appName: string;
  platforms: string[];
  status?: ApplicationSummary['status'];
}

export const defaultProjectName = 'App Health';

export function toProjectAppOption(application: ApplicationSummary): ProjectAppOption {
  return {
    projectId: application.projectId ?? 'default',
    projectName: application.projectName ?? defaultProjectName,
    appId: application.slug,
    appName: application.name || application.slug,
    platforms: application.platforms,
    status: application.status,
  };
}

export function createFallbackAppOption(appId: string): ProjectAppOption {
  return {
    projectId: 'default',
    projectName: defaultProjectName,
    appId,
    appName: appId || '全部应用',
    platforms: [],
  };
}

export function getAppDisplayName(app: ProjectAppOption) {
  return `${app.projectName} / ${app.appName}`;
}

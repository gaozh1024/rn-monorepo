export interface AppHealthReporter {
  captureException?: (error: unknown, context?: Record<string, unknown>) => void | Promise<void>;
  captureMessage?: (message: string, context?: Record<string, unknown>) => void | Promise<void>;
  addBreadcrumb?: (breadcrumb: Record<string, unknown>) => void | Promise<void>;
}

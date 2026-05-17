import { createContext } from 'react';
import type { AppHealthReporter } from './types';

export const noopAppHealthReporter: AppHealthReporter = {
  async captureException() {
    // noop by design
  },
  async captureMessage() {
    // noop by design
  },
  addBreadcrumb() {
    // noop by design
  },
  setUser() {
    // noop by design
  },
  setTags() {
    // noop by design
  },
  async flush() {
    // noop by design
  },
  dispose() {
    // noop by design
  },
};

export const AppHealthContext = createContext<AppHealthReporter>(noopAppHealthReporter);

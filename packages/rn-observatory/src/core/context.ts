import { createContext } from 'react';
import type { AppObservatoryReporter } from './types';

export const noopAppObservatoryReporter: AppObservatoryReporter = {
  async trackEvent() {
    // noop by design
  },
  async trackScreen() {
    // noop by design
  },
  async captureException() {
    // noop by design
  },
  async captureMessage() {
    // noop by design
  },
  async markAppReady() {
    // noop by design
  },
  async captureApiError() {
    // noop by design
  },
  async captureRenderException() {
    // noop by design
  },
  async captureUnhandledRejection() {
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

export const AppObservatoryContext = createContext<AppObservatoryReporter>(
  noopAppObservatoryReporter
);

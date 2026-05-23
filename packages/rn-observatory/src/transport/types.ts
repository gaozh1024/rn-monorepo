import type { AppObservatoryTransport } from '../core/types';

export interface FetchObservatoryTransportOptions {
  endpoint: string;
  ingestToken?: string;
  timeoutMs?: number;
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  fetcher?: typeof fetch;
}

export type { AppObservatoryTransport };

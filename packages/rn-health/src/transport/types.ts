import type { AppHealthTransport } from '../core/types';

export interface FetchHealthTransportOptions {
  endpoint: string;
  ingestToken?: string;
  timeoutMs?: number;
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  fetcher?: typeof fetch;
}

export type { AppHealthTransport };

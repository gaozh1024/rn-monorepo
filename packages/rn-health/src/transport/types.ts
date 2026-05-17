import type { AppHealthTransport } from '../core/types';

export interface FetchHealthTransportOptions {
  endpoint: string;
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  fetcher?: typeof fetch;
}

export type { AppHealthTransport };

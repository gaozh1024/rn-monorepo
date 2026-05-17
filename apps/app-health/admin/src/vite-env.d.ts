interface ImportMetaEnv {
  readonly VITE_APP_HEALTH_API_BASE_URL?: string;
  readonly VITE_APP_HEALTH_ADMIN_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'react-dom/client' {
  import type { ReactNode } from 'react';

  export interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }

  export function createRoot(container: Element | DocumentFragment): Root;
}

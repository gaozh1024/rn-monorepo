declare module 'react-test-renderer' {
  import type { ElementType, ReactElement } from 'react';

  export interface ReactTestInstance {
    props: Record<string, any>;
    findAllByType(type: ElementType): ReactTestInstance[];
  }

  export interface ReactTestRenderer {
    root: ReactTestInstance;
    unmount(): void;
  }

  export function create(element: ReactElement): ReactTestRenderer;
}

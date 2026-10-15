declare const __DEV__: boolean;
declare const __VUE_SUB_URL__: string;
declare module '*.css';

// The host owns its compile-time contract; the runtime checks the protocol too.
declare module 'vueSub/mount' {
  export const protocolVersion: number;
  export function mountVueSub(element: HTMLElement, options: {
    initialLocation: string;
    onNavigate: (location: string) => void;
  }): Promise<{
    updateLocation(location: string): Promise<void>;
    unmount(): void;
  }>;
}

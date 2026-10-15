export interface MountOptions {
  initialLocation: string;
  onNavigate(location: string): void;
}
export interface VueSubInstance {
  updateLocation(location: string): Promise<void>;
  unmount(): void;
}
export function assertCatalogLocation(location: string): void {
  if (!/^\/catalog(?:[/?#]|$)/.test(location) || location.includes('\\')) {
    throw new Error('Remote only accepts /catalog locations');
  }
}

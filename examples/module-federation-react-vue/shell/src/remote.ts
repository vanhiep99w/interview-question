export const remoteEntryUrl = __VUE_SUB_URL__;
type VueSubModule = typeof import('vueSub/mount');
export type VueSubInstance = Awaited<ReturnType<VueSubModule['mountVueSub']>>;
let pending: Promise<VueSubModule> | undefined;

// #region load-remote
export function loadVueSub(): Promise<VueSubModule> {
  if (!pending) {
    pending = import('vueSub/mount').then((remote) => {
      if (remote.protocolVersion !== 1 || typeof remote.mountVueSub !== 'function') {
        throw new Error('Vue remote has an incompatible mount protocol');
      }
      return remote;
    }).catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  }
  return pending;
}
// #endregion load-remote

import { createApp } from 'vue';
import { createMemoryHistory } from 'vue-router';
import CatalogApp from './CatalogApp.vue';
import { createCatalogRouter } from './router';
import { assertCatalogLocation, type MountOptions, type VueSubInstance } from './protocol';

export const protocolVersion = 1;

// #region mount-api
export async function mountVueSub(element: HTMLElement, options: MountOptions): Promise<VueSubInstance> {
  assertCatalogLocation(options.initialLocation);
  const router = createCatalogRouter(createMemoryHistory());
  await router.replace(options.initialLocation);
  await router.isReady();

  const app = createApp(CatalogApp);
  app.use(router);
  let alive = true;
  let hostUpdates = 0;
  const removeNavigationHook = router.afterEach((to, _from, failure) => {
    if (alive && !failure && hostUpdates === 0) options.onNavigate(to.fullPath);
  });
  app.mount(element);

  return {
    // The host can update a memory router without the remote writing browser history.
    async updateLocation(location) {
      if (!alive) return;
      assertCatalogLocation(location);
      if (router.currentRoute.value.fullPath === location) return;
      hostUpdates++;
      try { await router.replace(location); }
      finally { hostUpdates--; }
    },
    unmount() {
      if (!alive) return;
      alive = false;
      removeNavigationHook();
      app.unmount();
    },
  };
}
// #endregion mount-api

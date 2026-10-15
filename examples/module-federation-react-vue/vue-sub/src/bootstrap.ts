import { createApp } from 'vue';
import { createWebHistory } from 'vue-router';
import CatalogApp from './CatalogApp.vue';
import { createCatalogRouter } from './router';

// Standalone entry; the host never imports this module.
const element = document.getElementById('root');
if (!element) throw new Error('Missing #root in Vue HTML');
const router = createCatalogRouter(createWebHistory());
const app = createApp(CatalogApp);
app.use(router);
void router.isReady().then(() => app.mount(element));

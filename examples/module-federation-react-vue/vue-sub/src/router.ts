import { h } from 'vue';
import { createRouter, type RouterHistory } from 'vue-router';
import Products from './pages/Products.vue';
import ProductDetails from './pages/ProductDetails.vue';

export function createCatalogRouter(history: RouterHistory) {
  return createRouter({
    history,
    routes: [
      { path: '/', redirect: '/catalog' },
      { path: '/catalog', component: Products },
      { path: '/catalog/products/:id', component: ProductDetails },
      { path: '/:pathMatch(.*)*', component: { render: () => h('p', 'Catalog route not found.') } },
    ],
  });
}

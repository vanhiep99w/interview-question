<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';

const count = ref(0);
const route = useRoute();
</script>

<template>
  <section class="catalog-app">
    <h2>Vue catalog remote</h2>
    <p data-testid="remote-location">{{ route.fullPath }}</p>
    <nav aria-label="Catalog navigation">
      <RouterLink to="/catalog">Products</RouterLink>
      <RouterLink to="/catalog/products/42?color=blue#details">Product 42</RouterLink>
    </nav>
    <button @click="count++">Remote count: {{ count }}</button>
    <RouterView />
  </section>
</template>

<style scoped>
.catalog-app { padding: 20px; border: 1px solid #c9d9cf; border-radius: 8px; background: #f6faf7; color: #183f29; }
nav { display: flex; gap: 16px; margin: 12px 0; }
a { color: #166534; }
button { padding: 6px 10px; cursor: pointer; }
</style>

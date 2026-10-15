<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <div>
    <h3>Product list</h3>
    <p>This component was built by the Vue project, not the React shell.</p>
    <RouterLink to="/catalog/products/42?color=blue#details">Open product 42</RouterLink>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
const route = useRoute();
</script>

<template>
  <div id="details">
    <h3>Product {{ route.params.id }}</h3>
    <p>Color: {{ route.query.color ?? 'not selected' }}</p>
  </div>
</template>

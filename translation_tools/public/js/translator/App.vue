<script setup>
import { ref } from 'vue';

// biome-ignore lint/correctness/noUnusedVariables: <explanation>
const dynamicMessage = ref('Hello from App.vue');
</script>
<template>
  <div>
    <h3>{{ dynamicMessage }}</h3>
    <h4>Start editing at translation_tools/public/js/translator/App.vue</h4>
  </div>
</template>

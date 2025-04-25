<script setup>
import { onMounted } from 'vue'
// import { FrappeProvider } from 'frappe-ui'
// import { useTheme } from './hooks/useTheme'
// import { AppProvider } from './context/AppProvider.vue'
// import Dashboard from './components/Dashboard.vue';
// import { Toaster } from '@/components/ui/sonner';
// import ThemeProvider from '@/components/ThemeProvider.vue';
// import ErrorBoundary from './components/ErrorBoundary.vue';

// import { CrossIcon, InfoIcon } from 'lucide-vue-next'
// const theme = useTheme()

// const siteName = import.meta.env.VITE_SITE_NAME
// const socketPort = import.meta.env.VITE_SOCKET_PORT

onMounted(() => {
  // console.log('theme', theme)
  console.log('test')
})
</script>

<template>
  <!-- <FrappeProvider :site-name="siteName" :socket-port="socketPort"> -->
  <!-- <ErrorBoundary> -->
  <!-- <template #fallback>
    <p>Oops! Something broke.</p>
  </template> -->
  <!-- <ThemeProvider default-theme="dark" storage-key="vite-ui-theme"> -->
  <!-- <AppProvider> -->
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <main class="container mx-auto px-4 dark:bg-gray-900">
      <!-- <Dashboard /> -->
      test
    </main>
    <!-- <Toaster
              rich-colors
              position="bottom-right"
              :icons="{
                success: h(InfoIcon),
                error: h(CrossIcon),
              }"
            /> -->
  </div>
  <!-- </AppProvider> -->
  <!-- </ThemeProvider> -->
  <!-- </ErrorBoundary> -->
  <!-- </FrappeProvider> -->
</template>

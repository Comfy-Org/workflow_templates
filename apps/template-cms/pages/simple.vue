<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
    <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          🎨 ComfyUI Template Manager
        </h1>
        <p class="text-gray-600">
          Manage workflow templates with ease
        </p>
      </div>

      <div class="text-center space-y-4">
        <p class="text-gray-700 mb-4">
          Basic test page without authentication
        </p>
        
        <button
          class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          @click="goToAdmin"
        >
          🚀 Test Admin Interface
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Set page title
useHead({
  title: 'ComfyUI Template Manager - Test'
})

const goToAdmin = () => {
  navigateTo('/admin')
}
</script>
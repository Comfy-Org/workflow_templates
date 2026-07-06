<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';

const {
  src,
  name,
  class: className,
} = defineProps<{
  src?: string | null;
  name: string;
  class?: HTMLAttributes['class'];
}>();

const errored = ref(false);
watch(
  () => src,
  () => {
    errored.value = false;
  }
);

const showImage = computed(() => Boolean(src) && !errored.value);
const initial = computed(() => name.charAt(0).toUpperCase());
</script>

<template>
  <img
    v-if="showImage"
    :src="src!"
    :alt="name"
    loading="lazy"
    :class="cn('rounded-full shrink-0 object-cover', className)"
    @error="errored = true"
  />
  <div
    v-else
    :class="cn('rounded-full shrink-0 flex items-center justify-center bg-brand', className)"
    aria-hidden="true"
  >
    <span class="text-page text-2xs font-bold leading-none">{{ initial }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
  src?: string | null;
  name: string;
  class?: HTMLAttributes['class'];
}>();

const errored = ref(false);
watch(
  () => props.src,
  () => {
    errored.value = false;
  }
);

const showImage = computed(() => Boolean(props.src) && !errored.value);
const initial = computed(() => props.name.charAt(0).toUpperCase());
</script>

<template>
  <img
    v-if="showImage"
    :src="src!"
    :alt="name"
    loading="lazy"
    :class="cn('rounded-full shrink-0 object-cover', props.class)"
    @error="errored = true"
  />
  <div
    v-else
    :class="cn('rounded-full shrink-0 flex items-center justify-center bg-brand', props.class)"
    aria-hidden="true"
  >
    <span class="text-page text-2xs font-bold leading-none">{{ initial }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { HTMLAttributes } from 'vue';
import { getStillImageUrl } from '@/lib/video-thumbnail';
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

/**
 * Every avatar in the hub renders somewhere between `size-5` (20 CSS px) and a
 * profile header, so 128 covers the largest of them at DPR 2 and the smallest
 * several times over. Creator avatars are uploaded at full resolution and
 * served untouched: one on the use-case detail page is a **604,696 byte PNG**
 * painted into a 20 px circle, and it was the single largest response on that
 * page. At `width=128` the same file is **2,998 bytes**, and 1,221 at width=64.
 *
 * Sized here rather than at each call site so every avatar gets it: the grid,
 * the carousel, search results and the profile sidebar all render this one
 * component. `getStillImageUrl` returns null for anything not on the hub asset
 * host, so a local or third-party avatar falls through untouched.
 */
const AVATAR_WIDTH = 128;
const resolvedSrc = computed(() => (src ? (getStillImageUrl(src, AVATAR_WIDTH) ?? src) : src));
</script>

<template>
  <img
    v-if="showImage"
    :src="resolvedSrc!"
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

<script setup lang="ts">
import { Download } from 'lucide-vue-next';

import { codeBlockControl } from './code-block-styles';

const { href, label } = defineProps<{
  href: string;
  label: string;
}>();
</script>

<template>
  <a :href="href" download :title="label" :aria-label="label" :class="codeBlockControl">
    <Download class="size-3.5" />
  </a>
</template>

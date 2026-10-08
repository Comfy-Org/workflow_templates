<script setup lang="ts">
import { Check } from 'lucide-vue-next';
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui';
import type { HTMLAttributes } from 'vue';

export type ComfySelectOption = {
  label: string;
  value: string | number;
};

const {
  options,
  ariaLabel,
  class: className,
} = defineProps<{
  options: readonly ComfySelectOption[];
  ariaLabel: string;
  class?: HTMLAttributes['class'];
}>();

const model = defineModel<string | number>({ required: true });
</script>

<template>
  <div :class="className">
    <SelectRoot v-model="model">
      <SelectTrigger
        class="flex h-12 w-full items-center gap-2 rounded-2xl border border-divider-subtle bg-hub-surface p-4 text-left text-xs font-semibold leading-[1.45] text-content/80 outline-none transition-colors hover:border-divider data-[state=open]:border-divider focus-visible:border-divider"
        :aria-label="ariaLabel"
      >
        <SelectValue class="min-w-0 flex-1 truncate" />
        <span class="grid size-4 shrink-0 place-items-center" aria-hidden="true">
          <img src="/icons/caret-right.svg" alt="" class="h-[9.333px] w-[5.333px] rotate-90" />
        </span>
      </SelectTrigger>

      <SelectPortal>
        <SelectContent
          position="popper"
          align="start"
          :side-offset="8"
          class="z-[100] max-h-64 min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-2xl border border-divider-subtle bg-site-dropdown p-2 shadow-2xl shadow-black/40"
        >
          <SelectViewport>
            <SelectItem
              v-for="option in options"
              :key="option.value"
              :value="option.value"
              class="relative flex cursor-pointer items-center rounded-xl py-2.5 pl-3 pr-9 text-xs font-semibold leading-[1.45] text-content/80 outline-none transition-colors data-[highlighted]:bg-hub-surface-hover data-[highlighted]:text-content data-[state=checked]:text-brand"
            >
              <SelectItemText>{{ option.label }}</SelectItemText>
              <SelectItemIndicator
                class="absolute right-3 grid size-4 place-items-center text-brand"
              >
                <Check class="size-3.5" aria-hidden="true" />
              </SelectItemIndicator>
            </SelectItem>
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
  </div>
</template>

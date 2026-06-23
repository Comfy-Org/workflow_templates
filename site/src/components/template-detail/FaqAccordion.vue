<script setup lang="ts">
/**
 * FAQ accordion (reka-ui) for the workflow detail page.
 *
 * Visible counterpart to the `FAQPage` JSON-LD emitted by the route pages.
 */
import {
  AccordionRoot,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
} from 'reka-ui';

defineProps<{
  items: { question: string; answer: string }[];
  heading?: string;
}>();
</script>

<template>
  <section v-if="items.length > 0" :aria-labelledby="heading ? 'faq-heading' : undefined">
    <h2
      v-if="heading"
      id="faq-heading"
      class="text-2xl lg:text-3xl font-semibold text-content mb-6 lg:mb-8"
    >
      {{ heading }}
    </h2>
    <AccordionRoot
      type="single"
      collapsible
      class="flex flex-col border-t border-b border-divider divide-y divide-divider"
    >
      <AccordionItem v-for="(item, i) in items" :key="i" :value="`faq-${i}`" class="faq-item">
        <AccordionHeader>
          <AccordionTrigger
            class="group flex w-full items-center justify-between gap-4 py-5 text-left text-base font-medium text-content"
          >
            <span>{{ item.question }}</span>
            <svg
              class="size-5 shrink-0 text-content-secondary transition-transform duration-200 group-data-[state=open]:rotate-180"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent
          force-mount
          class="overflow-hidden data-[state=closed]:h-0 motion-safe:data-[state=open]:animate-accordion-down motion-safe:data-[state=closed]:animate-accordion-up"
        >
          <p class="pb-5 text-base leading-relaxed text-content-muted">{{ item.answer }}</p>
        </AccordionContent>
      </AccordionItem>
    </AccordionRoot>
  </section>
</template>

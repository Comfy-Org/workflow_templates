<script setup lang="ts">
import NavigationMenu from '@/components/ui/navigation-menu/NavigationMenu.vue';
import NavigationMenuContent from '@/components/ui/navigation-menu/NavigationMenuContent.vue';
import NavigationMenuItem from '@/components/ui/navigation-menu/NavigationMenuItem.vue';
import NavigationMenuLink from '@/components/ui/navigation-menu/NavigationMenuLink.vue';
import NavigationMenuList from '@/components/ui/navigation-menu/NavigationMenuList.vue';
import NavigationMenuTrigger from '@/components/ui/navigation-menu/NavigationMenuTrigger.vue';
import { navigationMenuTriggerStyle } from '@/components/ui/navigation-menu/navigationMenuTriggerStyle';
import { getMainNavigation } from '@/config/main-navigation';
import type { Locale } from '@/i18n/config';
import NavColumn from './NavColumn.vue';
import NavFeaturedCard from './NavFeaturedCard.vue';

const { locale = 'en' } = defineProps<{ locale?: Locale }>();
const mainNavigation = getMainNavigation(locale);
</script>

<template>
  <NavigationMenu data-testid="desktop-nav-links">
    <NavigationMenuList>
      <NavigationMenuItem v-for="navItem in mainNavigation" :key="navItem.label">
        <template v-if="navItem.columns?.length">
          <NavigationMenuTrigger>
            {{ navItem.label }}
          </NavigationMenuTrigger>
          <NavigationMenuContent class="w-auto" data-testid="nav-dropdown">
            <ul class="flex w-max gap-16">
              <NavFeaturedCard v-if="navItem.featured" :featured="navItem.featured" />
              <NavColumn
                v-for="column in navItem.columns"
                :key="column.header"
                :column="column"
                :locale="locale"
              />
            </ul>
          </NavigationMenuContent>
        </template>
        <NavigationMenuLink v-else as-child :class="navigationMenuTriggerStyle()">
          <a :href="navItem.href" class="ppformula-text-center">{{ navItem.label }}</a>
        </NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenu>
</template>

import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.PUBLIC_POSTHOG_KEY;

let initialized = false;

export function initPostHog(): void {
  if (typeof window === 'undefined' || initialized || !POSTHOG_KEY) return;

  posthog.init(POSTHOG_KEY, {
    api_host: 'https://ph.comfy.org',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
  });

  initialized = true;
}

/**
 * All tracked events follow the object_verb taxonomy:
 * - snake_case
 * - past tense verbs
 * - e.g. run_button_clicked, template_viewed
 */
type EventProperties = Record<string, string | number | boolean | undefined>;

export function capture(eventName: string, properties?: EventProperties): void {
  if (typeof window === 'undefined' || !initialized) return;
  posthog.capture(eventName, properties);
}

// ─── Typed event helpers ───────────────────────────────────────────────

export function trackRunButtonClicked(
  templateName: string,
  location: string,
): void {
  capture('run_button_clicked', {
    template_name: templateName,
    location,
  });
}

export function trackDownloadButtonClicked(templateName: string): void {
  capture('download_button_clicked', {
    template_name: templateName,
  });
}

export function trackShareButtonClicked(templateName: string): void {
  capture('share_button_clicked', {
    template_name: templateName,
  });
}

export function trackTemplateViewed(
  templateName: string,
  mediaType: string,
): void {
  capture('template_viewed', {
    template_name: templateName,
    media_type: mediaType,
  });
}

export function trackSearchPerformed(query: string): void {
  capture('search_performed', {
    query,
  });
}

export function trackFilterApplied(
  filterType: string,
  filterValue: string,
): void {
  capture('filter_applied', {
    filter_type: filterType,
    filter_value: filterValue,
  });
}

export function trackSignupCtaClicked(location: string): void {
  capture('signup_cta_clicked', {
    location,
  });
}

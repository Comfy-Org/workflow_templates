# A/B Testing Guide

This guide explains how to set up and run A/B tests on the ComfyUI Templates site using Vercel Edge Config.

## Overview

Our A/B testing infrastructure is designed for static sites:

- **Client-side assignment**: Variants are assigned in the browser
- **Cookie persistence**: Users see consistent variants across sessions
- **Edge Config integration**: Manage experiments without redeploying
- **Analytics tracking**: Automatic integration with Vercel Analytics

## Quick Start

### 1. Basic Usage

```typescript
import { getVariantSync, trackExposure, EXPERIMENTS } from '@/lib/experiments';

// Get variant assignment
const variant = getVariantSync('cta_button', EXPERIMENTS.CTA_BUTTON);

// Track that user saw this variant
trackExposure('cta_button', variant);

// Render based on variant
if (variant === 'variant_a') {
  // Show variant A
} else {
  // Show control
}
```

### 2. In Astro Components

```astro
---
// Server-side: define the experiment config
const ctaExperiment = {
  id: 'cta_button',
  variants: ['control', 'green', 'orange'],
};
---

<button
  id="cta-button"
  class="cta-button"
  data-experiment="cta_button"
  data-variants={JSON.stringify(ctaExperiment.variants)}
>
  Download Template
</button>

<script>
  import { getVariantSync, trackExposure } from '@/lib/experiments';

  const button = document.getElementById('cta-button');
  if (button) {
    const experimentId = button.dataset.experiment;
    const variants = JSON.parse(button.dataset.variants || '[]');

    const variant = getVariantSync(experimentId, { id: experimentId, variants });
    trackExposure(experimentId, variant);

    // Apply variant styling
    if (variant === 'green') {
      button.classList.add('bg-green-600');
    } else if (variant === 'orange') {
      button.classList.add('bg-orange-600');
    }
  }
</script>
```

## Setting Up Vercel Edge Config

### 1. Create Edge Config

1. Go to your Vercel Dashboard → Storage → Edge Config
2. Click "Create Edge Config"
3. Name it (e.g., `comfyui-templates-experiments`)

### 2. Add Environment Variables

Add these to your Vercel project settings:

```env
PUBLIC_EDGE_CONFIG_ID=ecfg_xxxxxxxxxxxxx
PUBLIC_EDGE_CONFIG_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

For local development, add to `.env`:

```env
PUBLIC_EDGE_CONFIG_ID=ecfg_xxxxxxxxxxxxx
PUBLIC_EDGE_CONFIG_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 3. Configure Experiments in Edge Config

Add an `experiments` key with your experiment configuration:

```json
{
  "experiments": {
    "cta_button": {
      "variants": ["control", "green", "orange"],
      "weights": [0.34, 0.33, 0.33],
      "enabled": true
    },
    "hero_layout": {
      "variants": ["control", "centered"],
      "weights": [0.5, 0.5],
      "enabled": true
    },
    "new_feature": {
      "variants": ["off", "on"],
      "weights": [0.9, 0.1],
      "enabled": true
    }
  }
}
```

## Creating a New Experiment

### Step 1: Define the Experiment

Add to `src/lib/experiments.ts`:

```typescript
export const EXPERIMENTS = {
  // ... existing experiments
  MY_EXPERIMENT: {
    id: 'my_experiment',
    variants: ['control', 'variant_a', 'variant_b'],
    weights: [0.34, 0.33, 0.33], // Optional: equal distribution if omitted
  },
} as const;
```

### Step 2: Implement in Component

```astro
<script>
  import { getVariantSync, trackExposure, trackConversion } from '@/lib/experiments';

  const variant = getVariantSync('my_experiment', {
    id: 'my_experiment',
    variants: ['control', 'variant_a', 'variant_b'],
  });

  // Track exposure when element is visible
  trackExposure('my_experiment', variant);

  // Track conversion on action
  document.getElementById('my-cta')?.addEventListener('click', () => {
    trackConversion('my_experiment', 'click');
  });
</script>
```

### Step 3: Add to Edge Config (Production)

Update your Edge Config to include the new experiment for remote management.

## Local Testing

### URL Parameter Override

Test specific variants without cookies:

```
https://localhost:4321/?variant=variant_a
https://localhost:4321/?variant_cta_button=green
```

### Clear Assignment

Delete the experiment cookie to get reassigned:

```javascript
document.cookie = 'exp_cta_button=; max-age=0; path=/';
```

### Force Specific Variant

```javascript
document.cookie = 'exp_cta_button=variant_a; max-age=2592000; path=/';
```

## Tracking Results

### Vercel Analytics

Experiment events are automatically tracked:

- `experiment_exposure`: When a user sees a variant
- `experiment_conversion`: When a user completes an action

View in Vercel Dashboard → Analytics → Events.

### Custom Analytics

The library also fires to `window.gtag` if available:

```javascript
gtag('event', 'experiment_exposure', {
  experiment_id: 'cta_button',
  variant: 'green',
});
```

### Analyzing Results

1. **Export data** from Vercel Analytics
2. **Calculate conversion rates** per variant:
   ```
   Conversion Rate = conversions / exposures
   ```
3. **Statistical significance**: Use a calculator like [AB Test Calculator](https://abtestguide.com/calc/)

## Experiment Types

### CTA Button Variants

Test button text, color, or size:

```typescript
const variant = getVariantSync('cta_button', {
  id: 'cta_button',
  variants: ['control', 'green', 'large'],
});

const buttonClass = {
  control: 'bg-blue-600',
  green: 'bg-green-600',
  large: 'bg-blue-600 text-lg py-4 px-8',
}[variant];
```

### Layout Variants

Test different page layouts:

```typescript
const variant = getVariantSync('hero_layout', {
  id: 'hero_layout',
  variants: ['control', 'centered', 'split'],
});

// Conditionally render different layouts
```

### Feature Toggles

Gradual rollout of new features:

```typescript
const variant = getVariantSync('new_feature', {
  id: 'new_feature',
  variants: ['off', 'on'],
  weights: [0.9, 0.1], // 10% rollout
});

if (variant === 'on') {
  // Show new feature
}
```

## Best Practices

### 1. One Change Per Experiment

Test one variable at a time for clear results.

### 2. Sufficient Sample Size

Run experiments until you have statistical significance (typically 1000+ exposures per variant).

### 3. Track the Right Metrics

- **Exposure**: When the variant is shown
- **Conversion**: The action you want to optimize

### 4. Document Experiments

Keep a log of:

- Hypothesis
- Start/end dates
- Variants tested
- Results
- Decision made

### 5. Clean Up

Remove experiment code after concluding:

```typescript
// Before: Experiment code
const variant = getVariantSync('cta_button', EXPERIMENTS.CTA_BUTTON);
const buttonClass = variant === 'green' ? 'bg-green-600' : 'bg-blue-600';

// After: Winner implemented
const buttonClass = 'bg-green-600'; // Green won!
```

## Troubleshooting

### Variant Not Persisting

Check that cookies are enabled and the domain matches.

### Edge Config Not Loading

1. Verify environment variables are set
2. Check Edge Config token permissions
3. Look for console warnings

### Analytics Not Tracking

1. Ensure Vercel Analytics is enabled
2. Check that `window.va` is available
3. Verify events in Vercel Dashboard

## API Reference

### `getVariant(experimentId, fallbackConfig)`

Async function that checks Edge Config. Use when you can await.

### `getVariantSync(experimentId, fallbackConfig)`

Synchronous function using cookies/URL only. Use for immediate rendering.

### `trackExposure(experimentId, variant)`

Track that a user saw a variant.

### `trackConversion(experimentId, conversionType)`

Track a conversion event.

### `createExperimentHandler(experimentId, fallbackConfig)`

Create a reusable handler object:

```typescript
const cta = createExperimentHandler('cta_button', EXPERIMENTS.CTA_BUTTON);
const variant = cta.track(); // Gets variant and tracks exposure
cta.trackConversion('click'); // Track conversion
```

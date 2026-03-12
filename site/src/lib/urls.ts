const COMFY_CLOUD_BASE_URL = 'https://cloud.comfy.org/';

export function getCloudCtaUrl(templateName: string, ctaLocation: string): string {
  const params = new URLSearchParams({
    template: templateName,
    utm_source: 'workflow_hub',
    utm_medium: 'site_CTA',
    utm_campaign: 'hub_preview',
    utm_content: templateName,
    utm_term: ctaLocation,
  });

  return `${COMFY_CLOUD_BASE_URL}?${params.toString()}`;
}

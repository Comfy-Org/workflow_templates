# Reverse Proxy Emergency Runbook

> **For on-call engineers. No background — just steps.**

---

## Symptoms

- **502 / "Origin unavailable"** on comfy.org
- **Templates pages not loading** (comfy.org/templates/)
- **Framer marketing pages not loading** (comfy.org/, /pricing)
- **Mixed failures** — some paths work, others don't

---

## Diagnosis

1. **Check `X-Served-By` response header** — should be `vercel-templates` or `framer-marketing`
   ```bash
   curl -sI https://comfy.org/ | grep -i x-served-by
   curl -sI https://comfy.org/templates/ | grep -i x-served-by
   ```

2. **Check Worker logs:**
   Cloudflare dashboard → Workers & Pages → `comfy-router` → Logs

3. **Check Worker analytics:** error rate, latency
   Cloudflare dashboard → Workers & Pages → `comfy-router` → Analytics

4. **Check origin health independently:**
   ```bash
   # Vercel (templates)
   curl -sI https://workflow-templates.vercel.app/templates/

   # Framer (marketing) — if DNS still points to Framer
   curl -sI https://www.comfy.org/

   # Framer via origin alias
   curl -sI https://framer-origin.comfy.org/
   ```

---

## Rollback Option A: Remove Worker Route (fastest, < 2 min)

1. Cloudflare dashboard → **Workers & Pages** → `comfy-router` → **Settings** → **Routes**
2. **Delete** the `comfy.org/*` and `www.comfy.org/*` routes
3. Add DNS records pointing directly to Framer:
   - **A records:** `31.43.160.6` and `31.43.161.6`
   - **CNAME www →** `sites.framer.app`
   - All set to **Proxied OFF / DNS-only** (grey cloud)
4. Traffic bypasses Worker immediately

---

## Rollback Option B: Revert Nameservers (nuclear, < 5 min + propagation)

1. At domain registrar, change nameservers back to previous provider
2. Previous DNS records take effect within TTL (60s if lowered pre-cutover)
3. Everything reverts to pre-migration state

---

## Rollback Option C: Deploy Hotfix to Worker

1. ```bash
   cd comfy-router && npx wrangler deploy --env production
   ```
2. Worker deploys globally in seconds

---

## Post-Rollback

- [ ] Notify team in Slack
- [ ] Check comfy.org loads in browser
- [ ] Check comfy.org/templates/ loads
- [ ] Monitor for 30 minutes

---

## Key URLs & Contacts

| Resource | URL |
|---|---|
| Worker preview | https://comfy-router.comfy-org.workers.dev |
| Vercel origin | https://workflow-templates.vercel.app |
| Framer origin | https://framer-origin.comfy.org (grey-cloud CNAME → sites.framer.app) |
| Cloudflare dashboard | https://dash.cloudflare.com (Comfy Org account) |
| comfy-router repo | https://github.com/Comfy-Org/comfy-router |
| Contact | [placeholder] |

---

## DNS Records for Reference

| Record | Type | Value |
|---|---|---|
| Current Framer | A | `52.223.52.2`, `35.71.142.77` |
| Framer-recommended | A | `31.43.160.6`, `31.43.161.6` |
| www | CNAME | `sites.framer.app` |
| MX | MX | Google Workspace (`aspmx.l.google.com` etc.) |

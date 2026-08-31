# HHFNAF project notes

- Run checks and validation for this HHF project only. Do not mix this project with Tivly work.

## Deploy to production

After any code change, always build and deploy — don't leave it to the user. Changes are live on `harnosandshf.se` only after these steps run.

**Frontend (HHFNAF) — ALL frontend changes go through STAGING first (user rule 2026-08-31, no exceptions):**

1. Edit in `/root/HHFNAF-staging` — NEVER edit `/root/HHFNAF` directly for frontend work.
   Staging runs `next dev` with HMR on `http://10.44.0.11:3002` (pm2 `harnosandshf-staging`),
   so saved files are live there instantly with no build step.
2. Verify the change on staging (:3002) — the user previews here.
3. Release to production: `sudo bash /root/HHFNAF-staging/release-to-prod.sh`
   (isolated build + atomic .next swap + health-checked rolling reload of
   harnosandshf-www-backup then harnosandshf-www; auto-rollback on failed health check).
   Never run `npm run build` + `pm2 restart harnosandshf-www` in `/root/HHFNAF` directly —
   that caused live outages before the release script existed.

This staging-first rule applies to frontend only. Backend deploys directly (below).

Note: the cron job `/root/SERVERF/scripts/sync-frontends.sh` only rebuilds when `git pull` brings a new remote commit. When you edit files locally on the server, the autosync commits+pushes but the remote==local check skips the rebuild — the release script handles build+reload.

**Backend (SERVERF, Node.js API → PM2 `harnosandshf-api`):**
```bash
/root/deploy_harnosand.sh
```
This pulls, `npm install`, and `pm2 restart harnosandshf-api`. Safe to run even if nothing changed (it no-ops).

**Storefront (h-rn-sand-hf-storefront):** `bash /root/SERVERF/scripts/deploy-storefront.sh`

After deploying: check `pm2 list` to verify the process is `online` and not in a restart loop. If it is, read PM2 logs (`pm2 logs <name> --lines 50 --nostream`) and fix before reporting done.

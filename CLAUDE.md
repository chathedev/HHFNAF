# HHFNAF project notes

- Run checks and validation for this HHF project only. Do not mix this project with Tivly work.

## Deploy to production

After any code change to the frontend or backend, always build and deploy — don't leave it to the user. Changes are live on `harnosandshf.se` only after these steps run.

**Frontend (HHFNAF, Next.js → PM2 `harnosandshf-www`):**
```bash
cd /root/HHFNAF && npm install --silent && npm run build && pm2 restart harnosandshf-www
```
Note: the cron job `/root/SERVERF/scripts/sync-frontends.sh` only rebuilds when `git pull` brings a new remote commit. When you edit files locally on the server, the autosync commits+pushes but the remote==local check skips the rebuild — so you must run build+restart yourself.

**Backend (SERVERF, Node.js API → PM2 `harnosandshf-api`):**
```bash
/root/deploy_harnosand.sh
```
This pulls, `npm install`, and `pm2 restart harnosandshf-api`. Safe to run even if nothing changed (it no-ops).

**Storefront (h-rn-sand-hf-storefront):** `bash /root/SERVERF/scripts/deploy-storefront.sh`

After deploying: check `pm2 list` to verify the process is `online` and not in a restart loop. If it is, read PM2 logs (`pm2 logs <name> --lines 50 --nostream`) and fix before reporting done.

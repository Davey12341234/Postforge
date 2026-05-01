# ProLiant + BabyGPT (bare metal)

**Canonical path (recommended):** **`RUNBOOK.md`** — Ubuntu **22.04** USB + interactive install + `bootstrap.sh`. Prep: `.\scripts\prepare-official-proliant-path.ps1` from the repo root.

This folder is the **install kit** you copy to the server **after** Ubuntu Server is running. The **USB you flash** only boots the **Ubuntu installer** — it does not embed BabyGPT. BabyGPT is installed by `bootstrap.sh` using `babygpt-src.zip` (your app source).

## On your Windows PC (once)

From the repo root:

```powershell
.\scripts\prepare-proliant-babygpt.ps1 -DownloadIso
```

That builds `deploy/proliant/staging/` with:

- `babygpt-src.zip` — current `git HEAD` (tracked files only; commit work first)
- `bootstrap.sh` — installs Node 20, deploys to `/opt/babygpt`, enables `systemd` service
- `babygpt.service` — production Next.js on `0.0.0.0:3000`
- Optional `ubuntu-live-server-amd64.iso` when `-DownloadIso` is used

Rufus opens so you can flash the **installer** USB. Keep the **whole `staging` folder** (or a copy on a second USB) for the next step.

## On the ProLiant

1. Boot from the installer USB, install **Ubuntu Server** (SSH server recommended).
2. Copy the staging folder to the machine, e.g. `scp -r deploy/proliant/staging user@server:~/babygpt-kit`
3. On the server:

   ```bash
   cd ~/babygpt-kit
   chmod +x bootstrap.sh
   # If line breaks fail (Windows copies): sed -i 's/\r$//' bootstrap.sh
   sudo bash bootstrap.sh ./babygpt-src.zip
   ```

4. Edit API keys and optional gate:

   ```bash
   sudo -u babygpt nano /opt/babygpt/.env
   sudo systemctl restart babygpt
   ```

5. Open from another PC: `http://<server-ip>:3000`  
   If nothing answers, allow the port: `sudo ufw allow 3000/tcp` (when UFW is enabled).

## Operations

| Action        | Command                          |
|---------------|----------------------------------|
| Logs          | `journalctl -u babygpt -f`       |
| Restart       | `sudo systemctl restart babygpt` |
| Status        | `systemctl status babygpt`       |

BabyGPT runs as user `babygpt` under `/opt/babygpt` and uses the server’s RAM for Node/Next.js like any other dedicated host.

## USB won’t boot / GRUB loop?

See **`BACKUP-PLAN.md`** and run **`scripts/prepare-proliant-backup-boot.ps1`** for an alternate Ubuntu 22.04 ISO and Rufus GPT/UEFI notes.

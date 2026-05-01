# Official path: DL360p Gen8 + Ubuntu + BabyGPT

**Chosen for you:** **Ubuntu Server 22.04 LTS** on USB (interactive install) → copy **`staging`** → **`bootstrap.sh`**.  
We use this instead of full autoinstall because a **stock Rufus USB** does not apply `autoinstall` without extra kernel hacks, and your priority is a **working server**, not zero-touch installer YAML.

## What you need

- Windows PC with this repo  
- USB stick (≥8 GB)  
- ProLiant with **USB boot** (IPL #1 = USB is fine)  
- **UEFI + GPT** Rufus layout if firmware is UEFI (matches our 22.04 stick)  
- **Internet on the server** after OS install (for `apt` / Node / npm)

## 1) Prepare everything on the PC (one command)

From **PowerShell** in the repo root:

```powershell
cd c:\Users\mckel\postforge
npm run proliant:prepare-official
```

Equivalent: `.\scripts\prepare-official-proliant-path.ps1`

- Refreshes **`deploy\proliant\staging\`** (`babygpt-src.zip`, `bootstrap.sh`, `babygpt.service`, `README.md`)  
- Ensures **`ubuntu-22.04-live-server-amd64.iso`** (downloads only if missing or corrupt — about **2 GB**; first run can take a while)  
- Starts **Rufus** so you can flash the USB  

Approve **UAC** if prompted.

**ISO only (no Rufus yet):** `npm run proliant:prepare-official-download` — same staging refresh + download, does not launch Rufus. Use this when you want the ISO on disk before flashing later.

**Where downloads go:** The ISO is saved under **`deploy\proliant\staging\` on the same drive as this repo** (usually **`C:`**). Scripts **refuse** that folder on USB/SD so multi‑GB downloads are not written to removable media (Rufus writes the installer **to** the SD/USB **after** the ISO is on a fixed disk). Override only if you must: **`BBGPT_ALLOW_REMOVABLE_STAGING=1`**.

## 2) In Rufus

- **Device:** your USB (check size — not your system disk)  
- **SELECT:** `deploy\proliant\staging\ubuntu-22.04-live-server-amd64.iso`  
- **Partition scheme:** **GPT**  
- **Target system:** **UEFI (non CSM)** — if your BIOS is UEFI-only or UEFI-first  
  - If you **must** use legacy BIOS for USB, reflash as **MBR** + **BIOS** and match BIOS mode (one variable at a time)  
- **START** → wait until finished → eject safely  

**If Rufus shows “EFI only / legacy boot” on the server:** the stick is **UEFI-only** (correct for GPT). Fix **firmware**, not the ISO: press **F9** (RBSU) → set **UEFI boot** / **disable legacy-first** / enable **UEFI Optimized** (wording varies) → save → **F11** → choose **UEFI:** … **USB** (not a “legacy USB” line). Only if you cannot enable UEFI, reflash the USB as **MBR + BIOS** and use legacy boot consistently.

**After Rufus, copy BabyGPT files onto the same USB** (folders sit next to `EFI`, `boot`, etc.). The script copies only the **small** kit files from `deploy\proliant\staging\` (zip, `bootstrap.sh`, unit, README, optional cloud-init snippets)—**not** the Ubuntu `.iso` (that stays on the PC for Rufus). If `staging\` also contains a multi‑GB ISO, older “copy everything” approaches could fill the stick; this path avoids that.

```powershell
cd c:\Users\mckel\postforge
npm run build
npm run proliant:stage
.\scripts\full-usb-deploy.ps1 -DriveLetter D
```

Or one step: `npm run proliant:usb-sync` (build + stage + deploy; set `BBGPT_USB_LETTER` if needed). On a **very small** volume, add `-SkipStandalone` to `full-usb-deploy.ps1` or `sync-installer-usb.ps1` so only `babygpt-server-kit` is written (no `babygpt-standalone` folder).

(Replace `D` with your USB’s drive letter—confirm in File Explorer that it is the **whole** installer stick, not a tiny spare partition.)

**Separate boot-stub USB (optional, NVMe-only / no front-bay disks):** prepare with `.\scripts\prepare-boot-stub-usb.ps1 -DiskNumber N -Force`. To finish before the server (ESP + READMEs on T: and second volume): **Administrator** PowerShell: `.\scripts\finish-bootstub-usb.ps1 -DiskNumber N`. If you only need to repair the small EFI partition: `.\scripts\fix-bootstub-esp.ps1 -DiskNumber N`. If PowerShell/UAC launchers fail, use **`ESP-FIX-Admin.cmd`** in the repo root: **Right-click → Run as administrator** (DiskPart only, no `.ps1`). See `HANDOFF-DL360P-G8-STORAGE-BOOT.md`.

## 3) On the ProLiant

1. Plug USB, reboot.  
2. **F9** once if you still see the Rufus legacy warning — confirm **UEFI-first** (see §2).  
3. **F11** boot menu → pick **UEFI: … USB** (must match GPT stick; do **not** pick legacy-only USB).  
4. If **GRUB flashes and resets:** at GRUB press **Shift/Esc** → **`e`** → add **`nomodeset`** to the `linux` line → **Ctrl+X**.  
5. Run the **Ubuntu installer** (keyboard + monitor): create user, disk layout, enable **OpenSSH server**.

## 4) Install BabyGPT on the server

**Option A — copy from your PC over the network** (replace user/host/IP):

```powershell
scp -r c:\Users\mckel\postforge\deploy\proliant\staging YOUR_USER@SERVER_IP:~/babygpt-kit
```

**Option B — single USB:** after Ubuntu is installed, plug the same stick into the server (or copy `babygpt-server-kit` off it). Put the kit in `~/babygpt-kit` (e.g. `cp -r /media/$USER/.../babygpt-server-kit ~/babygpt-kit`).

Then SSH in:

```bash
cd ~/babygpt-kit
chmod +x bootstrap.sh
sudo bash bootstrap.sh ./babygpt-src.zip
sudo -u babygpt nano /opt/babygpt/.env
sudo systemctl restart babygpt
```

Open **`http://SERVER_IP:3000`** (allow **`ufw allow 3000/tcp`** if UFW is on).

## 5) If something fails

- **USB / GRUB:** `GRUB-FLASH-THEN-RESET.md`  
- **iLO instead of USB:** `automation/ilo-redfish-notes.md`  
- **Why not full autoinstall:** `automation/VERIFICATION.md`  

This runbook is the **single** path aligned with “get Ubuntu up and run BabyGPT on this hardware.”

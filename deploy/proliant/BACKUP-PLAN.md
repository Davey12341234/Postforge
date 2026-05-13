# ProLiant USB boot — backup plan

Use this if your **first try** (GRUB `nomodeset`, etc.) still ends in a **reset loop** or the installer never stays up.

## 1. First try (on the server, before reflashing)

When you see **Welcome to GRUB**, press **Shift** or **Esc** until the menu stays open.

- Highlight the installer entry, press **e** to edit.
- On the `linux` line, add at the end: `nomodeset`
- Boot (**Ctrl+X** / **F10**).

If it still reboots, continue below.

## 2. Backup: reflash with Ubuntu 22.04 LTS + UEFI-friendly layout

Older ProLiants sometimes behave better with **22.04**’s kernel and with **GPT + pure UEFI** (no CSM mismatch).

On your Windows PC, from the repo root:

```powershell
.\scripts\prepare-proliant-backup-boot.ps1
```

That downloads **`ubuntu-22.04-live-server-amd64.iso`**, refreshes `babygpt-src.zip` and the bootstrap files in `deploy/proliant/staging/`, and starts **Rufus**.

**In Rufus (important):**

- **Partition scheme:** **GPT**
- **Target system:** **UEFI (non CSM)** if the server is set to **UEFI boot** in BIOS  
  — or match whatever mode you use consistently (**all UEFI** or **all legacy**, not mixed).

Then **START**, wait for completion, eject, try the ProLiant again.

## 3. Backup: skip the USB — iLO virtual media

If the machine has **iLO** with network access:

1. Open **`https://<ilo-ip>`** in a browser.
2. **Remote Console** / **Virtual Media**.
3. Mount **`deploy/proliant/staging/ubuntu-22.04-live-server-amd64.iso`** (or the 24.04 ISO) as a **virtual CD/DVD**.
4. One-time boot from **virtual optical** / **iLO virtual CD**.

If the installer boots from virtual media but not from USB, focus on **USB ports**, **USB boot order**, or **UEFI USB entry** vs legacy.

## 4. After Ubuntu installs

Same as `README.md`: copy the whole `staging` folder to the server and run:

`sudo bash bootstrap.sh ./babygpt-src.zip`

BabyGPT does not care whether the OS was installed from 22.04 or 24.04; Node 20 installs the same.

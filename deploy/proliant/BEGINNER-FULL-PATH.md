# BabyGPT + ProLiant — full beginner path

Read top to bottom. Stop when a step says **STOP and fix** — do not skip ahead.

---

## Words you will see

| Word | Means |
|------|--------|
| **USB stick** | The small drive you plug into a USB port. |
| **PC** | Your Windows computer where the project folder lives. |
| **Server** | The HP ProLiant (DL360p Gen8) where Ubuntu will run. |
| **NIC / PXE / network boot** | The server tries to start from the **network cable** instead of your USB. That is what keeps looping — we fix it in **Part C**. |
| **Rufus** | A **Windows program only**. It runs on the PC once to put Ubuntu onto a USB. It is **not** on the USB. |
| **Installer** | The Ubuntu setup screens (language, disk, user). |
| **Console** | How you **see** the server’s screen. Often **HDMI (or VGA) from the server** into a **converter**, then into your **laptop** — that only carries **video**, not internet. |

---

## Before you start (checklist)

- [ ] Windows **laptop/PC** with this project: `c:\Users\mckel\postforge` (or your path).
- [ ] At least **one USB 8 GB or larger** (bigger is fine).
- [ ] Way to see the server’s screen: **direct monitor**, **iLO**, or **HDMI/VGA → converter → laptop** (video only).
- [ ] **Keyboard** plugged into the server (USB) so you can type in the installer.
- [ ] **Ethernet to the router is optional for the first install.** Many steps work **offline**. You only **need** a network cable from the **server to your router** (or a **direct cable laptop ↔ server**) when you want **internet updates**, **SSH from the laptop**, or **opening BabyGPT in a browser on the laptop** without extra setup.

---

## Part A — On your Windows PC (prepare the USB)

Do this **while the USB is plugged into the PC**, not the server.

### A1. Open PowerShell in the project folder

1. Press **Windows key**, type **PowerShell**.
2. Right‑click **Windows PowerShell** → **Run as administrator** (optional but helps).
3. Type (change the path if yours is different):

```powershell
cd c:\Users\mckel\postforge
```

Press **Enter**.

### A2. Put BabyGPT + installer files on the USB

With **only the USB you want to use** plugged in (or note the drive letter, e.g. **D:** in File Explorer):

```powershell
npm run proliant:quick-usb -- -DriveLetter D
```

Change **D** to your USB’s letter.

- Wait until it finishes without red errors.
- If it says **Drive not found**, the USB isn’t that letter — check **This PC** in File Explorer.

### A3. (Optional) Put a fresh Ubuntu image on the USB with Rufus

Only if you need to **re-flash** the stick (first time, or corrupted). This **erases** the USB; run **A2 again** after Rufus finishes.

```powershell
npm run proliant:rufus
```

1. **Approve** the Windows security (UAC) prompt.
2. In **Rufus**: **Device** = your USB (check **size** — not your C: drive).
3. **Partition**: **GPT**, **Target**: **UEFI (non CSM)** (matches the main runbook).
4. Click **START**, wait until **READY**, then **Safely remove** the USB.

Then run **A2** again for drive letter **D** (or whatever letter).

### A4. Eject the USB safely

Click the **Safely Remove Hardware** icon → eject that USB.

---

## Part B — At the server (physical setup)

1. Plug **keyboard** into the server (USB).
2. Plug **video** so you can see the installer: **monitor on the server**, **or** **HDMI/VGA from the server → your HDMI converter → laptop** (you’re only using the laptop as a **display**, not as the server’s network).
3. **Router Ethernet:** plug in **only when you want** (see below). It is **OK** if nothing is plugged into the server’s **network port** right now — the installer can still run **offline**.
4. Plug **only one** prepared **USB** into the server for the first successful boot.

**Your setup (HDMI to laptop, no cable to the router):** you will do almost everything **on the server screen** you see through the converter. That is fine. Later, to use **SSH** or a **browser on the laptop** talking to the server, you will need **some** network path (server → router, or **direct Ethernet laptop ↔ server** — see Part E).

---

## Part C — Stop the “NIC / network / DHCP” loop (very important)

If the screen shows **DHCP**, **PXE**, **network**, **IPv4 boot**, the server is **not** starting from your USB.

Do these **in order**:

### C1. Ethernet unplug test (only if a cable is in the server)

- If **nothing** is plugged into the server’s **RJ-45 (network) port**, **skip this** — go to **C2**.
- If a **network cable IS plugged in** (to router, switch, or laptop), **pull it out**, **restart**, and see if the **PXE / DHCP** loop stops. Then continue with **C2**.

### C2. Change boot order (permanent)

1. When the HP / ProLiant logo appears, press **F9** (sometimes shown as **System Utilities**).
2. Find **Boot Options** or **UEFI Boot Order** (names vary).
3. Move **USB** or **Hard Drive** **above** anything named:
   - Network  
   - PXE  
   - IPv4 / IPv6 boot  
   - HTTP boot  
4. **Save** (often **F10**) and **Exit**.

When you later want **internet** or **SSH from your laptop on the home network**, plug the **server’s network port** into your **router/switch** (or use a **direct cable** to the laptop — advanced). The **HDMI converter does not replace Ethernet**; it only shows video.

### C3. One-time boot from USB

1. Restart the server.
2. When the logo appears, press **F11** (Boot Menu / one-time boot).
3. Pick **USB** or **UEFI: … USB** — **not** network, not PXE.

### C4. Do not press F12

On many HP servers **F12 = network boot**. Avoid it.

### C5. One USB only

Remove any **second** USB until the machine boots cleanly.

**STOP** when you see **Ubuntu** (purple/grub/installer text), not endless network lines.

---

## Part D — Ubuntu installer (simple choices)

### D1. Language and keyboard

Choose yours → **Continue**.

### D2. Network

- If **no cable to the router**: choose **Continue without network** / **offline** if offered, or proceed — Ubuntu can install **without** internet (some “download” messages may appear; that is OK).
- If you **plug the server into the router**, the installer can download updates — optional, not required for a working system.

### D3. Storage (most important screen)

- Choose **Guided** / **Use an entire disk**.
- Pick **only the USB** you are installing to (check **size** matches your stick — e.g. 58 GB, 29 GB).
- **Do not** worry about **NVMe** or **“no drives” on the RAID controller** if you are using **USB-only** for now. The RAID screen is for **front bay disks**; your USB shows as a **separate** disk.
- **LVM** checked is OK (default).
- On the **summary** screen → **Done** / **Continue** → **Yes** to write changes.

### D4. User and hostname

Set **your name**, **server name**, **username**, **password**. Remember them.

### D5. OpenSSH

**Install OpenSSH server** — **Yes**. Skip **import SSH key** if you don’t have one (tap **Done**).

### D6. Finish

Wait for **Install complete**. When it says **remove installation medium**:

- If you installed **onto the same USB** you booted from: follow the prompt (sometimes **Enter**; if it asks to **remove**, you may need to **remove and re-insert** the same USB quickly on reboot — awkward but common).
- If **two** USBs: remove **only the installer** if you had that setup.

**STOP** when you get a **login** prompt on the **server screen** (through your HDMI setup).

---

## If you always reboot back to English / installer (same USB loop)

Some Gen8 + **one USB** setups keep booting the **installer** partition on the stick instead of the **installed** Ubuntu. Try these **in order**:

### Option 1 — Two USB sticks (most reliable)

Use **one stick only to boot the installer**, and install **onto the other stick**.

1. On the **PC**: flash **USB A** with Rufus (Ubuntu 22.04 ISO) — **or** run `npm run proliant:quick-usb -- -DriveLetter D` (use its real letter) after Rufus so BabyGPT is on the same stick (optional).
2. **USB B**: empty / can be wiped (second stick, different size is fine).
3. Plug **both** into the server. Boot from **USB A** (F11 → that stick).
4. In the installer **storage** step: **Guided → use entire disk** → select **USB B only** (check **size** — must **not** be the same device as A).
5. Finish install to the end. **Power off**.
6. **Remove USB A** completely. Leave **only USB B** plugged in.
7. Power on → **F11** → boot from **USB B** → you should get **GRUB / login**, **not** the language screen.

After login, BabyGPT kit can be on **USB B** if you used `full-usb-deploy` on that stick on the PC, or copy from the PC later.

### Option 2 — GRUB menu (one USB)

When the server starts from the USB, **tap Esc** or **Shift** repeatedly until **GRUB** appears (may take a few tries). Pick **Ubuntu** / **boot existing OS**, **not** **Install Ubuntu** or **UEFI: … installer**.

### Option 3 — Install to internal disk later

When a **SAS/SATA** drive in the **front bays** (P420i) or **NVMe** shows up as a disk in the installer, install **there** instead of the USB. Then set BIOS to boot **that disk** first. Use the USB only as the **installer**, then remove it after install.

---

## Part E — First login

### On the server (the screen you see via HDMI/monitor)

Log in with the **username** and **password** you created.

### If you have **no Ethernet to the router** (HDMI-only to laptop)

- You **cannot** SSH from the laptop until the server and laptop share a **network**.
- Do **everything in Part F** on the **server’s own keyboard** and the **screen** you already have (HDMI to laptop or monitor).
- **Later**, plug **one Ethernet cable**: **server → router** (same LAN as the laptop on Wi‑Fi), **or** use a **direct Ethernet cable** **laptop ↔ server** and set static IPs (look up “Ubuntu direct Ethernet” if needed).

### Find the server’s IP (only after a network cable is connected)

On the server, type:

```bash
ip -br a
```

Find something like `192.168.x.x` next to `eth0` or `en...`.

### From your Windows laptop (only when the server has an IP on your LAN)

Open **PowerShell**:

```powershell
ssh YOURUSERNAME@192.168.x.x
```

Type **yes** if asked about fingerprint, then your password.

---

## Part F — Install BabyGPT (on the server)

### If the kit is still on the USB

1. List disks:

```bash
lsblk
```

2. Mount the USB (replace `sdX1` with the partition you see for the USB — often the **first partition** on the USB):

```bash
sudo mkdir -p /mnt/usb
sudo mount /dev/sdX1 /mnt/usb
ls /mnt/usb/babygpt-server-kit
```

3. Run:

```bash
cd /mnt/usb/babygpt-server-kit
chmod +x bootstrap.sh
sudo bash bootstrap.sh ./babygpt-src.zip
```

### If the USB was wiped or kit missing

On the **PC**, copy the folder `deploy\proliant\staging` to the server with **WinSCP** or:

```powershell
scp -r c:\Users\mckel\postforge\deploy\proliant\staging YOURUSERNAME@192.168.x.x:~/babygpt-kit
```

Then on the server:

```bash
cd ~/babygpt-kit
chmod +x bootstrap.sh
sudo bash bootstrap.sh ./babygpt-src.zip
```

### API keys

```bash
sudo -u babygpt nano /opt/babygpt/.env
sudo systemctl restart babygpt
```

### Firewall (if enabled)

```bash
sudo ufw allow 3000/tcp
```

---

## Part G — Open BabyGPT in a browser

- **If the server is on the same network as your laptop** (Ethernet to router, laptop on Wi‑Fi): on the **laptop**, open  
  `http://192.168.x.x:3000`  
  (same IP as Part E).

- **If you still have no network** between server and laptop: use a **browser on the server** only if you install a desktop (not default on Server), or **add network first**, or use **`curl http://localhost:3000`** on the server to test. Easiest path: **plug server into router**, get IP, then use the laptop browser.

---

## If something fails (quick table)

| What you see | What to do |
|--------------|------------|
| **DHCP / PXE forever** | Part **C** (if a cable is in the NIC, unplug it; always fix **F9** boot order, **F11** USB). |
| **Installer starts again** | Boot menu → **installed Ubuntu** or **USB with OS**, not “try/install” from wrong stick. **One USB** at a time. |
| **No disk in installer** | You’re looking at **wrong** list — scroll for **USB** size; ignore **P420i empty** if using USB-only. |
| **Can’t SSH** | **HDMI-only setup:** SSH needs **Ethernet** (server↔router or direct cable). Same Wi‑Fi/LAN? Firewall? `sudo systemctl status ssh` on server. |
| **Rufus / npm errors on PC** | Run PowerShell **as administrator**; only **one** USB plugged in when possible. |

---

## Honest note

No guide can **guarantee** every Gen8 + USB + BIOS combination will work the first time. This path matches what this repo supports: **Ubuntu 22.04**, **USB boot**, **BabyGPT** via `bootstrap.sh`. **NVMe** in a PCIe adapter can work later under Linux but is **extra** — use **USB-only** until the machine is stable.

For the **short** command list on Windows, see **`AGENTS.md`** in the repo (ProLiant section).

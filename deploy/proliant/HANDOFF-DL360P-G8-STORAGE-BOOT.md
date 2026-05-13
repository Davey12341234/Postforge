# Handoff: DL360p Gen8 — storage, RAID, boot — for the next AI / operator

This file summarizes **hardware reality** and **boot paths** for an **HP ProLiant DL360p Gen8** so another session (human or AI) does not re-derive forum myths or confuse this repo’s **Ubuntu + BabyGPT** goal with a **Windows** install.

---

## Machine (as described by operator)

| Item | Detail |
|------|--------|
| Model | **HP ProLiant DL360p Gen8** |
| System ROM | Example: **P71** (~2014 era) — verify on POST |
| RAID | **Smart Array P420i** (embedded) + **FBWC cache module** (green PCB — typical HP part) |
| Extra storage | **TEAMGROUP MP44L 1TB M.2 NVMe** on a **PCIe adapter** (third-party; not a factory HP boot stack) |
| Front bays | **No** 2.5" SATA/SAS drive + **HP caddy** reported in use for OS install |
| Installer | **Rufus** USB (**UEFI**), historically both Ubuntu Server ISOs and Windows discussed |

---

## Two separate storage domains (do not merge mentally)

1. **Smart Array P420i + drive backplane**  
   - Drives are **2.5" SAS/SATA** (with **genuine HP Gen8 caddy** / tray).  
   - These appear as **logical drives** after you create **VDs** in the **HP Array Configuration Utility** (see keys below).  
   - This is the **supported** path for “RAID controller managed” disks.

2. **NVMe on PCIe adapter**  
   - Talks to the CPU/chipset **outside** the P420i. The P420i **does not** “see” NVMe as a member disk.  
   - **Gen8 system ROM is from ~2012-era design**; **native UEFI boot from arbitrary NVMe PCIe adapters is not a guaranteed, supported feature.** Behavior varies by adapter firmware, slot, and BIOS options.

---

## What “no boot disk” usually means here

- **Empty front bays** → no volume for the installer to target **and** sometimes **nothing** the legacy boot path enumerates first.  
- **NVMe** may appear **only after** an OS loader/kernel with **NVMe drivers** runs — **firmware may still not offer “NVMe” as the first permanent boot target** the way it does for Smart Array LUNs.

---

## HP firmware keys (correcting “Ctrl+I”)

- **F9** — **RBSU** / system setup.  
- **F10** — **Intelligent Provisioning** (when enabled).  
- **F11** — **One-time boot menu**.  
- **Smart Array / ORCA** — Watch POST text: it is usually **F8** or **F5** when the **“Smart Array Configuration Utility”** / **“ORCA”** prompt appears — **not Ctrl+I** (that is common on **Intel desktop RST**, not HP Smart Array).

Use the **exact** prompt line on **this** server.

---

## Path A — Supported, boring, reliable (recommended for “just make it work”)

**Goal:** Install **Ubuntu Server** (or Windows) on a **2.5" SATA/SAS SSD** in a **front bay**, on a **Gen8 caddy**, presented through **P420i** (e.g. RAID1 or single-disk RAID0).

**Steps (high level):**

1. Install **physical drive(s)** in **HP trays** in **front bays**.  
2. At POST, enter **Smart Array utility** (F8/F5 per prompt).  
3. Create a **logical drive** (even **RAID 0** on one disk for lab).  
4. **UEFI** boot from **USB installer** (F11).  
5. Installer should see the **Smart Array logical volume** as a disk.

**BabyGPT (this repo):** After Ubuntu is up, use `deploy/proliant/RUNBOOK.md` and `bootstrap.sh` — **no NVMe required**.

---

## Path B — NVMe-only / “use what we have” (advanced, higher risk)

**Reality:** You **cannot “code” the DL360p Gen8 system ROM** to gain a **factory NVMe boot ROM** — it is **firmware**, not this repository.

### Windows (operator’s pasted plan — not this repo’s default)

- Installer may show **no disks** until **Load Driver** with **NVMe/OEM drivers**.  
- **Even after install**, **UEFI may not persist a boot entry** to NVMe on some adapters → community workarounds: **chainloader** (e.g. **rEFInd** / **Clover**) on a **small always-present device** (internal **USB**, **microSD**, or **USB key**) that **hands off** to the NVMe Windows bootloader.  
- **Automation:** DISM/driver injection, unattended XML, **not** BabyGPT TypeScript.

### Linux / Ubuntu (often easier than Windows for NVMe *data*, boot still tricky)

- **Ubuntu live/installer kernel** usually **includes `nvme`**. The disk may appear **in the installer** even when firmware boot order is weird.  
- **Bootloader placement:** Prefer **ESP on a device firmware always probes** (e.g. **small SATA volume** via P420i for `/boot/efi`, root on NVMe) **or** documented **chainload** from a **USB stick** left inserted (operational fragility).  
- **“Code around it”** here means **installer config** (curtin/autoinstall **storage** layout), **not** editing Next.js.

---

## iLO4 “self-test error”

- Logged in **iLO** → **Diagnostics** for the **exact** string.  
- May be **orthogonal** to SATA/NVMe (management NIC / PHY / NVRAM).  
- Track separately from **storage** troubleshooting.

---

## What this repo **does** and **does not** do

| Does | Does not |
|------|----------|
| `deploy/proliant/bootstrap.sh` installs **BabyGPT on Ubuntu** under `/opt/babygpt` | Inject **Windows** NVMe drivers into ISO |
| `RUNBOOK.md` — USB **Ubuntu** install + copy **staging** | Flash **Clover/rEFInd** to hardware |
| `automation/` — optional **autoinstall** HTTP seeds | Replace **HP system ROM** or **P420i firmware** via code in `src/` |

---

## Suggested next-AI task order

1. Confirm **goal OS**: **Ubuntu + BabyGPT** (this repo) vs **Windows** (different artifacts).  
2. Confirm **physical disks**: Will operator add **SATA in caddy** (Path A) or insist on **NVMe-only** (Path B)?  
3. If Path A: **Array config** → **UEFI USB** → **Ubuntu install** → **`bootstrap.sh`**.  
4. If Path B: Document **adapter model**, **PCIe slot**, **what installer sees**, and choose **Linux layout** (ESP on P420i vs chainload) **or** Windows driver + chainload plan — **separate** from BabyGPT app code.

---

## References in this repo

- `RUNBOOK.md` — default **Ubuntu 22.04 + BabyGPT** path.  
- `GRUB-FLASH-THEN-RESET.md` — installer USB instability.  
- `DL360P-GEN8-RBSU.md` — firmware terminology.  
- `automation/VERIFICATION.md` — autoinstall vs stock USB.

---

*Last intent: give the next assistant a **single factual baseline** so it does not confuse **M.2 NVMe**, **P420i RAID volumes**, and **USB installer** behavior, and does not promise “code in postforge fixes BIOS.”*

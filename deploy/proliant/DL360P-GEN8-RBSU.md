# HP ProLiant DL360p Gen8 — what the screens are called

This matches **HPE/HP ProLiant Gen8** docs (RBSU = ROM-Based Setup Utility). Your firmware may show **slightly different** wording, but the **ideas** below are the same.

## During POST (before any OS)

For a few seconds you get a **boot options** line. HP documents these keys (DL360p Gen8 user manual):

| Key   | Official name | What it’s for |
|-------|----------------|---------------|
| **F9** | **RBSU** (ROM-Based Setup Utility) | Full BIOS/platform setup (menus you’ve been in). |
| **F10** | **Intelligent Provisioning** maintenance / embedded tools | HP deployment/repair environment (not your Ubuntu USB). |
| **F11** | **Boot Menu** / one-time boot | **Pick USB once** without changing permanent order — **try this first** for Ubuntu install. |
| **F12** | **PXE** / network boot | Boot from the network (ignore for USB install). |

**Easiest path:** reboot → at HP logo press **F11** → choose **USB** / **UEFI: USB** if listed.

---

## Inside RBSU (you pressed F9)

You’ll see a **menu tree**. Common top areas:

| What you said / what it may be labeled | What it actually is |
|----------------------------------------|---------------------|
| **System Options** | Big bucket: platform, devices, boot-related items. |
| **Standard Boot Order (IPL)** | **IPL** = *Initial Program Load* = **which devices the server tries, and in what order** (CD, disk, USB, etc.). **This is the main “boot order” screen for OS install.** |
| **Boot Controller Order** | Which **storage controller** is tried first (RAID card vs onboard SATA, etc.). Use if the server keeps booting from the wrong disk controller. |
| **Standard Bootloader vs IPL** | Same family of idea: **IPL** = order/choice of **initial boot device**; “standard” vs options is still **boot ordering**, not a separate mystery mode for Ubuntu. |
| **PCI IRQ / PCI device enable** | Turn **PCI slots/devices** on or off. **Skip** unless you’re troubleshooting a card. **Not** needed to boot a USB. |
| **Power management** | Performance vs power. **Skip** for “get USB boot working.” |
| **Server security** | Passwords, TPM-style options. **Skip** until later unless something is **locking F9/F11**. |
| **BIOS serial console** | Remote **serial** access to BIOS text. **Skip** unless you use a serial terminal. |
| **Date and time** | RTC clock. Safe to set; **not** required for USB boot. |
| **Server availability** | Availability / ASR-style options (varies). Usually **skip** for install. |

**USB:** Gen8 RBSU can have a **USB** option under **System Options** — control of **USB before OS** (enable if USB boot is disabled).

---

## UEFI vs Legacy (what to match to your Rufus stick)

- Stick flashed as **GPT + UEFI** in Rufus → in RBSU look for **UEFI boot** / **UEFI boot order** and pick **UEFI: USB** in **F11** if present.
- Stick flashed as **MBR + BIOS/CSM** → use **legacy/BIOS** USB entries.

Mismatch often causes **GRUB flash then reboot**.

---

## What to ignore for “install Ubuntu from USB”

- PCI IRQ, random PCI enable/disable  
- Power policies  
- Serial console  
- Deep server security (unless F9/F11 is password-blocked)

---

## Manuals (official wording)

- *HP ProLiant DL360p Gen8* user manual — **Boot options** (F9/F10/F11/F12): see e.g. ManualsLib / HPE doc set.  
- *HP ROM-Based Setup Utility* user guide — **Standard Boot Order (IPL)**, **Boot Controller Order**.

If your **exact** menu titles differ, tell me the **exact spelling** from one screen and we map that line only.

## GRUB appears briefly then the server resets

That is **not** caused by BabyGPT / Next.js code. See **`GRUB-FLASH-THEN-RESET.md`** (`nomodeset`, UEFI vs legacy, iLO).

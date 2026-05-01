# “GRUB shows for a second, then the server resets” — not BabyGPT code

## Important

**Nothing in this Git repo (BabyGPT, Next.js, `bootstrap.sh`) runs when you power on the server.**  
Boot order is: **HP firmware → GRUB (from the Ubuntu `.iso` on USB) → Linux kernel → installer.**

If the screen **flashes GRUB (or a penguin / text) and then reboots**, that is **not** a bug in the application source code in `src/`. It almost always means **the installer kernel crashed or the firmware reset** before Ubuntu finished loading.

---

## Most likely causes (in order)

1. **UEFI vs Legacy / CSM mismatch** with how the USB was written (GPT+UEFI vs MBR+BIOS). The stick and BIOS **must agree**.
2. **Early boot graphics / framebuffer** on some servers (kernel hits a bad mode and resets). Fix: boot with **`nomodeset`**.
3. **Bad or incomplete USB write** (Rufus didn’t finish, pulled stick early, bad port).
4. **Less common:** ACPI / interrupt quirks on older ProLiant — try extra kernel flags (below).

---

## Fix A — Stop GRUB and add `nomodeset` (try this first)

1. Boot the USB again.
2. As soon as you see **“GRUB”** or the menu, press **Shift** or **Esc** until the menu **stays** (not auto-continue).
3. Highlight **Install Ubuntu Server** (or similar).
4. Press **`e`** to edit.
5. Find the line starting with **`linux`** / **`linuxefi`** (long line with `vmlinuz` and `quiet`).
6. Move to the **end** of that line (after `quiet` or `---`), add a space and:

   `nomodeset`

7. Press **Ctrl+X** or **F10** to boot.

If the installer **stays up**, the problem was **not** your project code — it was **early video / framebuffer**. You can install Ubuntu, then remove the need for `nomodeset` later with normal drivers.

---

## Fix B — Match firmware mode to the USB (UEFI vs Legacy)

| How you flashed in Rufus | What to set in HP firmware |
|--------------------------|----------------------------|
| **GPT** + **UEFI (non CSM)** | Boot that entry as **UEFI** / UEFI USB. |
| **MBR** + **BIOS or UEFI-CSM** | Prefer **Legacy BIOS** / **CSM on** for USB, or pick a **non-UEFI** USB line in the boot menu. |

If one combination **always** resets, **reflash the other way** and try again (only one variable at a time).

---

## Fix C — Prove the USB image

- **Finish Rufus** until 100% / READY; use a **rear USB 2.0** port.
- On a **normal PC or laptop**, one-time boot that same USB. If it **also** resets, **remake the stick** (or try **Ubuntu 22.04** ISO from `prepare-proliant-backup-boot.ps1`).

---

## Fix D — Bypass the USB stack (ProLiant)

If you have **iLO** and network: mount the **same `.iso`** as **virtual CD** in iLO and boot from **virtual optical**. If **that** works but USB doesn’t, focus on **USB port / UEFI USB entry / stick**.

---

## Fix E — Extra kernel flags (only if `nomodeset` + mode match didn’t help)

Edit the GRUB line again and try **one at a time** (still with `nomodeset`):

- `acpi=off`
- `noapic`
- `pci=nomsi`
- `iommu=soft` or `intel_iommu=off` (only if docs suggest for your generation)

Do **not** add all at once — change one thing, test.

---

## When BabyGPT code *does* matter

After **Ubuntu installs and boots**, copy `staging` and run:

`sudo bash bootstrap.sh ./babygpt-src.zip`

That’s when this repository’s scripts apply — **not** during GRUB.

---

## If nothing works

- Run **HP Service Pack / BIOS** updates from HPE for **DL360p Gen8** when you can (USB path and UEFI improved over the years on some systems).
- Note **whether iLO IML** logs a reset reason (thermal, watchdog, etc.).

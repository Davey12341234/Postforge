# Verification: will this path meet the objective?

**Objective (yours):** USB boots the **DL360p Gen8**, Ubuntu ends up installed, **BabyGPT** can run on the server.

There are **two different paths** in this repo. They are **not** the same.

---

## Path 1 — Normal Ubuntu Server USB (Rufus, stock ISO)

| Step | Verified? | Notes |
|------|-----------|--------|
| ISO written completely in Rufus | You must confirm | START finished, no errors. |
| Firmware boot order (IPL1 = USB) | You confirmed | Good. |
| GRUB / installer loads | **Problem you hit** | Flash then reset = **firmware/kernel/USB mode**, not BabyGPT code. Fix: `nomodeset`, **UEFI/GPT vs Legacy/MBR** match, try **22.04** ISO, try **iLO** virtual CD. |
| Interactive install completes | Manual | Creates user, disk layout, **OpenSSH**. |
| Copy `staging` + run `bootstrap.sh` | Manual or SSH | Needs **internet** on server for `apt` / `npm` / NodeSource. |

**Verdict:** This path **can** meet the objective. It does **not** use `serve-babygpt-staging-http.ps1` or `nocloud/` until **after** OS install. **No code bug** in the repo blocks it — the blocker is **boot stability** (GRUB reset), which is environmental.

---

## Path 2 — “Unattended” autoinstall + HTTP (`ds=nocloud-net`)

| Step | Verified? | Notes |
|------|-----------|--------|
| `serve-babygpt-staging-http.ps1` running on PC | Script is OK | Serves `/user-data`, `/meta-data`, `/babygpt-src.zip`, `/bootstrap.sh`. Windows may need **Admin** or `netsh http add urlacl` for `http://+:8080/`. |
| `user-data` edited (no `CHANGEME`) | **Required** | Invalid password / IP → install or first boot **fails**. |
| Server and PC on **same L2** (or routed) | **Required** | Installer and first boot must **HTTP GET** your PC’s IP. |
| **Kernel cmdline** contains `autoinstall ds=nocloud-net;s=http://YOUR_PC:8080/` | **Often missing** | A **stock** Ubuntu ISO from Rufus does **not** add this automatically. Without it, autoinstall **never runs** — you get the **normal** installer only. |
| **Internet** on server for `bootstrap.sh` | **Required** | NodeSource, `apt`, `npm` need outbound WAN (unless you add mirrors). |

**Verdict:** The **HTTP server + YAML** are internally consistent **if** the installer kernel actually receives **`autoinstall` + seed URL**. On a **plain USB** from Rufus, that usually means **one** of:

- **Edit GRUB** at boot (add the params to the `linux` line), **or**
- **iLO virtual media** + set boot options / ISO that includes those params, **or**
- **Remaster** the ISO (advanced).

So: **Path 2 is not “plug USB only”** unless you add one of the above. It is **not** broken application code — it’s an **incomplete boot chain** if only stock Rufus is used.

---

## What “major objective is met” means in practice

- **Minimum success:** Ubuntu Server running, **SSH** works, **`bootstrap.sh`** completes, **`babygpt` systemd** active.  
  → Achievable by **Path 1** once USB boot is stable (or **iLO** ISO boot).

- **Full automation (Path 2):** Same end state **without** interactive install — only after **`autoinstall`** is actually triggered and **`user-data`** is valid.

---

## Quick self-check

1. **Stock USB, no GRUB edit:** If you never added `autoinstall` to the kernel line, **`nocloud` HTTP is unused** during install.  
2. **If GRUB resets before you can edit:** Fix boot stability first (see `GRUB-FLASH-THEN-RESET.md`); automation YAML cannot run before the installer loads.  
3. **Firewall on Windows:** Allow inbound **TCP 8080** (or the port you choose) for the staging server.

---

## Summary

| Question | Answer |
|----------|--------|
| Is the **HTTP helper script** wrong? | It’s a valid minimal static server for seeds. |
| Is **`user-data.template.yaml`** structurally OK for autoinstall? | Yes, **after** you replace `CHANGEME` and point IPs correctly. |
| Will a **normal Rufus USB alone** run full autoinstall? | **Usually no** — you must inject **`autoinstall`** + URL into the **kernel command line** or use **iLO**/remaster. |
| Will **Path 1** meet the objective? | **Yes**, once the installer **stays up** and you run **`bootstrap.sh`**. |

This is the accurate review: **nothing in `src/` blocks the server**; **USB boot stability** and **whether autoinstall is actually invoked** decide success.

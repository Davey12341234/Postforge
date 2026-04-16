# Automation: install with less (or no) time at the keyboard

**End-to-end review:** see **`VERIFICATION.md`** — plain **USB + Rufus** vs **autoinstall + HTTP**, and what must be true for Ubuntu + BabyGPT.

**Reality:** No AI (including this assistant) can press physical power buttons, approve UAC on your PC, or complete HP POST keypresses **unless** something else already provides a **remote control path** (usually **iLO**, **IPMI**, or a **robot**). What we *can* do is document and script **paths that remove repeated manual steps** once a network or API exists.

## Ranked options (most “hands-off” first)

| Path | What you automate | What still needs a human (once) |
|------|-------------------|-----------------------------------|
| **A. iLO + virtual media + API** | Power on, mount ISO from URL, one-time boot order, OS install | iLO on network + credentials; firmware may need one physical visit |
| **B. Ubuntu autoinstall + HTTP seed** | Unattended OS install + SSH + optional `bootstrap.sh` | Boot medium must load kernel with `autoinstall` + seed URL (see `nocloud/`) |
| **C. PXE + MAAS / netboot** | Diskless install from your LAN | DHCP/TFTP/DNS server you operate |
| **D. Colo / hands** | Remote hands plug USB | N/A |

## Files in this folder

| Item | Purpose |
|------|---------|
| `nocloud/user-data.template.yaml` | **Ubuntu autoinstall** template — copy to `nocloud/user-data` (no extension) after editing `CHANGEME_*`. |
| `nocloud/meta-data` | Minimal `meta-data` for nocloud. |
| `../../scripts/serve-babygpt-staging-http.ps1` | Tiny HTTP server: serves `staging/` + `/user-data` + `/meta-data` for **`ds=nocloud-net`**. May need **Run as Administrator** or `netsh http add urlacl` for `http://+:8080/`. |
| `ilo-redfish-notes.md` | **iLO 4** — remote power + virtual media pointers (reduces physical intervention). |

## Autoinstall boot path (still needs *one* boot source)

The installer must load with a kernel cmdline that includes the autoinstall datasource, for example:

`autoinstall ds=nocloud-net\;s=http://YOUR_PC_IP:8080/`

How that gets onto the boot medium is **your** choice: **iLO virtual CD** (best for “no USB”), **GRUB edit once**, or a **remastered ISO** (advanced). AI can help draft configs; it cannot emit a finished ISO binary in this repo without your build tools.

## “Using AI”

AI can **author** these configs and scripts; it cannot **bind** to your iLO or **drive** GRUB on metal without **your** network credentials and **supported APIs**. Use AI to **fill in** `user-data`, **review** Redfish payloads, and **iterate** on autoinstall YAML — not as a substitute for iLO/PXE infrastructure.

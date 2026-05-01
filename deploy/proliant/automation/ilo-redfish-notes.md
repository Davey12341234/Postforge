# iLO 4 — remote power and virtual media (reduce trips to the rack)

AI cannot log into iLO for you; **you** provide the network path. After iLO has an IP, many tasks become **scriptable** so *you* do not repeat keyboard work at the console.

## What iLO can do (firmware-dependent)

- **Power on / off / reset** (Redfish / RIBCL / SSH on some builds)
- **Virtual media**: mount an **ISO from URL** (HTTPS limitations apply — often need a cert the iLO trusts, or internal HTTP)
- **Remote console** (Java/HTML5) — still a human usually drives the UI unless using vendor APIs for KVM (limited)

## HPE documentation

- Search: **HPE iLO 4 RESTful API** or **Redfish** for your exact iLO firmware.
- iLO 4 gained **Redfish** in later firmware versions; older builds are **XML/RIBCL** only.

## Typical automation shape (conceptual)

1. Put the Ubuntu `.iso` and/or your **autoinstall seed** on an **HTTP(S)** server the **iLO can reach** (same VLAN, or port-forward).
2. From a workstation: **POST** to iLO to **insert virtual media** + **set one-time boot** to **CD-ROM** + **power on**.
3. Ubuntu **autoinstall** pulls `user-data` over HTTP (`ds=nocloud-net`) — see `automation/README.md`.

## Security

Never commit iLO passwords to git. Use environment variables or a secrets manager.

## When USB keeps crashing

If **physical USB** resets at GRUB, **iLO virtual CD** with the **same ISO** often uses a **different boot path** and can succeed without changing ProLiant USB ports.

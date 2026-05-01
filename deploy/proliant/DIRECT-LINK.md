# Direct link: PC ↔ server (USB–Ethernet)

Nothing in this repo can “dial in” to your hardware from the internet. This doc is for a **local** cable between your Windows PC and the server so you can **ping / SSH / browser (iLO)** without a router.

## 1. Physical

- One cable: **PC USB–Ethernet dongle** ↔ **server’s NIC** (or switch between them).
- Link lights on both ends help; **no switch** is required (modern NICs auto-crossover).

## 2. Windows: static IP (Admin PowerShell)

Find the adapter name:

```powershell
Get-NetAdapter | Format-Table Name, InterfaceDescription, Status
```

Pick the **USB–Ethernet** row (e.g. `Ethernet 4`, ASIX, Realtek USB).

```powershell
cd c:\Users\mckel\postforge
.\scripts\set-direct-link-ethernet.ps1 -InterfaceAlias "Ethernet 4" -IPAddress 10.10.10.1
```

This PC becomes **10.10.10.1**. Use **10.10.10.2** on the server (see below).

## 3. Ubuntu Server (when it boots)

Example **netplan** (`/etc/netplan/01-dhcp.yaml` or your file):

```yaml
network:
  version: 2
  ethernets:
    eno1:
      addresses:
        - 10.10.10.2/24
```

Apply:

```bash
sudo netplan apply
```

(Replace `eno1` with `ip link` / `ip a` name for the NIC on the cable.)

## 4. Test

From Windows:

```powershell
ping 10.10.10.2
ssh youruser@10.10.10.2
```

## 5. iLO (separate from data NIC)

iLO has its **own** port or **shared** NIC. Its IP is **independent**. Set iLO address in iLO setup or DHCP on your **LAN**; a **USB–Ethernet dongle on your PC does not attach to iLO** unless that dongle is plugged into a **PC** and the **server’s normal Ethernet** is cabled to it—not the iLO port. If you need iLO, use the **dedicated iLO** cable to your **router/switch** or give iLO a static IP on a network your PC can reach.

## 6. BabyGPT

After Ubuntu is installed and reachable: copy `deploy/proliant/staging` and run `bootstrap.sh` as in `README.md`. The app listens on `0.0.0.0:3000`; open `http://10.10.10.2:3000` from the PC once the service is up.

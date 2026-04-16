# Simple help: USB install + cable to your PC

You do **not** need to understand networking theory. Follow **Part 1**, then **Part 2** when you’re ready.

---

## Part 1 — Put Ubuntu on the USB stick (Windows)

1. Plug in the **USB flash drive** you want to erase.
2. Open **Rufus** (Start menu → type **Rufus** → open it).
3. At **Device**, pick your **USB stick** (check the size, e.g. 64 GB — **not** your C: drive).
4. Click the big **SELECT** button (opens a file window — **not** MS-DOS / FreeDOS in a dropdown).
5. Go to this folder and click the file:
   - `c:\Users\mckel\postforge\deploy\proliant\staging\`
   - Open **`ubuntu-22.04-live-server-amd64.iso`** (or `ubuntu-live-server-amd64.iso` if that’s what you have).
6. Set:
   - **Partition scheme:** **GPT**
   - **Target system:** **UEFI (non CSM)**
7. Click **START**. Say **OK** if Windows warns about destroying data.
8. Wait until it says **READY** again. Use **Safely Remove** before unplugging.

**Then:** plug that USB into the **server**, power on, press **F9** or **F11** (if your screen says so) and choose **USB** / **UEFI USB** to install Ubuntu. Finish the installer (username, password, enable **OpenSSH** if it asks).

---

## Part 2 — Cable from PC to server (after Ubuntu is installed)

Goal: your **PC** can **ping** and **SSH** to the **server** using a **direct Ethernet cable** (and your **USB‑to‑Ethernet** dongle on the PC).

### On your Windows PC (easiest)

1. Plug **USB‑Ethernet** into the PC. Run **Ethernet cable** from that dongle to the **server’s normal network port** (not iLO unless that’s the only jack you’re using on purpose).

2. Open **PowerShell as Administrator**:
   - Press **Windows key**, type **PowerShell**
   - Right‑click **Windows PowerShell** → **Run as administrator** → **Yes**.

3. Run:

```powershell
cd c:\Users\mckel\postforge
.\scripts\setup-direct-link-simple.ps1
```

4. The script will **list network adapters** and ask you to **type a number** for the one that is your **USB‑Ethernet** (often says **USB**, **ASIX**, or **Realtek**). Press Enter.

5. It will set this PC to **10.10.10.1**. Leave the window open.

### On the server (one time)

Log in **on the server keyboard/monitor** (or any way you still have access).

1. See interface names:

```bash
ip -br link
```

2. Pick the name for the **Ethernet port your cable is in** (often `eno1`, `enp5s0`, or `eth0` — **not** `lo`).

3. Run (replace `eno1` with your name):

```bash
sudo ip addr add 10.10.10.2/24 dev eno1
```

If it says “File exists,” the address is already there — try `ping 10.10.10.1` from the server.

Test from the **PC** PowerShell (**not** admin needed):

```powershell
ping 10.10.10.2
ssh YOUR_USERNAME@10.10.10.2
```

Use the **Linux username** you created when you installed Ubuntu.

---

## If you’re stuck

- **Rufus START is gray:** you didn’t **SELECT** the `.iso` file yet (Part 1, step 4–5).
- **Server won’t boot USB:** try **F9/F11** boot menu; or use **iLO** to mount the same `.iso` as virtual CD (separate from this doc).
- **Ping fails:** cable unplugged, wrong NIC on server, or firewall — say what `ping` prints.

You can paste **screenshots or exact error text** next time and we narrow it to one fix.

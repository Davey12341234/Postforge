BOOT STUB USB (partitioned for ProLiant Gen8 + NVMe, no front-bay disks)

Layout:
  Partition 1 (~550 MB, FAT32): EFI System Partition  -> use as /boot/efi in Ubuntu custom install.
  Partition 2 (rest, unformatted):                      -> use as /boot (ext4) in Ubuntu installer.

Ubuntu Server install (short):
  1) Plug the INSTALLER USB and this BOOT-STUB USB (rear ports).
  2) F11 -> one-time boot to USB (installer).
  3) Storage: Custom / manual.
  4) NVMe device: mount as / (root). This USB: first small partition = EFI for /boot/efi,
     second partition = ext4 mounted at /boot (installer will format ext4).
  5) Install bootloader to the EFI partition on THIS USB when prompted.

After install: keep this USB plugged; boot order USB before network (F9 IPL).

BabyGPT after SSH works: RUNBOOK.md + bootstrap.sh on the server.

See HANDOFF-DL360P-G8-STORAGE-BOOT.md in the repo.

Windows troubleshooting:

  "running scripts is disabled on this system" (ExecutionPolicy)
    If ELEVATE / .ps1 fails: use ESP-FIX-Admin.cmd — Right-click -> Run as administrator.
    (Plain double-click is not enough; Windows must show "Administrator" in the title bar.)
    That path uses only DiskPart + copy (no PowerShell script execution).
    Or in PowerShell (this window only, then run the .ps1 again):
      Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
    Or one line: powershell -ExecutionPolicy Bypass -File .\scripts\fix-bootstub-esp.ps1 -DiskNumber 1
    Or permanent for your user: Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

  "Virtual Disk Service error: The operation is not supported on removable media"
    Some DiskPart commands (e.g. create partition efi) fail on removable USB sticks.
    The repo scripts and deploy/proliant/diskpart-reflash-boot-stub-usb.txt use a 550 MB PRIMARY
    partition plus set id to the EFI GUID, then FAT32 — not "create partition efi".

  "The volume does not contain a recognized file system"
    Partition 1 is not FAT32 yet or is corrupt. From an elevated PowerShell (Administrator):
    .\scripts\fix-bootstub-esp.ps1 -DiskNumber N   (use your USB disk number from Get-Disk).
    Or re-run prepare-boot-stub-usb.ps1, or use Disk Management: ~550 MB FAT32 on partition 1.

  Cannot copy to T:\ (access denied)
    Open File Explorer as Administrator, or assign the letter in Disk Management and retry.

Verify layout: double-click verify-bootstub-usb.bat in the repo root, or:
    powershell -ExecutionPolicy Bypass -File .\scripts\verify-boot-stub-usb.ps1 -DiskNumber 1

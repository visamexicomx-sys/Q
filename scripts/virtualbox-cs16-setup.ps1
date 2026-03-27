#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Automated VirtualBox installation and Counter-Strike 1.6 VM setup for Windows 11.

.DESCRIPTION
    This script:
    1. Downloads and installs Oracle VirtualBox (latest 7.x)
    2. Creates a Windows XP / Windows 7 VM optimized for CS 1.6
    3. Configures VM settings (RAM, CPU, video, network, audio)
    4. Provides instructions for installing CS 1.6 inside the VM

.NOTES
    Run this script as Administrator in PowerShell.
    Requires: Windows 11, ~30 GB free disk space, internet connection.
#>

param(
    [string]$VMName = "CS16-VM",
    [string]$VMPath = "$env:USERPROFILE\VirtualBox VMs",
    [int]$RAMSizeMB = 2048,
    [int]$CPUCount = 2,
    [int]$DiskSizeGB = 25,
    [int]$VRAMSizeMB = 128,
    [string]$GuestOS = "WindowsXP",   # WindowsXP or Windows7
    [string]$ISOPath = ""              # Path to Windows guest ISO
)

$ErrorActionPreference = "Stop"

# --- Helper Functions ---

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Test-CommandExists {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# --- Step 1: Install VirtualBox ---

Write-Step "Checking for VirtualBox installation..."

$vboxInstalled = Test-Path "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"

if (-not $vboxInstalled) {
    Write-Step "Downloading VirtualBox installer..."

    $downloadPage = "https://www.virtualbox.org/wiki/Downloads"
    Write-Host "Please download VirtualBox for Windows from:"
    Write-Host "  $downloadPage" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternatively, install via winget:" -ForegroundColor Yellow
    Write-Host "  winget install Oracle.VirtualBox" -ForegroundColor Green
    Write-Host ""

    $useWinget = Read-Host "Install via winget now? (Y/N)"
    if ($useWinget -eq "Y" -or $useWinget -eq "y") {
        Write-Step "Installing VirtualBox via winget..."
        winget install Oracle.VirtualBox --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -ne 0) {
            Write-Error "winget installation failed. Please install VirtualBox manually."
            exit 1
        }
    } else {
        Write-Host "Install VirtualBox manually, then re-run this script." -ForegroundColor Yellow
        exit 0
    }
}

# Verify VBoxManage is available
$VBoxManage = "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"
if (-not (Test-Path $VBoxManage)) {
    Write-Error "VBoxManage.exe not found. Ensure VirtualBox is installed correctly."
    exit 1
}

Write-Host "VirtualBox found at: $VBoxManage" -ForegroundColor Green
& $VBoxManage --version

# --- Step 2: Create the VM ---

Write-Step "Creating VM: $VMName"

# Check if VM already exists
$existingVMs = & $VBoxManage list vms
if ($existingVMs -match "`"$VMName`"") {
    Write-Host "VM '$VMName' already exists. Skipping creation." -ForegroundColor Yellow
} else {
    # Create VM
    & $VBoxManage createvm --name $VMName --basefolder $VMPath --ostype $GuestOS --register

    # --- Step 3: Configure VM Settings ---

    Write-Step "Configuring VM hardware..."

    # Basic hardware
    & $VBoxManage modifyvm $VMName `
        --memory $RAMSizeMB `
        --cpus $CPUCount `
        --vram $VRAMSizeMB `
        --graphicscontroller vboxsvga `
        --accelerate3d on `
        --audio-driver dsound `
        --audio-out on `
        --audio-in on `
        --nic1 nat `
        --usb on `
        --clipboard bidirectional `
        --draganddrop bidirectional `
        --boot1 dvd `
        --boot2 disk `
        --boot3 none `
        --boot4 none

    # Create and attach virtual hard disk
    Write-Step "Creating virtual hard disk (${DiskSizeGB}GB)..."
    $vdiPath = Join-Path $VMPath "$VMName\$VMName.vdi"
    & $VBoxManage createmedium disk --filename $vdiPath --size ($DiskSizeGB * 1024) --format VDI

    # Add storage controllers
    & $VBoxManage storagectl $VMName --name "IDE Controller" --add ide --controller PIIX4
    & $VBoxManage storagectl $VMName --name "SATA Controller" --add sata --controller IntelAhci --portcount 2

    # Attach hard disk
    & $VBoxManage storageattach $VMName --storagectl "SATA Controller" --port 0 --device 0 --type hdd --medium $vdiPath

    # Attach ISO if provided
    if ($ISOPath -and (Test-Path $ISOPath)) {
        Write-Step "Attaching ISO: $ISOPath"
        & $VBoxManage storageattach $VMName --storagectl "IDE Controller" --port 0 --device 0 --type dvddrive --medium $ISOPath
    } else {
        Write-Host "No ISO attached. You can attach one later via VirtualBox GUI." -ForegroundColor Yellow
        & $VBoxManage storageattach $VMName --storagectl "IDE Controller" --port 0 --device 0 --type dvddrive --medium emptydrive
    }

    Write-Host "VM '$VMName' created and configured successfully!" -ForegroundColor Green
}

# --- Step 4: Print Summary and CS 1.6 Install Instructions ---

Write-Step "Setup Summary"
Write-Host @"

  VM Name:        $VMName
  Guest OS:       $GuestOS
  RAM:            $RAMSizeMB MB
  CPUs:           $CPUCount
  VRAM:           $VRAMSizeMB MB
  Disk:           $DiskSizeGB GB
  3D Accel:       Enabled
  Audio:          Enabled (DirectSound)
  Network:        NAT

"@ -ForegroundColor White

Write-Step "Next Steps to Install Counter-Strike 1.6"
Write-Host @"

  1. INSTALL GUEST OS
     - If you haven't attached an ISO, open VirtualBox GUI:
       Settings > Storage > IDE Controller > Add optical drive > Choose ISO
     - Start the VM and install Windows (XP recommended for best CS 1.6 compat)

  2. INSTALL VIRTUALBOX GUEST ADDITIONS (inside the VM)
     - In VM menu: Devices > Insert Guest Additions CD
     - Run the installer inside the VM, then reboot
     - This enables 3D acceleration, shared folders, and better performance

  3. INSTALL COUNTER-STRIKE 1.6
     Option A - Steam:
       - Download Steam inside the VM: https://store.steampowered.com/about/
       - Install Steam, log in, and install Counter-Strike from your library
     Option B - Standalone installer:
       - Copy a CS 1.6 installer to the VM via shared folder or USB
       - Run the installer

  4. CONFIGURE CS 1.6 FOR BEST PERFORMANCE
     - Launch CS 1.6 and go to Options > Video
     - Set renderer to: OpenGL (preferred) or Direct3D
     - Resolution: 800x600 or 1024x768
     - Disable VSync for lower input lag
     - In console (~): set fps_max 100

  5. NETWORK PLAY
     - NAT networking allows internet access for online servers
     - For LAN play with host: change VM network to "Bridged Adapter"
       VBoxManage modifyvm "$VMName" --nic1 bridged --bridgeadapter1 "YOUR_ADAPTER"

  6. PERFORMANCE TIPS
     - Keep guest OS lightweight (disable themes, services)
     - Use Windows XP for lowest overhead
     - Ensure VT-x/AMD-V is enabled in BIOS
     - Close unnecessary apps on the host

"@ -ForegroundColor White

Write-Step "Quick Commands"
Write-Host @"

  Start VM:        & "$VBoxManage" startvm "$VMName"
  Stop VM:         & "$VBoxManage" controlvm "$VMName" acpipowerbutton
  Take Snapshot:   & "$VBoxManage" snapshot "$VMName" take "clean-install"
  Shared Folder:   & "$VBoxManage" sharedfolder add "$VMName" --name "shared" --hostpath "C:\Shared" --automount

"@ -ForegroundColor Gray

Write-Host "Done! Start your VM and enjoy Counter-Strike 1.6." -ForegroundColor Green

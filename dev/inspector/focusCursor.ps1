# Bring the Cursor IDE window to the foreground after an inspector open.
$ErrorActionPreference = 'SilentlyContinue'

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class InspFocus {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
  public static void ForceForeground(IntPtr hWnd) {
    uint forePid;
    IntPtr fore = GetForegroundWindow();
    uint foreThread = GetWindowThreadProcessId(fore, out forePid);
    uint appThread = GetCurrentThreadId();
    if (foreThread != appThread) AttachThreadInput(appThread, foreThread, true);
    if (IsIconic(hWnd)) ShowWindowAsync(hWnd, 9);
    else ShowWindowAsync(hWnd, 5);
    SetForegroundWindow(hWnd);
    if (foreThread != appThread) AttachThreadInput(appThread, foreThread, false);
  }
}
"@

$targets = Get-Process -Name 'Cursor' |
  Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero -and $_.MainWindowTitle }

foreach ($p in $targets) {
  [InspFocus]::ForceForeground($p.MainWindowHandle)
  try {
    $wshell = New-Object -ComObject WScript.Shell
    [void]$wshell.AppActivate($p.Id)
  } catch {}
}

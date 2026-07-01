@echo off
echo Adding Windows Firewall rules for Expo Metro...
netsh advfirewall firewall delete rule name="Expo Metro Bundler" >nul 2>&1
netsh advfirewall firewall add rule name="Expo Metro Bundler" dir=in action=allow protocol=TCP localport=8081-8099 profile=any enable=yes
netsh advfirewall firewall delete rule name="Node.js Expo" >nul 2>&1
netsh advfirewall firewall add rule name="Node.js Expo" dir=in action=allow program="%ProgramFiles%\nodejs\node.exe" profile=any enable=yes
if %errorlevel% equ 0 (
  echo Success - firewall updated for ALL networks.
  echo.
  echo iPhone users: Settings - Expo Go - turn ON Local Network
  echo Then run: npm start
) else (
  echo Failed. Run this file as Administrator.
)
pause
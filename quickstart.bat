@echo off
setlocal
cd /d "%~dp0" || goto failed

set "MODE=%~1"
if "%MODE%"=="" set "MODE=quest"

if /I "%MODE%"=="play" goto configure_quest
if /I "%MODE%"=="desktop" goto configure_local
if /I "%MODE%"=="emulate" goto configure_local
if /I "%MODE%"=="quest" goto configure_quest
if /I "%MODE%"=="test" goto prerequisites
if /I "%MODE%"=="check" goto prerequisites
goto usage

:configure_local
set "PROTOCOL=http"
set "START_PORT=5174"
set "NPM_SCRIPT=dev:local"
set "SERVER_TITLE=THE GAME desktop dev server"
goto prerequisites

:configure_quest
set "PROTOCOL=https"
set "START_PORT=5173"
set "NPM_SCRIPT=dev"
set "SERVER_TITLE=THE GAME Quest dev server"
goto prerequisites

:prerequisites
where.exe node.exe >nul 2>&1 || goto no_node
where.exe npm.cmd >nul 2>&1 || goto no_node

if not exist "node_modules\.bin\vite.cmd" (
    echo Installing project dependencies...
    call npm.cmd ci || goto failed
)

if /I "%MODE%"=="test" (
    echo Running THE GAME tests...
    call npm.cmd test || goto failed
    echo.
    echo Tests passed.
    exit /b 0
)

if /I "%MODE%"=="check" (
    echo Type-checking, testing, building, and checking download budgets...
    call npm.cmd run typecheck || goto failed
    call npm.cmd test || goto failed
    call npm.cmd run build || goto failed
    call npm.cmd run size || goto failed
    echo.
    echo All checks passed.
    exit /b 0
)

:select_port
set /a PORT=%START_PORT%
set /a LAST_PORT=%START_PORT%+20
:try_port
set "BASE_URL=%PROTOCOL%://127.0.0.1:%PORT%/"
powershell.exe -NoProfile -Command "$ports=[System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners().Port; if ($ports -contains %PORT%) { exit 0 } else { exit 1 }" >nul 2>&1
if errorlevel 1 goto port_selected
node.exe -e "const u=new URL(process.argv[1]);const h=require(u.protocol==='https:'?'https':'http');const q=h.get(u,{rejectUnauthorized:false},r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>process.exit(b.includes('<title>THE GAME</title>')?0:2))});q.setTimeout(2000,()=>q.destroy());q.on('error',()=>process.exit(1))" "%BASE_URL%" >nul 2>&1
if not errorlevel 1 goto port_selected
echo Port %PORT% is in use; trying the next one...
set /a PORT+=1
if %PORT% GTR %LAST_PORT% goto no_port
goto try_port

:port_selected
set "URL=%BASE_URL%"
if /I "%MODE%"=="emulate" set "URL=%BASE_URL%?emulate"

node.exe -e "const u=new URL(process.argv[1]);const h=require(u.protocol==='https:'?'https':'http');const q=h.get(u,{rejectUnauthorized:false},r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>process.exit(b.includes('<title>THE GAME</title>')?0:2))});q.setTimeout(2000,()=>q.destroy());q.on('error',()=>process.exit(1))" "%BASE_URL%" >nul 2>&1
if not errorlevel 1 goto open_browser

echo Starting %SERVER_TITLE%...
cmd.exe /d /c exit 0
start "%SERVER_TITLE%" /D "%~dp0" cmd.exe /k npm.cmd run %NPM_SCRIPT% -- --port %PORT%
if errorlevel 1 goto failed

set /a attempts=0
:wait_for_server
node.exe -e "const u=new URL(process.argv[1]);const h=require(u.protocol==='https:'?'https':'http');const q=h.get(u,{rejectUnauthorized:false},r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>process.exit(b.includes('<title>THE GAME</title>')?0:2))});q.setTimeout(2000,()=>q.destroy());q.on('error',()=>process.exit(1))" "%BASE_URL%" >nul 2>&1
if errorlevel 2 goto port_taken_during_start
if not errorlevel 1 goto open_browser
set /a attempts+=1
if %attempts% GEQ 30 goto not_ready
powershell.exe -NoProfile -Command "Start-Sleep -Seconds 1"
goto wait_for_server

:open_browser
if /I "%MODE%"=="quest" (
    echo.
    echo The Quest server is ready. Use the Network URL shown in the server window
    echo on a Quest connected to the same Wi-Fi. Accept the certificate warning once.
    echo.
)
echo Opening %URL%
start "" "%URL%"
if errorlevel 1 (
    echo The browser did not open automatically. Visit %URL%
    pause
    exit /b 1
)
exit /b 0

:usage
echo Usage: quickstart.bat [quest^|desktop^|emulate^|test^|check]
echo.
echo   quest    Start HTTPS on the LAN; use the Network URL shown on the headset.
echo            This is the default when you double-click quickstart.bat.
echo   desktop  Start plain HTTP localhost play for a desktop browser.
echo   emulate  Start Meta's Quest 3 emulator in the desktop browser.
echo   test     Run the unit tests.
echo   check    Type-check, test, build, and verify the download budgets.
exit /b 2

:no_node
echo Node.js and npm are required. Install Node.js, then run quickstart.bat again.
pause
exit /b 1

:no_port
echo No free port was found from %START_PORT% through %LAST_PORT%.
echo Close an unused local server and try again.
pause
exit /b 1

:port_taken_during_start
echo Port %PORT% was taken while THE GAME was starting. Run quickstart.bat again.
pause
exit /b 1

:not_ready
echo THE GAME did not become ready at %BASE_URL%.
echo Check the dev server window for the error.
pause
exit /b 1

:failed
echo Launcher stopped because a command failed.
pause
exit /b 1

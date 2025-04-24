@echo off
setlocal EnableDelayedExpansion

:: Check if .env file exists
if not exist .env (
    echo .env file not found
    exit /b 1
)

:: Initialize empty string for environment variables
set "EB_VARS="

:: Read .env file and build the command
for /f "tokens=*" %%a in (.env) do (
    :: Skip empty lines and comments
    echo %%a | findstr /r "^#" > nul
    if errorlevel 1 (
        :: Add to our variable string if not empty
        if not "%%a"=="" (
            set "EB_VARS=!EB_VARS! %%a"
        )
    )
)

:: Remove leading space
set "EB_VARS=!EB_VARS:~1!"

:: Execute eb setenv command
echo Running: eb setenv !EB_VARS!
eb setenv !EB_VARS!

endlocal

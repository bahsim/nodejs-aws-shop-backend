@echo off
setlocal EnableDelayedExpansion

REM Load environment variables from .env file
if not exist .env (
    echo .env file not found
    exit /b 1
)

REM Read and set environment variables from .env
for /f "tokens=*" %%a in (.env) do (
    set %%a
)

REM Check required variables
set REQUIRED_VARS=CART_SERVICE_URL PRODUCT_SERVICE_URL
for %%v in (%REQUIRED_VARS%) do (
    if "!%%v!"=="" (
        echo Error: %%v is not set in .env file
        exit /b 1
    )
)

REM Create Elastic Beanstalk environment
eb create bff-api-env ^
    --cname bahsim-bff-api-env ^
    --single ^
    --envvars CART_SERVICE_URL=%CART_SERVICE_URL%,PRODUCT_SERVICE_URL=%PRODUCT_SERVICE_URL%

endlocal

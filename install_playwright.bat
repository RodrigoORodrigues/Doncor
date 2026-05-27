@echo off
REM Script para instalar Playwright corretamente

echo.
echo ========================================
echo Instalando Playwright para Doncor RPA
echo ========================================
echo.

REM Tentar encontrar Python
if exist "C:\Python311\python.exe" (
    set PYTHON=C:\Python311\python.exe
    echo Encontrado Python em C:\Python311
) else if exist "C:\Python312\python.exe" (
    set PYTHON=C:\Python312\python.exe
    echo Encontrado Python em C:\Python312
) else if exist "C:\Python313\python.exe" (
    set PYTHON=C:\Python313\python.exe
    echo Encontrado Python em C:\Python313
) else (
    REM Tenta o programa padrão
    for /f "tokens=*" %%i in ('where python.exe 2^>nul') do set PYTHON=%%i
)

if "%PYTHON%"=="" (
    echo.
    echo ERRO: Python nao encontrado no sistema!
    echo.
    echo Solucao: Instale Python 3.11 ou 3.12 de https://www.python.org
    echo.
    pause
    exit /b 1
)

echo Python encontrado: %PYTHON%
%PYTHON% --version
echo.

REM Instalar Playwright
echo Instalando Playwright...
%PYTHON% -m pip install --upgrade pip
%PYTHON% -m pip install playwright>=1.40.0

if errorlevel 1 (
    echo.
    echo ERRO: Falha ao instalar Playwright
    pause
    exit /b 1
)

REM Instalar browsers
echo.
echo Instalando Chromium browser...
%PYTHON% -m playwright install chromium

if errorlevel 1 (
    echo.
    echo ERRO: Falha ao instalar Chromium
    pause
    exit /b 1
)

echo.
echo ========================================
echo Instalacao concluida com sucesso!
echo ========================================
echo.
echo Proximos passos:
echo 1. Abra outro terminal
echo 2. Execute: SERVICE_TYPE=rpa python -m uvicorn rpa_service_example:app --port 8001
echo.
pause

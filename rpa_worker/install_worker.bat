@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

echo.
echo ============================================================
echo   Doncor RPA Worker — Instalação
echo ============================================================
echo.

:: ── 1. Verificar Python ───────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python não encontrado. Instale em: https://www.python.org/downloads/
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('python --version 2^>^&1') do set PY_VER=%%v
echo [OK] %PY_VER% encontrado

:: ── 2. Criar .venv ───────────────────────────────────────────
if not exist ".venv" (
    echo.
    echo [INFO] Criando ambiente virtual...
    python -m venv .venv
) else (
    echo [OK] Ambiente virtual já existe
)

:: ── 3. Ativar .venv ──────────────────────────────────────────
call .venv\Scripts\activate.bat

:: ── 4. Instalar dependências ──────────────────────────────────
echo.
echo [INFO] Instalando dependências...
pip install --quiet --upgrade pip
pip install --quiet -r requirements_worker.txt
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependências
    pause
    exit /b 1
)
echo [OK] Dependências instaladas

:: ── 5. Instalar Chromium ─────────────────────────────────────
echo.
echo [INFO] Instalando Chromium do Playwright (pode demorar alguns minutos)...
python -m playwright install chromium
if errorlevel 1 (
    echo [ERRO] Falha ao instalar Chromium
    pause
    exit /b 1
)
echo [OK] Chromium instalado

:: ── 6. Gerar token seguro ────────────────────────────────────
echo.
echo [INFO] Gerando WORKER_TOKEN seguro...
for /f "tokens=*" %%t in ('python -c "import secrets; print(secrets.token_hex(32))"') do set GENERATED_TOKEN=%%t
echo.
echo ============================================================
echo   TOKEN GERADO:
echo   !GENERATED_TOKEN!
echo ============================================================
echo.

:: ── 7. Criar .env (se não existir) ───────────────────────────
if not exist ".env" (
    echo [INFO] Criando .env a partir do .env.example...
    copy /Y .env.example .env >nul

    :: Substituir placeholder do token no .env
    python -c "
import re, pathlib
env = pathlib.Path('.env').read_text(encoding='utf-8')
env = env.replace('COLE_AQUI_O_TOKEN_GERADO', r'!GENERATED_TOKEN!')
pathlib.Path('.env').write_text(env, encoding='utf-8')
print('[OK] Token inserido no .env')
"
    echo [OK] Arquivo .env criado
) else (
    echo [AVISO] .env já existe — token NÃO foi sobrescrito
)

echo.
echo ============================================================
echo   PRÓXIMOS PASSOS:
echo ============================================================
echo.
echo  1. Abra o arquivo .env nesta pasta e preencha:
echo       RAILWAY_API_URL  ^= URL do seu app no Railway
echo       SUPABASE_URL     ^= URL do Supabase
echo       SUPABASE_SERVICE_ROLE_KEY ^= chave do Supabase
echo.
echo  2. Adicione WORKER_TOKEN no Railway:
echo       Painel Railway ^> seu serviço ^> Variables
echo       Nome: WORKER_TOKEN
echo       Valor: !GENERATED_TOKEN!
echo.
echo  3. Faça redeploy do Railway para aplicar a variável.
echo.
echo  4. Para rodar o worker, execute:
echo       .venv\Scripts\activate
echo       python worker.py
echo.
echo ============================================================
echo.
pause

# Resolving Python Setup Issues

## O Seu Problema

```
Fatal error in launcher: Unable to create process using '"C:\Users\Rodrigo Rodrigues\AppData\Local\Programs\Python\Python314\python.exe"'
```

**Causa:** Python 3.14 é muito novo (lançado em 2025) e pode ter problemas de compatibilidade com Windows.

## Solução Recomendada

### Opção 1: Use o Script de Instalação (Recomendado)

**No PowerShell:**
```powershell
cd C:\Users\Rodrigo Rodrigues\Desktop\Doncor
python install_playwright.py
```

**Ou no Command Prompt (CMD):**
```cmd
cd C:\Users\Rodrigo Rodrigues\Desktop\Doncor
install_playwright.bat
```

Esses scripts vão:
- Detectar qual Python está instalado
- Instalar Playwright corretamente
- Instalar o navegador Chromium

### Opção 2: Instalar Python 3.11 ou 3.12

Se o script não funcionar, instale uma versão estável:

1. Acesse https://www.python.org/downloads/
2. Baixe **Python 3.11** ou **Python 3.12**
3. Durante a instalação, **marque "Add Python to PATH"**
4. Depois execute:

```powershell
pip install playwright>=1.40.0
python -m playwright install chromium
```

### Opção 3: Usar Virtual Environment

Se tiver múltiplas versões de Python:

```powershell
# Criar venv
python -m venv venv

# Ativar (PowerShell)
.\venv\Scripts\Activate.ps1

# Ou no CMD:
venv\Scripts\activate.bat

# Depois instalar
pip install -r backend/requirements.txt
python -m playwright install chromium
```

## Verificar Se Deu Certo

```powershell
python --version
# Deve mostrar: Python 3.11.x ou 3.12.x

python -m playwright --version
# Deve mostrar: Version X.X.X
```

## Próxima Etapa

Depois de instalar Playwright, execute:

```powershell
cd backend

# Terminal 1: RPA Service
$env:SERVICE_TYPE='rpa'
python -m uvicorn rpa_service_example:app --port 8001

# Terminal 2: API Principal
$env:SERVICE_TYPE='main'
python -m uvicorn main:app --port 8000

# Terminal 3: Testar
curl http://localhost:8001/health
```

## Se Ainda Tiver Problemas

Verifique se há conflitos de PATH:

```powershell
where python
# Deve mostrar apenas 1 local

where python.exe
# Deve mostrar o mesmo local
```

Se houver múltiplos Pythons, remova as versões antigas do PATH em:
**Settings > Apps > Advanced app settings > App aliases**


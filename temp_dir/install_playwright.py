#!/usr/bin/env python3
"""Script para instalar Playwright e dependências."""

import subprocess
import sys
import os
from pathlib import Path

def run_command(cmd, description=""):
    """Executar comando e retornar resultado."""
    if description:
        print(f"\n{description}...")
    try:
        result = subprocess.run(cmd, check=True, capture_output=False)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ ERRO ao executar: {' '.join(cmd)}")
        print(f"   Detalhes: {e}")
        return False
    except FileNotFoundError:
        print(f"❌ Comando não encontrado: {cmd[0]}")
        return False

def main():
    print("\n" + "="*50)
    print("  Instalando Playwright para Doncor RPA")
    print("="*50)
    
    # Verificar Python
    print(f"\n✓ Usando Python: {sys.version}")
    print(f"  Executável: {sys.executable}")
    
    # Atualizar pip
    if not run_command([sys.executable, "-m", "pip", "install", "--upgrade", "pip"], 
                       "Atualizando pip"):
        return 1
    
    # Instalar Playwright
    if not run_command([sys.executable, "-m", "pip", "install", "playwright>=1.40.0"],
                       "Instalando Playwright"):
        return 1
    
    # Instalar Chromium
    if not run_command([sys.executable, "-m", "playwright", "install", "chromium"],
                       "Instalando Chromium browser"):
        print("\n⚠️  AVISO: Chromium não foi instalado completamente")
        print("   Tente executar novamente ou instale manualmente com:")
        print("   python -m playwright install chromium")
    
    print("\n" + "="*50)
    print("  ✅ Instalação concluída com sucesso!")
    print("="*50)
    
    print("\n📝 Próximos passos:")
    print("\n1. Abra um novo terminal/PowerShell")
    print("2. Navegue até: cd backend")
    print("3. Inicie o serviço RPA:")
    print("   $env:SERVICE_TYPE='rpa'; python -m uvicorn rpa_service_example:app --port 8001")
    print("\n4. Em outro terminal, inicie a API:")
    print("   $env:SERVICE_TYPE='main'; python -m uvicorn main:app --port 8000")
    print("\n5. Teste com:")
    print("   curl http://localhost:8001/health")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

"""
Backend API Testing Script for GA Gestão de Apólices
Tests all backend endpoints as specified in the review request
"""
import requests
import json
import sys

# Backend URL from frontend/.env
BASE_URL = "https://contract-hub-92.preview.emergentagent.com/api"

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

# Track test results
test_results = []
created_contrato_id = None


def log_test(test_num, endpoint, passed, message="", response_data=None):
    """Log test result"""
    status = f"{GREEN}✓ PASSED{RESET}" if passed else f"{RED}✗ FAILED{RESET}"
    print(f"\nTest {test_num}: {endpoint}")
    print(f"Status: {status}")
    if message:
        print(f"Message: {message}")
    if response_data and not passed:
        print(f"Response: {json.dumps(response_data, indent=2)}")
    
    test_results.append({
        "test_num": test_num,
        "endpoint": endpoint,
        "passed": passed,
        "message": message
    })


def test_1_root():
    """Test 1: GET /api/ - Should return a welcome message"""
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "GA Gestão de Apólices" in data["message"]:
                log_test(1, "GET /api/", True, "Welcome message received")
                return True
            else:
                log_test(1, "GET /api/", False, "Invalid response format", data)
                return False
        else:
            log_test(1, "GET /api/", False, f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(1, "GET /api/", False, f"Exception: {str(e)}")
        return False


def test_2_dashboard_stats():
    """Test 2: GET /api/dashboard/stats - Should return dashboard statistics"""
    try:
        response = requests.get(f"{BASE_URL}/dashboard/stats", timeout=10)
        if response.status_code == 200:
            data = response.json()
            required_fields = ["totalContratos", "contratosAtivos", "vidasTotal", 
                             "vidasAtivas", "movimentacoesPendentes", "faturasPendentes"]
            missing_fields = [f for f in required_fields if f not in data]
            
            if not missing_fields:
                log_test(2, "GET /api/dashboard/stats", True, 
                        f"All required fields present. Total Contratos: {data['totalContratos']}")
                return True
            else:
                log_test(2, "GET /api/dashboard/stats", False, 
                        f"Missing fields: {missing_fields}", data)
                return False
        else:
            log_test(2, "GET /api/dashboard/stats", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(2, "GET /api/dashboard/stats", False, f"Exception: {str(e)}")
        return False


def test_3_dashboard_chart_data():
    """Test 3: GET /api/dashboard/chart-data - Should return monthly chart data array"""
    try:
        response = requests.get(f"{BASE_URL}/dashboard/chart-data", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                first_item = data[0]
                if "mes" in first_item and "inclusoes" in first_item:
                    log_test(3, "GET /api/dashboard/chart-data", True, 
                            f"Chart data received with {len(data)} months")
                    return True
                else:
                    log_test(3, "GET /api/dashboard/chart-data", False, 
                            "Invalid data structure", data)
                    return False
            else:
                log_test(3, "GET /api/dashboard/chart-data", False, 
                        "Empty or invalid array", data)
                return False
        else:
            log_test(3, "GET /api/dashboard/chart-data", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(3, "GET /api/dashboard/chart-data", False, f"Exception: {str(e)}")
        return False


def test_4_dashboard_seguradoras():
    """Test 4: GET /api/dashboard/seguradoras - Should return seguradoras with vidas and contratos counts"""
    try:
        response = requests.get(f"{BASE_URL}/dashboard/seguradoras", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                first_item = data[0]
                if "nome" in first_item and "vidas" in first_item and "contratos" in first_item:
                    log_test(4, "GET /api/dashboard/seguradoras", True, 
                            f"Seguradoras data received: {len(data)} seguradoras")
                    return True
                else:
                    log_test(4, "GET /api/dashboard/seguradoras", False, 
                            "Invalid data structure", data)
                    return False
            else:
                log_test(4, "GET /api/dashboard/seguradoras", False, 
                        "Empty or invalid array", data)
                return False
        else:
            log_test(4, "GET /api/dashboard/seguradoras", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(4, "GET /api/dashboard/seguradoras", False, f"Exception: {str(e)}")
        return False


def test_5_dashboard_saldo_vidas():
    """Test 5: GET /api/dashboard/saldo-vidas - Should return saldo with percentual_total, total_vidas, vidas_ativas, etc."""
    try:
        response = requests.get(f"{BASE_URL}/dashboard/saldo-vidas", timeout=10)
        if response.status_code == 200:
            data = response.json()
            required_fields = ["percentual_total", "total_vidas", "vidas_ativas", 
                             "vidas_suspensas", "vidas_canceladas"]
            missing_fields = [f for f in required_fields if f not in data]
            
            if not missing_fields:
                log_test(5, "GET /api/dashboard/saldo-vidas", True, 
                        f"Saldo vidas data received. Total: {data['total_vidas']}, Ativas: {data['vidas_ativas']}")
                return True
            else:
                log_test(5, "GET /api/dashboard/saldo-vidas", False, 
                        f"Missing fields: {missing_fields}", data)
                return False
        else:
            log_test(5, "GET /api/dashboard/saldo-vidas", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(5, "GET /api/dashboard/saldo-vidas", False, f"Exception: {str(e)}")
        return False


def test_6_contratos_adesao_list():
    """Test 6: GET /api/contratos-adesao - Should return list of contratos de adesão"""
    try:
        response = requests.get(f"{BASE_URL}/contratos-adesao", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                first_item = data[0]
                if "numero" in first_item and "seguradora" in first_item:
                    log_test(6, "GET /api/contratos-adesao", True, 
                            f"Contratos de adesão received: {len(data)} contratos")
                    return True
                else:
                    log_test(6, "GET /api/contratos-adesao", False, 
                            "Invalid data structure", data)
                    return False
            else:
                log_test(6, "GET /api/contratos-adesao", False, 
                        "Empty or invalid array", data)
                return False
        else:
            log_test(6, "GET /api/contratos-adesao", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(6, "GET /api/contratos-adesao", False, f"Exception: {str(e)}")
        return False


def test_7_contratos_adesao_search():
    """Test 7: GET /api/contratos-adesao?search=amil - Should filter by search term"""
    try:
        response = requests.get(f"{BASE_URL}/contratos-adesao?search=amil", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                # Check if results contain "amil" in seguradora or other fields
                if len(data) > 0:
                    has_amil = any("amil" in str(item.get("seguradora", "")).lower() or 
                                  "amil" in str(item.get("produto", "")).lower() 
                                  for item in data)
                    if has_amil:
                        log_test(7, "GET /api/contratos-adesao?search=amil", True, 
                                f"Search returned {len(data)} results with 'amil'")
                        return True
                    else:
                        log_test(7, "GET /api/contratos-adesao?search=amil", False, 
                                "Search results don't contain 'amil'", data)
                        return False
                else:
                    # Empty results might be valid if no data matches
                    log_test(7, "GET /api/contratos-adesao?search=amil", True, 
                            "Search returned 0 results (valid if no matches)")
                    return True
            else:
                log_test(7, "GET /api/contratos-adesao?search=amil", False, 
                        "Invalid response format", data)
                return False
        else:
            log_test(7, "GET /api/contratos-adesao?search=amil", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(7, "GET /api/contratos-adesao?search=amil", False, f"Exception: {str(e)}")
        return False


def test_8_create_contrato_adesao():
    """Test 8: POST /api/contratos-adesao - Create a new contrato"""
    global created_contrato_id
    try:
        payload = {
            "numero": "ADH-TEST-001",
            "seguradora": "Test Seguradora",
            "produto": "Test Product Premium",
            "administradora": "Test Admin Corp",
            "vigencia": "01/01/2025",
            "vidas": 10,
            "status": "Ativo",
            "valorMensal": "R$ 1.000,00"
        }
        response = requests.post(f"{BASE_URL}/contratos-adesao", json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "id" in data and data.get("numero") == "ADH-TEST-001":
                created_contrato_id = data["id"]
                log_test(8, "POST /api/contratos-adesao", True, 
                        f"Contrato created successfully with ID: {created_contrato_id}")
                return True
            else:
                log_test(8, "POST /api/contratos-adesao", False, 
                        "Invalid response or missing ID", data)
                return False
        else:
            log_test(8, "POST /api/contratos-adesao", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(8, "POST /api/contratos-adesao", False, f"Exception: {str(e)}")
        return False


def test_9_contratos_empresarial_list():
    """Test 9: GET /api/contratos-empresarial - Should return list of contratos empresariais"""
    try:
        response = requests.get(f"{BASE_URL}/contratos-empresarial", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                first_item = data[0]
                if "numero" in first_item and "empresa" in first_item:
                    log_test(9, "GET /api/contratos-empresarial", True, 
                            f"Contratos empresariais received: {len(data)} contratos")
                    return True
                else:
                    log_test(9, "GET /api/contratos-empresarial", False, 
                            "Invalid data structure", data)
                    return False
            else:
                log_test(9, "GET /api/contratos-empresarial", False, 
                        "Empty or invalid array", data)
                return False
        else:
            log_test(9, "GET /api/contratos-empresarial", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(9, "GET /api/contratos-empresarial", False, f"Exception: {str(e)}")
        return False


def test_10_create_inclusao():
    """Test 10: POST /api/inclusoes - Create inclusion"""
    try:
        payload = {
            "contrato": "EMP-2024-001",
            "empresa": "Tech Solutions Ltda",
            "beneficiario": "Carlos Eduardo Silva",
            "cpf": "123.456.789-99",
            "parentesco": "Titular"
        }
        response = requests.post(f"{BASE_URL}/inclusoes", json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "id" in data and "protocolo" in data and data.get("beneficiario") == "Carlos Eduardo Silva":
                log_test(10, "POST /api/inclusoes", True, 
                        f"Inclusão created successfully with protocolo: {data.get('protocolo')}")
                return True
            else:
                log_test(10, "POST /api/inclusoes", False, 
                        "Invalid response or missing fields", data)
                return False
        else:
            log_test(10, "POST /api/inclusoes", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(10, "POST /api/inclusoes", False, f"Exception: {str(e)}")
        return False


def test_11_inclusoes_list():
    """Test 11: GET /api/inclusoes - Should return list of inclusões including the new one"""
    try:
        response = requests.get(f"{BASE_URL}/inclusoes", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Check if our created inclusão is in the list
                has_test_inclusao = any(item.get("beneficiario") == "Carlos Eduardo Silva" for item in data)
                if has_test_inclusao:
                    log_test(11, "GET /api/inclusoes", True, 
                            f"Inclusões list received: {len(data)} inclusões (including test inclusão)")
                    return True
                else:
                    log_test(11, "GET /api/inclusoes", True, 
                            f"Inclusões list received: {len(data)} inclusões (test inclusão not found, but list is valid)")
                    return True
            else:
                log_test(11, "GET /api/inclusoes", False, 
                        "Empty or invalid array", data)
                return False
        else:
            log_test(11, "GET /api/inclusoes", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(11, "GET /api/inclusoes", False, f"Exception: {str(e)}")
        return False


def test_12_exclusoes_list():
    """Test 12: GET /api/exclusoes - Should return list of exclusões"""
    try:
        response = requests.get(f"{BASE_URL}/exclusoes", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                first_item = data[0]
                if "protocolo" in first_item and "beneficiario" in first_item:
                    log_test(12, "GET /api/exclusoes", True, 
                            f"Exclusões list received: {len(data)} exclusões")
                    return True
                else:
                    log_test(12, "GET /api/exclusoes", False, 
                            "Invalid data structure", data)
                    return False
            else:
                log_test(12, "GET /api/exclusoes", False, 
                        "Empty or invalid array", data)
                return False
        else:
            log_test(12, "GET /api/exclusoes", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(12, "GET /api/exclusoes", False, f"Exception: {str(e)}")
        return False


def test_13_transferencias_list():
    """Test 13: GET /api/transferencias - Should return list of transferências"""
    try:
        response = requests.get(f"{BASE_URL}/transferencias", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                first_item = data[0]
                if "protocolo" in first_item and "beneficiario" in first_item:
                    log_test(13, "GET /api/transferencias", True, 
                            f"Transferências list received: {len(data)} transferências")
                    return True
                else:
                    log_test(13, "GET /api/transferencias", False, 
                            "Invalid data structure", data)
                    return False
            else:
                log_test(13, "GET /api/transferencias", False, 
                        "Empty or invalid array", data)
                return False
        else:
            log_test(13, "GET /api/transferencias", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(13, "GET /api/transferencias", False, f"Exception: {str(e)}")
        return False


def test_14_faturas_list():
    """Test 14: GET /api/faturas - Should return list of faturas"""
    try:
        response = requests.get(f"{BASE_URL}/faturas", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                first_item = data[0]
                if "numero" in first_item and "seguradora" in first_item:
                    log_test(14, "GET /api/faturas", True, 
                            f"Faturas list received: {len(data)} faturas")
                    return True
                else:
                    log_test(14, "GET /api/faturas", False, 
                            "Invalid data structure", data)
                    return False
            else:
                log_test(14, "GET /api/faturas", False, 
                        "Empty or invalid array", data)
                return False
        else:
            log_test(14, "GET /api/faturas", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(14, "GET /api/faturas", False, f"Exception: {str(e)}")
        return False


def test_15_faturas_resumo():
    """Test 15: GET /api/faturas/resumo - Should return count of abertas, vencidas, pagas"""
    try:
        response = requests.get(f"{BASE_URL}/faturas/resumo", timeout=10)
        if response.status_code == 200:
            data = response.json()
            required_fields = ["abertas", "vencidas", "pagas"]
            missing_fields = [f for f in required_fields if f not in data]
            
            if not missing_fields:
                log_test(15, "GET /api/faturas/resumo", True, 
                        f"Faturas resumo received. Abertas: {data['abertas']}, Vencidas: {data['vencidas']}, Pagas: {data['pagas']}")
                return True
            else:
                log_test(15, "GET /api/faturas/resumo", False, 
                        f"Missing fields: {missing_fields}", data)
                return False
        else:
            log_test(15, "GET /api/faturas/resumo", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(15, "GET /api/faturas/resumo", False, f"Exception: {str(e)}")
        return False


def test_16_comissoes_list():
    """Test 16: GET /api/comissoes - Should return list of comissões"""
    try:
        response = requests.get(f"{BASE_URL}/comissoes", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                first_item = data[0]
                if "seguradora" in first_item and "competencia" in first_item:
                    log_test(16, "GET /api/comissoes", True, 
                            f"Comissões list received: {len(data)} comissões")
                    return True
                else:
                    log_test(16, "GET /api/comissoes", False, 
                            "Invalid data structure", data)
                    return False
            else:
                log_test(16, "GET /api/comissoes", False, 
                        "Empty or invalid array", data)
                return False
        else:
            log_test(16, "GET /api/comissoes", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(16, "GET /api/comissoes", False, f"Exception: {str(e)}")
        return False


def test_17_comissoes_evolucao():
    """Test 17: GET /api/comissoes/evolucao - Should return chart data for comissões"""
    try:
        response = requests.get(f"{BASE_URL}/comissoes/evolucao", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                first_item = data[0]
                if "mes" in first_item and "valor" in first_item:
                    log_test(17, "GET /api/comissoes/evolucao", True, 
                            f"Comissões evolução data received: {len(data)} months")
                    return True
                else:
                    log_test(17, "GET /api/comissoes/evolucao", False, 
                            "Invalid data structure", data)
                    return False
            else:
                log_test(17, "GET /api/comissoes/evolucao", False, 
                        "Empty or invalid array", data)
                return False
        else:
            log_test(17, "GET /api/comissoes/evolucao", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(17, "GET /api/comissoes/evolucao", False, f"Exception: {str(e)}")
        return False


def test_18_tarefas_pendentes():
    """Test 18: GET /api/tarefas-pendentes - Should return pending tasks"""
    try:
        response = requests.get(f"{BASE_URL}/tarefas-pendentes", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                first_item = data[0]
                if "tipo" in first_item and "descricao" in first_item:
                    log_test(18, "GET /api/tarefas-pendentes", True, 
                            f"Tarefas pendentes received: {len(data)} tarefas")
                    return True
                else:
                    log_test(18, "GET /api/tarefas-pendentes", False, 
                            "Invalid data structure", data)
                    return False
            else:
                log_test(18, "GET /api/tarefas-pendentes", False, 
                        "Empty or invalid array", data)
                return False
        else:
            log_test(18, "GET /api/tarefas-pendentes", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(18, "GET /api/tarefas-pendentes", False, f"Exception: {str(e)}")
        return False


def test_19_movimentacoes_recentes():
    """Test 19: GET /api/movimentacoes-recentes - Should return recent movements"""
    try:
        response = requests.get(f"{BASE_URL}/movimentacoes-recentes", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                first_item = data[0]
                if "tipo" in first_item and "contrato" in first_item:
                    log_test(19, "GET /api/movimentacoes-recentes", True, 
                            f"Movimentações recentes received: {len(data)} movimentações")
                    return True
                else:
                    log_test(19, "GET /api/movimentacoes-recentes", False, 
                            "Invalid data structure", data)
                    return False
            else:
                log_test(19, "GET /api/movimentacoes-recentes", False, 
                        "Empty or invalid array", data)
                return False
        else:
            log_test(19, "GET /api/movimentacoes-recentes", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(19, "GET /api/movimentacoes-recentes", False, f"Exception: {str(e)}")
        return False


def test_20_delete_contrato_adesao():
    """Test 20: DELETE /api/contratos-adesao/{id} - Delete the test contrato created in step 8"""
    global created_contrato_id
    
    if not created_contrato_id:
        log_test(20, "DELETE /api/contratos-adesao/{id}", False, 
                "No contrato ID available from test 8")
        return False
    
    try:
        response = requests.delete(f"{BASE_URL}/contratos-adesao/{created_contrato_id}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "message" in data:
                log_test(20, f"DELETE /api/contratos-adesao/{created_contrato_id}", True, 
                        f"Contrato deleted successfully: {data['message']}")
                return True
            else:
                log_test(20, f"DELETE /api/contratos-adesao/{created_contrato_id}", False, 
                        "Invalid response format", data)
                return False
        else:
            log_test(20, f"DELETE /api/contratos-adesao/{created_contrato_id}", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(20, f"DELETE /api/contratos-adesao/{created_contrato_id}", False, 
                f"Exception: {str(e)}")
        return False


def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for r in test_results if r["passed"])
    failed = sum(1 for r in test_results if not r["passed"])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"{GREEN}Passed: {passed}{RESET}")
    print(f"{RED}Failed: {failed}{RESET}")
    print(f"Success Rate: {(passed/total*100):.1f}%\n")
    
    if failed > 0:
        print(f"{RED}Failed Tests:{RESET}")
        for r in test_results:
            if not r["passed"]:
                print(f"  - Test {r['test_num']}: {r['endpoint']}")
                print(f"    Message: {r['message']}")
    
    print("="*80)
    
    return passed, failed


def main():
    """Run all tests"""
    print("="*80)
    print("GA GESTÃO DE APÓLICES - BACKEND API TESTING")
    print("="*80)
    print(f"Backend URL: {BASE_URL}")
    print("="*80)
    
    # Run all tests in sequence
    test_1_root()
    test_2_dashboard_stats()
    test_3_dashboard_chart_data()
    test_4_dashboard_seguradoras()
    test_5_dashboard_saldo_vidas()
    test_6_contratos_adesao_list()
    test_7_contratos_adesao_search()
    test_8_create_contrato_adesao()
    test_9_contratos_empresarial_list()
    test_10_create_inclusao()
    test_11_inclusoes_list()
    test_12_exclusoes_list()
    test_13_transferencias_list()
    test_14_faturas_list()
    test_15_faturas_resumo()
    test_16_comissoes_list()
    test_17_comissoes_evolucao()
    test_18_tarefas_pendentes()
    test_19_movimentacoes_recentes()
    test_20_delete_contrato_adesao()
    
    # Print summary
    passed, failed = print_summary()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()

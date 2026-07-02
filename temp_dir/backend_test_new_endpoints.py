"""
Backend API Testing Script for NEW Endpoints - GA Gestão de Apólices
Tests the newly added endpoints: seguradoras, produtos, colaboradores, relatorios, and inline edit
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

# Track test results and created IDs
test_results = []
created_seguradora_id = None
created_produto_id = None
created_colaborador_id = None


def log_test(test_num, endpoint, passed, message="", response_data=None):
    """Log test result"""
    status = f"{GREEN}✓ PASSED{RESET}" if passed else f"{RED}✗ FAILED{RESET}"
    print(f"\nTest {test_num}: {endpoint}")
    print(f"Status: {status}")
    if message:
        print(f"Message: {message}")
    if response_data and not passed:
        print(f"Response: {json.dumps(response_data, indent=2)[:500]}")
    
    test_results.append({
        "test_num": test_num,
        "endpoint": endpoint,
        "passed": passed,
        "message": message
    })


def test_1_list_seguradoras():
    """Test 1: GET /api/seguradoras - Should return list of 6 seguradoras"""
    try:
        response = requests.get(f"{BASE_URL}/seguradoras", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                required_fields = ["id", "nome", "codigo", "cnpj", "telefone", "email", "contratos", "vidas", "status"]
                if len(data) > 0:
                    first_item = data[0]
                    missing_fields = [f for f in required_fields if f not in first_item]
                    
                    if not missing_fields:
                        log_test(1, "GET /api/seguradoras", True, 
                                f"Seguradoras list received: {len(data)} seguradoras with all required fields")
                        return True
                    else:
                        log_test(1, "GET /api/seguradoras", False, 
                                f"Missing fields: {missing_fields}", first_item)
                        return False
                else:
                    log_test(1, "GET /api/seguradoras", False, 
                            "Empty seguradoras list", data)
                    return False
            else:
                log_test(1, "GET /api/seguradoras", False, 
                        "Invalid response format (not a list)", data)
                return False
        else:
            log_test(1, "GET /api/seguradoras", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(1, "GET /api/seguradoras", False, f"Exception: {str(e)}")
        return False


def test_2_create_seguradora():
    """Test 2: POST /api/seguradoras - Create new seguradora"""
    global created_seguradora_id
    try:
        payload = {
            "nome": "Test Seguradora",
            "codigo": "SEG-TEST",
            "cnpj": "00.000.000/0001-00",
            "telefone": "(11) 0000-0000",
            "email": "test@test.com",
            "endereco": "Test Address",
            "status": "Ativo"
        }
        response = requests.post(f"{BASE_URL}/seguradoras", json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "id" in data and data.get("nome") == "Test Seguradora":
                created_seguradora_id = data["id"]
                log_test(2, "POST /api/seguradoras", True, 
                        f"Seguradora created successfully with ID: {created_seguradora_id}")
                return True
            else:
                log_test(2, "POST /api/seguradoras", False, 
                        "Invalid response or missing ID", data)
                return False
        else:
            log_test(2, "POST /api/seguradoras", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(2, "POST /api/seguradoras", False, f"Exception: {str(e)}")
        return False


def test_3_update_seguradora():
    """Test 3: PUT /api/seguradoras/{id} - Update the created seguradora"""
    global created_seguradora_id
    
    if not created_seguradora_id:
        log_test(3, "PUT /api/seguradoras/{id}", False, 
                "No seguradora ID available from test 2")
        return False
    
    try:
        payload = {
            "nome": "Updated Seguradora",
            "codigo": "SEG-TEST",
            "cnpj": "00.000.000/0001-00",
            "telefone": "(11) 1111-1111",
            "email": "updated@test.com",
            "endereco": "Updated Address",
            "status": "Ativo"
        }
        response = requests.put(f"{BASE_URL}/seguradoras/{created_seguradora_id}", json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("nome") == "Updated Seguradora" and data.get("telefone") == "(11) 1111-1111":
                log_test(3, f"PUT /api/seguradoras/{created_seguradora_id}", True, 
                        "Seguradora updated successfully")
                return True
            else:
                log_test(3, f"PUT /api/seguradoras/{created_seguradora_id}", False, 
                        "Update did not reflect correctly", data)
                return False
        else:
            log_test(3, f"PUT /api/seguradoras/{created_seguradora_id}", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(3, f"PUT /api/seguradoras/{created_seguradora_id}", False, 
                f"Exception: {str(e)}")
        return False


def test_4_delete_seguradora():
    """Test 4: DELETE /api/seguradoras/{id} - Delete the test seguradora"""
    global created_seguradora_id
    
    if not created_seguradora_id:
        log_test(4, "DELETE /api/seguradoras/{id}", False, 
                "No seguradora ID available from test 2")
        return False
    
    try:
        response = requests.delete(f"{BASE_URL}/seguradoras/{created_seguradora_id}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "message" in data:
                log_test(4, f"DELETE /api/seguradoras/{created_seguradora_id}", True, 
                        f"Seguradora deleted successfully: {data['message']}")
                return True
            else:
                log_test(4, f"DELETE /api/seguradoras/{created_seguradora_id}", False, 
                        "Invalid response format", data)
                return False
        else:
            log_test(4, f"DELETE /api/seguradoras/{created_seguradora_id}", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(4, f"DELETE /api/seguradoras/{created_seguradora_id}", False, 
                f"Exception: {str(e)}")
        return False


def test_5_list_produtos():
    """Test 5: GET /api/produtos - Should return list of 16 products"""
    try:
        response = requests.get(f"{BASE_URL}/produtos", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                required_fields = ["id", "nome", "seguradora", "tipo", "cobertura", "acomodacao", "reajuste", "status"]
                if len(data) > 0:
                    first_item = data[0]
                    missing_fields = [f for f in required_fields if f not in first_item]
                    
                    if not missing_fields:
                        log_test(5, "GET /api/produtos", True, 
                                f"Produtos list received: {len(data)} produtos with all required fields")
                        return True
                    else:
                        log_test(5, "GET /api/produtos", False, 
                                f"Missing fields: {missing_fields}", first_item)
                        return False
                else:
                    log_test(5, "GET /api/produtos", False, 
                            "Empty produtos list", data)
                    return False
            else:
                log_test(5, "GET /api/produtos", False, 
                        "Invalid response format (not a list)", data)
                return False
        else:
            log_test(5, "GET /api/produtos", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(5, "GET /api/produtos", False, f"Exception: {str(e)}")
        return False


def test_6_create_produto():
    """Test 6: POST /api/produtos - Create new product"""
    global created_produto_id
    try:
        payload = {
            "nome": "Test Product",
            "seguradora": "Amil",
            "tipo": "Saúde",
            "cobertura": "Nacional",
            "acomodacao": "Enfermaria",
            "reajuste": "ANS",
            "status": "Ativo"
        }
        response = requests.post(f"{BASE_URL}/produtos", json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "id" in data and data.get("nome") == "Test Product":
                created_produto_id = data["id"]
                log_test(6, "POST /api/produtos", True, 
                        f"Produto created successfully with ID: {created_produto_id}")
                return True
            else:
                log_test(6, "POST /api/produtos", False, 
                        "Invalid response or missing ID", data)
                return False
        else:
            log_test(6, "POST /api/produtos", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(6, "POST /api/produtos", False, f"Exception: {str(e)}")
        return False


def test_7_update_produto():
    """Test 7: PUT /api/produtos/{id} - Update the created product"""
    global created_produto_id
    
    if not created_produto_id:
        log_test(7, "PUT /api/produtos/{id}", False, 
                "No produto ID available from test 6")
        return False
    
    try:
        payload = {
            "nome": "Updated Test Product",
            "seguradora": "Amil",
            "tipo": "Saúde",
            "cobertura": "Nacional",
            "acomodacao": "Apartamento",
            "reajuste": "ANS",
            "status": "Ativo"
        }
        response = requests.put(f"{BASE_URL}/produtos/{created_produto_id}", json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("nome") == "Updated Test Product" and data.get("acomodacao") == "Apartamento":
                log_test(7, f"PUT /api/produtos/{created_produto_id}", True, 
                        "Produto updated successfully")
                return True
            else:
                log_test(7, f"PUT /api/produtos/{created_produto_id}", False, 
                        "Update did not reflect correctly", data)
                return False
        else:
            log_test(7, f"PUT /api/produtos/{created_produto_id}", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(7, f"PUT /api/produtos/{created_produto_id}", False, 
                f"Exception: {str(e)}")
        return False


def test_8_delete_produto():
    """Test 8: DELETE /api/produtos/{id} - Delete the test product"""
    global created_produto_id
    
    if not created_produto_id:
        log_test(8, "DELETE /api/produtos/{id}", False, 
                "No produto ID available from test 6")
        return False
    
    try:
        response = requests.delete(f"{BASE_URL}/produtos/{created_produto_id}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "message" in data:
                log_test(8, f"DELETE /api/produtos/{created_produto_id}", True, 
                        f"Produto deleted successfully: {data['message']}")
                return True
            else:
                log_test(8, f"DELETE /api/produtos/{created_produto_id}", False, 
                        "Invalid response format", data)
                return False
        else:
            log_test(8, f"DELETE /api/produtos/{created_produto_id}", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(8, f"DELETE /api/produtos/{created_produto_id}", False, 
                f"Exception: {str(e)}")
        return False


def test_9_list_colaboradores():
    """Test 9: GET /api/colaboradores - Should return list of 10 colaboradores"""
    try:
        response = requests.get(f"{BASE_URL}/colaboradores", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                required_fields = ["id", "nome", "cargo", "email", "telefone", "departamento", "dataAdmissao", "status"]
                if len(data) > 0:
                    first_item = data[0]
                    missing_fields = [f for f in required_fields if f not in first_item]
                    
                    if not missing_fields:
                        log_test(9, "GET /api/colaboradores", True, 
                                f"Colaboradores list received: {len(data)} colaboradores with all required fields")
                        return True
                    else:
                        log_test(9, "GET /api/colaboradores", False, 
                                f"Missing fields: {missing_fields}", first_item)
                        return False
                else:
                    log_test(9, "GET /api/colaboradores", False, 
                            "Empty colaboradores list", data)
                    return False
            else:
                log_test(9, "GET /api/colaboradores", False, 
                        "Invalid response format (not a list)", data)
                return False
        else:
            log_test(9, "GET /api/colaboradores", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(9, "GET /api/colaboradores", False, f"Exception: {str(e)}")
        return False


def test_10_create_colaborador():
    """Test 10: POST /api/colaboradores - Create new colaborador"""
    global created_colaborador_id
    try:
        payload = {
            "nome": "Test Colaborador",
            "cargo": "Tester",
            "email": "test@corretora.com.br",
            "telefone": "(11) 9999-9999",
            "departamento": "Operações",
            "status": "Ativo"
        }
        response = requests.post(f"{BASE_URL}/colaboradores", json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "id" in data and data.get("nome") == "Test Colaborador":
                created_colaborador_id = data["id"]
                log_test(10, "POST /api/colaboradores", True, 
                        f"Colaborador created successfully with ID: {created_colaborador_id}")
                return True
            else:
                log_test(10, "POST /api/colaboradores", False, 
                        "Invalid response or missing ID", data)
                return False
        else:
            log_test(10, "POST /api/colaboradores", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(10, "POST /api/colaboradores", False, f"Exception: {str(e)}")
        return False


def test_11_delete_colaborador():
    """Test 11: DELETE /api/colaboradores/{id} - Delete the test colaborador"""
    global created_colaborador_id
    
    if not created_colaborador_id:
        log_test(11, "DELETE /api/colaboradores/{id}", False, 
                "No colaborador ID available from test 10")
        return False
    
    try:
        response = requests.delete(f"{BASE_URL}/colaboradores/{created_colaborador_id}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "message" in data:
                log_test(11, f"DELETE /api/colaboradores/{created_colaborador_id}", True, 
                        f"Colaborador deleted successfully: {data['message']}")
                return True
            else:
                log_test(11, f"DELETE /api/colaboradores/{created_colaborador_id}", False, 
                        "Invalid response format", data)
                return False
        else:
            log_test(11, f"DELETE /api/colaboradores/{created_colaborador_id}", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(11, f"DELETE /api/colaboradores/{created_colaborador_id}", False, 
                f"Exception: {str(e)}")
        return False


def test_12_relatorios_resumo_geral():
    """Test 12: GET /api/relatorios/resumo-geral - Should return general report"""
    try:
        response = requests.get(f"{BASE_URL}/relatorios/resumo-geral", timeout=10)
        if response.status_code == 200:
            data = response.json()
            required_fields = ["totalContratosAdesao", "totalContratosEmpresarial", 
                             "totalInclusoes", "totalExclusoes", "totalTransferencias", 
                             "porSeguradora", "statusAdesao", "statusEmpresarial"]
            missing_fields = [f for f in required_fields if f not in data]
            
            if not missing_fields:
                log_test(12, "GET /api/relatorios/resumo-geral", True, 
                        f"Resumo geral received with all required fields. Total Adesão: {data['totalContratosAdesao']}, Total Empresarial: {data['totalContratosEmpresarial']}")
                return True
            else:
                log_test(12, "GET /api/relatorios/resumo-geral", False, 
                        f"Missing fields: {missing_fields}", data)
                return False
        else:
            log_test(12, "GET /api/relatorios/resumo-geral", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(12, "GET /api/relatorios/resumo-geral", False, f"Exception: {str(e)}")
        return False


def test_13_inline_edit_contrato_adesao():
    """Test 13: PUT /api/contratos-adesao/adh-1 - Test inline edit"""
    try:
        payload = {
            "numero": "ADH-2024-001",
            "seguradora": "Amil",
            "produto": "Amil 400 QC UPDATED",
            "administradora": "Qualicorp",
            "vigencia": "01/01/2024",
            "vidas": 160,
            "status": "Ativo",
            "valorMensal": "R$ 46.000,00"
        }
        response = requests.put(f"{BASE_URL}/contratos-adesao/adh-1", json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("produto") == "Amil 400 QC UPDATED":
                log_test(13, "PUT /api/contratos-adesao/adh-1", True, 
                        "Inline edit successful - produto updated to 'Amil 400 QC UPDATED'")
                return True
            else:
                log_test(13, "PUT /api/contratos-adesao/adh-1", False, 
                        "Update did not reflect correctly", data)
                return False
        else:
            log_test(13, "PUT /api/contratos-adesao/adh-1", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(13, "PUT /api/contratos-adesao/adh-1", False, f"Exception: {str(e)}")
        return False


def test_14_verify_inline_edit():
    """Test 14: GET /api/contratos-adesao/adh-1 - Verify the inline edit was persisted"""
    try:
        response = requests.get(f"{BASE_URL}/contratos-adesao/adh-1", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("produto") == "Amil 400 QC UPDATED":
                log_test(14, "GET /api/contratos-adesao/adh-1", True, 
                        "Inline edit verified - produto is 'Amil 400 QC UPDATED'")
                return True
            else:
                log_test(14, "GET /api/contratos-adesao/adh-1", False, 
                        f"Expected produto 'Amil 400 QC UPDATED', got '{data.get('produto')}'", data)
                return False
        else:
            log_test(14, "GET /api/contratos-adesao/adh-1", False, 
                    f"Status code: {response.status_code}", response.text)
            return False
    except Exception as e:
        log_test(14, "GET /api/contratos-adesao/adh-1", False, f"Exception: {str(e)}")
        return False


def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY - NEW ENDPOINTS")
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
    print("GA GESTÃO DE APÓLICES - NEW ENDPOINTS TESTING")
    print("="*80)
    print(f"Backend URL: {BASE_URL}")
    print("="*80)
    
    # Run all tests in sequence
    test_1_list_seguradoras()
    test_2_create_seguradora()
    test_3_update_seguradora()
    test_4_delete_seguradora()
    test_5_list_produtos()
    test_6_create_produto()
    test_7_update_produto()
    test_8_delete_produto()
    test_9_list_colaboradores()
    test_10_create_colaborador()
    test_11_delete_colaborador()
    test_12_relatorios_resumo_geral()
    test_13_inline_edit_contrato_adesao()
    test_14_verify_inline_edit()
    
    # Print summary
    passed, failed = print_summary()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()

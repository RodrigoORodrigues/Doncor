import unittest
import sys
from pathlib import Path

# Add backend directory to sys.path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

class TestMarinaBeneficiaries(unittest.TestCase):
    def test_marina_barra_clube_contract_exists(self):
        """Test that the corporate contract for MARINA BARRA CLUBE is correctly seeded."""
        from seed_data import CONTRATOS_EMPRESARIAL
        
        marina_contract = next((c for c in CONTRATOS_EMPRESARIAL if c.get("cnpj") == "27.644.400/0001-96"), None)
        self.assertIsNotNone(marina_contract, "MARINA BARRA CLUBE contract must be seeded.")
        self.assertEqual(marina_contract["empresa"], "MARINA BARRA CLUBE")
        self.assertEqual(marina_contract["status"], "Ativo")

    def test_marina_barra_clube_beneficiaries_exist_and_completed(self):
        """Test that beneficiaries for MARINA BARRA CLUBE are parsed, registered, and marked as Completed."""
        from seed_data import INCLUSOES
        
        marina_beneficiaries = [b for b in INCLUSOES if b.get("empresa") == "MARINA BARRA CLUBE"]
        
        # Verify a substantial number of beneficiaries were registered
        self.assertGreater(len(marina_beneficiaries), 200, "Should seed all beneficiaries from all pages of the document.")
        
        # All of them must be completed
        for b in marina_beneficiaries:
            self.assertEqual(b["status"], "Concluído", f"Beneficiary {b['beneficiario']} status must be Concluído.")
            self.assertIsNotNone(b["cpf"], f"Beneficiary {b['beneficiario']} must have a CPF.")
            self.assertIsNotNone(b["dataNascimento"], f"Beneficiary {b['beneficiario']} must have a birthdate.")

        # Test specific beneficiaries from different pages to ensure parsing is highly accurate
        cristina = next((b for b in marina_beneficiaries if b["beneficiario"] == "CRISTINA DIAS DOS SANTOS"), None)
        self.assertIsNotNone(cristina)
        self.assertEqual(cristina["cpf"], "82192359500")
        self.assertEqual(cristina["nomeMae"], "CELIA CARVALHO DIAS")
        self.assertEqual(cristina["parentesco"], "Titular")
        self.assertEqual(cristina["estadoCivil"], "Solteiro")

        emerson = next((b for b in marina_beneficiaries if b["beneficiario"] == "EMERSON MARIANO DA SILVA"), None)
        self.assertIsNotNone(emerson)
        self.assertEqual(emerson["cpf"], "13318973785")
        self.assertEqual(emerson["nomeMae"], "ELIZABETH DE SOUSA")
        self.assertEqual(emerson["parentesco"], "Titular")
        
        nilson = next((b for b in marina_beneficiaries if b["beneficiario"] == "NILSON SILVA DE ANDRADE"), None)
        self.assertIsNotNone(nilson)
        self.assertEqual(nilson["cpf"], "7848648702")
        self.assertEqual(nilson["nomeMae"], "MARIA GOMES DA SILVA")

if __name__ == "__main__":
    unittest.main()

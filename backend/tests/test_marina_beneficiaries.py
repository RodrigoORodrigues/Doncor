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

    def test_marina_barra_clube_portal_partner_exists(self):
        """Test that the Portal Client partner exists for MARINA BARRA CLUBE CNPJ."""
        from seed_data import PORTAL_PARCEIROS
        
        partner = next((p for p in PORTAL_PARCEIROS if p.get("documento") == "27644400000196"), None)
        self.assertIsNotNone(partner, "Portal partner for Marina Barra Clube must exist.")
        self.assertEqual(partner["empresa"], "MARINA BARRA CLUBE")
        self.assertEqual(partner["status"], "Ativo")
        self.assertIn("EMP-MBC01", partner["contratos"])

    def test_marina_barra_clube_portal_solicitations_exist_and_completed(self):
        """Test that solicitations for each beneficiary exist in portal_solicitacoes and are marked Completed."""
        from seed_data import PORTAL_SOLICITACOES
        
        marina_solicitations = [s for s in PORTAL_SOLICITACOES if s.get("empresa") == "MARINA BARRA CLUBE"]
        
        # We expect a corresponding solicitation for every beneficiary
        self.assertGreater(len(marina_solicitations), 200, "Should have a completed portal solicitation for each beneficiary.")
        
        for s in marina_solicitations:
            self.assertEqual(s["status"], "Concluído", f"Solicitation for {s['beneficiario']} status must be Concluído.")
            self.assertEqual(s["tipo"], "inclusao", "Should be an 'inclusao' type solicitation.")
            self.assertEqual(s["contrato"], "EMP-MBC01")

if __name__ == "__main__":
    unittest.main()

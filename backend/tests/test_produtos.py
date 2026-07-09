import unittest
import sys
from pathlib import Path

# Add backend directory to sys.path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

class TestProdutos(unittest.TestCase):
    def test_produtos_raw_not_empty(self):
        """Test that the RAW list of products is populated and matches requirements."""
        from seed_data import PRODUTOS_RAW
        
        self.assertIsNotNone(PRODUTOS_RAW)
        self.assertEqual(len(PRODUTOS_RAW), 20, "Should have exactly 20 products registered.")

    def test_produtos_complete_fields_and_integrity(self):
        """Test that mapped products have all required fields and correct values."""
        from seed_data import PRODUTOS
        
        for prod in PRODUTOS:
            self.assertIsNotNone(prod.get("id"), "Product must have a unique ID.")
            self.assertEqual(prod.get("seguradora"), "Amil", "Seguradora must be 'Amil'.")
            self.assertEqual(prod.get("tipo"), "Saúde", "Tipo must be 'Saúde'.")
            self.assertIn(prod.get("cobertura"), ["Regional", "Nacional"], "Cobertura must be Regional or Nacional.")
            self.assertEqual(prod.get("status"), "Ativo", "Default status should be Ativo.")

    def test_specific_products_seeded(self):
        """Test specific products and their attributes."""
        from seed_data import PRODUTOS
        
        # Test S60 is Regional
        s60 = next((p for p in PRODUTOS if p["nome"] == "S60"), None)
        self.assertIsNotNone(s60, "S60 product should exist.")
        self.assertEqual(s60["cobertura"], "Regional")
        
        # Test BLACK I is Nacional
        black_i = next((p for p in PRODUTOS if p["nome"] == "BLACK I"), None)
        self.assertIsNotNone(black_i, "BLACK I product should exist.")
        self.assertEqual(black_i["cobertura"], "Nacional")

    def test_product_count_and_list_is_exact(self):
        """GREEN PHASE: Confirm that the product list is exactly 20 and all are fully active."""
        from seed_data import PRODUTOS
        
        self.assertEqual(len(PRODUTOS), 20, "Should contain exactly 20 Amil products.")
        for p in PRODUTOS:
            self.assertEqual(p["status"], "Ativo", f"Product {p['nome']} must be active.")

if __name__ == "__main__":
    unittest.main()

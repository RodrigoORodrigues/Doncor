import unittest
import sys
from pathlib import Path

# Add backend directory to sys.path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

class TestDatabaseSchema(unittest.TestCase):
    def test_schema_has_composite_index_and_foreign_key(self):
        """Test that the composite index and foreign key constraint are defined in deployment script."""
        deploy_sql_path = ROOT / "deploy_supabase_completo.sql"
        self.assertTrue(deploy_sql_path.exists(), "deploy_supabase_completo.sql must exist.")
        
        sql_content = deploy_sql_path.read_text(encoding="utf-8")
        
        # 1. Check generated columns
        self.assertIn("cpf text GENERATED ALWAYS AS (payload->>'cpf') STORED", sql_content,
                      "Should define stored generated column for cpf in public.inclusoes.")
        self.assertIn("contrato text GENERATED ALWAYS AS (payload->>'contrato') STORED", sql_content,
                      "Should define stored generated column for contrato in public.inclusoes.")
        
        # 2. Check foreign key constraint pointing to contratos_empresarial(id)
        self.assertIn("CONSTRAINT fk_inclusoes_contratos_empresarial FOREIGN KEY (contrato) REFERENCES public.contratos_empresarial(id) ON DELETE CASCADE", sql_content,
                      "Should define foreign key constraint to contratos_empresarial(id) with ON DELETE CASCADE.")
        
        # 3. Check composite index on (cpf, contrato)
        self.assertIn("CREATE INDEX if not exists inclusoes_cpf_contrato_idx on public.inclusoes (cpf, contrato)", sql_content,
                      "Should define composite index on inclusoes (cpf, contrato).")

if __name__ == "__main__":
    unittest.main()

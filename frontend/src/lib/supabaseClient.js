// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Tenta obter as chaves das variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

// Verifica se as chaves estão configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL ou Anon Key não encontradas nas variáveis de ambiente. ' +
    'Verifique o seu arquivo .env.local ou as configurações de ambiente.'
  );
}

// Inicializa o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Exemplo de uso:
 * import { supabase } from '../lib/supabaseClient';
 * 
 * const { data, error } = await supabase.from('perfis').select('*');
 */

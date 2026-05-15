# Documentação Completa do Sistema de Gestão de Apólices Doncor

Este documento detalha a arquitetura e o código necessário para completar o sistema de gestão de apólices **Doncor**, integrando-o ao Supabase (PostgreSQL) e implementando funcionalidades críticas como migração e integração de banco de dados, controle de acesso (RBAC) e um robô RPA headless.

## Contexto do Projeto

O objetivo é desenvolver um Sistema de Gestão de Apólices moderno (React/Tailwind) que se integre ao banco de dados Supabase para alta eficiência, segurança e escalabilidade. As funcionalidades críticas incluem a gestão de Usuários, Apólices e Boletos, com Row Level Security (RLS), um sistema de cadastro de usuários com níveis de permissão (RBAC) e um Painel Administrativo, além de um robô RPA headless para automação de extração de boletos.

## Plano de Ação Executado

O projeto foi dividido em três passos principais para garantir uma abordagem estruturada e detalhada:

1.  **Definição do Banco de Dados**: Estruturação do Supabase para gerenciar Usuários, Apólices e Boletos, incluindo regras de Row Level Security (RLS).
2.  **Lógica de Autenticação e RBAC**: Criação de um sistema de cadastro de usuários com níveis de permissão, Painel Administrativo e configuração da autenticação via Supabase Auth.
3.  **Arquitetura do Robô RPA "Headless"**: Desenvolvimento de um script de automação isolado em Python com Playwright para extração e gerenciamento de boletos.

--- 

## Passo 1: Definição do Banco de Dados (Supabase)

Para garantir a eficiência, segurança e escalabilidade do sistema de gestão de apólices, estruturamos o banco de dados no Supabase (PostgreSQL) com as seguintes tabelas e políticas de Row Level Security (RLS).

### Esquema SQL

O esquema SQL abaixo define as tabelas `perfis`, `apolices` e `boletos`, juntamente com as funções e políticas de RLS necessárias para controlar o acesso aos dados.

```sql
-- Habilitar a extensão uuid-ossp para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função para obter o papel do usuário logado (necessário para RLS)
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (SELECT role FROM public.perfis WHERE id = auth.uid());
END;
$$;

-- Tabela de Perfis de Usuários (extensão de auth.users)
CREATE TABLE public.perfis (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'cliente' CHECK (role IN ('admin', 'agente', 'cliente')),
    codigo_login_unico TEXT UNIQUE -- Usado para match com o RPA
);

-- Habilitar Row Level Security (RLS) para a tabela perfis
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Política para administradores: podem ver e editar todos os perfis
CREATE POLICY "Admins can view and update all profiles" ON public.perfis
FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

-- Política para agentes: podem ver perfis de clientes
CREATE POLICY "Agents can view client profiles" ON public.perfis
FOR SELECT USING (get_user_role() = 'agente' AND role = 'cliente');

-- Política para clientes: podem ver e editar apenas seu próprio perfil
CREATE POLICY "Users can view and update their own profile" ON public.perfis
FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Tabela de Apólices
CREATE TABLE public.apolices (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero TEXT UNIQUE NOT NULL,
    seguradora TEXT NOT NULL,
    produto TEXT NOT NULL,
    administradora TEXT, -- Opcional para apólices empresariais
    empresa TEXT,        -- Opcional para apólices de adesão
    cnpj TEXT,           -- Opcional para apólices de adesão
    vigencia DATE NOT NULL,
    vencimento DATE,     -- Opcional para apólices de adesão
    vidas INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Ativo',
    valor_mensal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tipo_contrato TEXT NOT NULL CHECK (tipo_contrato IN ('adesao', 'empresarial')),
    user_id uuid REFERENCES public.perfis(id) ON DELETE CASCADE -- Link para o perfil do cliente/agente
);

-- Habilitar RLS para a tabela apolices
ALTER TABLE public.apolices ENABLE ROW LEVEL SECURITY;

-- Política para administradores: podem ver e editar todas as apólices
CREATE POLICY "Admins can manage all policies" ON public.apolices
FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

-- Política para agentes: podem ver apólices de clientes que gerenciam (assumindo que o agente tem uma relação com o cliente)
-- Para simplificar, vamos permitir que agentes vejam todas as apólices por enquanto, mas isso pode ser refinado.
CREATE POLICY "Agents can view all policies" ON public.apolices
FOR SELECT USING (get_user_role() = 'agente');

-- Política para clientes: podem ver e editar apenas suas próprias apólices
CREATE POLICY "Users can view and update their own policies" ON public.apolices
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tabela de Boletos
CREATE TABLE public.boletos (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero TEXT NOT NULL,
    apolice_id uuid REFERENCES public.apolices(id) ON DELETE CASCADE,
    seguradora TEXT NOT NULL,
    competencia DATE NOT NULL,
    vencimento DATE NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    valor_pago NUMERIC(10, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Aberta',
    url_boleto TEXT, -- URL para o boleto baixado (armazenado no Supabase Storage)
    user_id uuid REFERENCES public.perfis(id) ON DELETE CASCADE -- Link para o perfil do cliente
);

-- Habilitar RLS para a tabela boletos
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;

-- Política para administradores: podem ver e editar todos os boletos
CREATE POLICY "Admins can manage all boletos" ON public.boletos
FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

-- Política para agentes: podem ver boletos de clientes que gerenciam
CREATE POLICY "Agents can view client boletos" ON public.boletos
FOR SELECT USING (get_user_role() = 'agente');

-- Política para clientes: podem ver e editar apenas seus próprios boletos
CREATE POLICY "Users can view and update their own boletos" ON public.boletos
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Inserir o superusuário 'Donfim' na tabela de perfis (exemplo, deve ser feito via autenticação)
-- Nota: O ID do usuário 'Donfim' será gerado pelo Supabase Auth. Este INSERT é apenas um placeholder.
-- Você precisará criar o usuário 'Donfim' via Supabase Auth e então atualizar seu perfil com a role 'admin'.
-- INSERT INTO public.perfis (id, username, email, role) VALUES ('<UUID_DO_DONFIM>', 'Donfim', 'donfim@example.com', 'admin');
```

### Detalhamento das Tabelas e RLS

#### Tabela `perfis`

Esta tabela estende a funcionalidade de autenticação do Supabase (`auth.users`), armazenando informações adicionais sobre os usuários do sistema.

| Coluna             | Tipo      | Descrição                                                                                             | Restrições                                                                  |
| :----------------- | :-------- | :---------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| `id`               | `uuid`    | Chave primária, referenciando o `id` do usuário em `auth.users`.                                      | `REFERENCES auth.users(id) ON DELETE CASCADE`, `PRIMARY KEY`                |
| `username`         | `TEXT`    | Nome de usuário único para identificação.                                                             | `UNIQUE`, `NOT NULL`                                                        |
| `email`            | `TEXT`    | Endereço de e-mail do usuário.                                                                        | `UNIQUE`, `NOT NULL`                                                        |
| `role`             | `TEXT`    | Nível de permissão do usuário.                                                                        | `NOT NULL`, `DEFAULT 'cliente'`, `CHECK (role IN ('admin', 'agente', 'cliente'))` |
| `codigo_login_unico` | `TEXT`    | Código único para o robô RPA fazer o match com o segurado.                                            | `UNIQUE`                                                                    |

**Políticas RLS para `perfis`:**

-   **Admins**: Podem visualizar e atualizar todos os perfis. A função `get_user_role()` é utilizada para verificar se o usuário logado possui a role 'admin'.
-   **Agentes**: Podem visualizar apenas perfis de clientes. Esta política pode ser refinada para que agentes vejam apenas clientes sob sua gestão.
-   **Clientes**: Podem visualizar e atualizar apenas seu próprio perfil, garantindo a privacidade e segurança dos dados individuais.

#### Tabela `apolices`

Armazena os detalhes das apólices de seguro, com um link para o perfil do usuário responsável por ela.

| Coluna         | Tipo        | Descrição                                                                 | Restrições                                                                  |
| :------------- | :---------- | :------------------------------------------------------------------------ | :-------------------------------------------------------------------------- |
| `id`           | `uuid`      | Chave primária da apólice.                                                | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()`                                 |
| `numero`       | `TEXT`      | Número único da apólice.                                                  | `UNIQUE`, `NOT NULL`                                                        |
| `seguradora`   | `TEXT`      | Nome da seguradora.                                                       | `NOT NULL`                                                                  |
| `produto`      | `TEXT`      | Nome do produto da apólice.                                               | `NOT NULL`                                                                  |
| `administradora` | `TEXT`      | Nome da administradora (opcional para apólices empresariais).             |                                                                             |
| `empresa`      | `TEXT`      | Nome da empresa (opcional para apólices de adesão).                       |                                                                             |
| `cnpj`         | `TEXT`      | CNPJ da empresa (opcional para apólices de adesão).                       |                                                                             |
| `vigencia`     | `DATE`      | Data de início da vigência da apólice.                                    | `NOT NULL`                                                                  |
| `vencimento`   | `DATE`      | Data de vencimento da apólice (opcional para apólices de adesão).         |                                                                             |
| `vidas`        | `INTEGER`   | Número de vidas cobertas pela apólice.                                    | `NOT NULL`, `DEFAULT 0`                                                     |
| `status`       | `TEXT`      | Status atual da apólice (Ativo, Inativo, Cancelado, etc.).                | `NOT NULL`, `DEFAULT 'Ativo'`                                               |
| `valor_mensal` | `NUMERIC(10, 2)` | Valor mensal da apólice.                                                  | `NOT NULL`, `DEFAULT 0.00`                                                  |
| `tipo_contrato` | `TEXT`      | Tipo de contrato: 'adesao' ou 'empresarial'.                              | `NOT NULL`, `CHECK (tipo_contrato IN ('adesao', 'empresarial'))`            |
| `user_id`      | `uuid`      | ID do usuário (cliente ou agente) associado à apólice.                  | `REFERENCES public.perfis(id) ON DELETE CASCADE`                            |

**Políticas RLS para `apolices`:**

-   **Admins**: Possuem controle total sobre todas as apólices.
-   **Agentes**: Podem visualizar todas as apólices. Esta política pode ser ajustada para um controle mais granular, permitindo que agentes vejam apenas as apólices de seus clientes atribuídos.
-   **Clientes**: Podem visualizar e atualizar apenas as apólices que lhes pertencem.

#### Tabela `boletos`

Responsável por armazenar as informações dos boletos de pagamento, incluindo a URL para o documento baixado.

| Coluna         | Tipo        | Descrição                                                                 | Restrições                                                                  |
| :------------- | :---------- | :------------------------------------------------------------------------ | :-------------------------------------------------------------------------- |
| `id`           | `uuid`      | Chave primária do boleto.                                                 | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()`                                 |
| `numero`       | `TEXT`      | Número do boleto.                                                         | `NOT NULL`                                                                  |
| `apolice_id`   | `uuid`      | ID da apólice à qual o boleto está associado.                             | `REFERENCES public.apolices(id) ON DELETE CASCADE`                          |
| `seguradora`   | `TEXT`      | Nome da seguradora emissora do boleto.                                    | `NOT NULL`                                                                  |
| `competencia`  | `DATE`      | Mês/ano de competência do boleto.                                         | `NOT NULL`                                                                  |
| `vencimento`   | `DATE`      | Data de vencimento do boleto.                                             | `NOT NULL`                                                                  |
| `valor`        | `NUMERIC(10, 2)` | Valor total do boleto.                                                    | `NOT NULL`                                                                  |
| `valor_pago`   | `NUMERIC(10, 2)` | Valor pago do boleto (pode ser parcial).                                  | `DEFAULT 0.00`                                                              |
| `status`       | `TEXT`      | Status do boleto (Aberta, Pago, Vencido, etc.).                           | `NOT NULL`, `DEFAULT 'Aberta'`                                              |
| `url_boleto`   | `TEXT`      | URL para o arquivo do boleto armazenado no Supabase Storage.              |                                                                             |
| `user_id`      | `uuid`      | ID do usuário (cliente) ao qual o boleto pertence.                        | `REFERENCES public.perfis(id) ON DELETE CASCADE`                            |

**Políticas RLS para `boletos`:**

-   **Admins**: Possuem controle total sobre todos os boletos.
-   **Agentes**: Podem visualizar os boletos dos clientes que gerenciam.
-   **Clientes**: Podem visualizar e atualizar apenas seus próprios boletos.

--- 

## Passo 2: Lógica de Autenticação e RBAC

Neste passo, detalhamos a implementação da lógica de autenticação e controle de acesso baseado em papéis (RBAC) utilizando o Supabase Auth no frontend React. O objetivo é garantir que apenas usuários autorizados, com os níveis de permissão corretos, possam acessar as funcionalidades do sistema, especialmente o Painel Administrativo.

### 2.1. Configuração do Supabase no Frontend

Primeiro, é necessário configurar o cliente Supabase na aplicação React. Certifique-se de que as variáveis de ambiente `SUPABASE_URL` e `SUPABASE_ANON_KEY` estejam configuradas no seu projeto React (por exemplo, em um arquivo `.env.local`).

```javascript
// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tratamento de erros para variáveis de ambiente ausentes
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: Variáveis de ambiente SUPABASE_URL ou SUPABASE_ANON_KEY não configuradas.');
  // Em um ambiente de produção, você pode querer lançar um erro ou desabilitar funcionalidades do Supabase.
}
```

### 2.2. Fluxo de Autenticação de Usuários

O Supabase Auth oferece métodos para registro, login e logout de usuários. É crucial que as senhas nunca sejam armazenadas diretamente no código ou no banco de dados, mas sim tratadas com hashes seguros pelo Supabase.

#### Registro de Usuários (Sign Up)

```javascript
// Exemplo de componente React para registro (src/pages/SignUp.jsx)
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // 1. Registrar o usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) throw authError;

      // 2. Inserir informações adicionais na tabela 'perfis'
      // O 'id' do usuário é o mesmo gerado pelo Supabase Auth
      const { data: profileData, error: profileError } = await supabase
        .from('perfis')
        .insert([
          { id: authData.user.id, username: username, email: email, role: 'cliente' } // Default role é 'cliente'
        ]);

      if (profileError) throw profileError;

      setMessage('Verifique seu e-mail para confirmar o registro!');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp}>
      <h2>Registrar</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
      <div>
        <label htmlFor="username">Nome de Usuário:</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Senha:</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Registrando...' : 'Registrar'}
      </button>
    </form>
  );
}

export default SignUp;
```

#### Login de Usuários (Sign In)

```javascript
// Exemplo de componente React para login (src/pages/SignIn.jsx)
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      // Redirecionar para o dashboard ou página inicial após o login
      window.location.href = '/dashboard';
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn}>
      <h2>Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Senha:</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}

export default SignIn;
```

#### Logout de Usuários

```javascript
// Exemplo de função de logout
import { supabase } from './supabaseClient';

const handleLogout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // Redirecionar para a página de login ou home
    window.location.href = '/login';
  } catch (error) {
    console.error('Erro ao fazer logout:', error.message);
  }
};
```

### 2.3. Controle de Acesso Baseado em Papéis (RBAC)

O RBAC será implementado verificando a `role` do usuário, que é armazenada na tabela `perfis` e pode ser acessada após a autenticação.

#### Obtenção do Perfil e Papel do Usuário

```javascript
// src/hooks/useAuth.js
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Erro ao obter sessão:', error.message);
        setLoading(false);
        return;
      }

      if (session) {
        setUser(session.user);
        // Buscar o perfil do usuário na tabela 'perfis'
        const { data: profileData, error: profileError } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Erro ao obter perfil:', profileError.message);
        } else {
          setProfile(profileData);
        }
      }
      setLoading(false);
    };

    getSession();

    // Listener para mudanças de estado de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user);
          const { data: profileData, error: profileError } = await supabase
            .from('perfis')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Erro ao obter perfil no listener:', profileError.message);
          } else {
            setProfile(profileData);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading };
}
```

#### Proteção de Rotas e Componentes

```javascript
// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function PrivateRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div>Carregando autenticação...</div>; // Ou um spinner de carregamento
  }

  if (!user) {
    // Não autenticado, redireciona para a página de login
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Autenticado, mas sem permissão, redireciona para uma página de acesso negado
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}

export default PrivateRoute;
```

```javascript
// src/App.js (Exemplo de uso com React Router DOM)
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import AccessDenied from './pages/AccessDenied';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/access-denied" element={<AccessDenied />} />

        {/* Rotas protegidas */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminPanel />
            </PrivateRoute>
          }
        />
        {/* Outras rotas protegidas */}
      </Routes>
    </Router>
  );
}

export default App;
```

#### Painel Administrativo e o Superusuário "Donfim"

O superusuário "Donfim" terá a `role` de `admin`. A criação inicial do usuário "Donfim" deve ser feita manualmente no painel do Supabase Auth, e então sua `role` deve ser atualizada para `admin` na tabela `public.perfis`.

**Processo de Criação do Usuário "Donfim" (Manual no Supabase):**

1.  Acesse o painel do Supabase.
2.  Vá para a seção **Authentication** -> **Users**.
3.  Clique em **Invite user** ou **Add user** e crie um usuário com o e-mail `donfim@example.com` (ou outro e-mail de sua escolha) e uma senha forte.
4.  Após a criação, copie o `ID` (UUID) deste usuário.
5.  Vá para a seção **Database** -> **Table Editor**.
6.  Selecione a tabela `public.perfis`.
7.  Encontre o perfil correspondente ao `ID` do usuário "Donfim" e edite a coluna `role` para `admin`.

Com esta configuração, o `PrivateRoute` garantirá que apenas o usuário "Donfim" (e outros com `role: 'admin'`) tenha acesso ao `/admin`.

#### Gerenciamento de Papéis (Admin Panel)

```javascript
// src/pages/AdminPanel.jsx (Exemplo de gerenciamento de usuários)
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AdminPanel() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('id, username, email, role');

      if (error) throw error;
      setProfiles(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (profileId, newRole) => {
    try {
      const { error } = await supabase
        .from('perfis')
        .update({ role: newRole })
        .eq('id', profileId);

      if (error) throw error;
      fetchProfiles(); // Atualiza a lista após a mudança
      alert('Papel do usuário atualizado com sucesso!');
    } catch (error) {
      alert('Erro ao atualizar papel do usuário: ' + error.message);
    }
  };

  if (loading) return <div>Carregando usuários...</div>;
  if (error) return <div style={{ color: 'red' }}>Erro: {error}</div>;

  return (
    <div>
      <h1>Painel Administrativo</h1>
      <h2>Gerenciamento de Usuários</h2>
      <table>
        <thead>
          <tr>
            <th>Nome de Usuário</th>
            <th>Email</th>
            <th>Papel</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => (
            <tr key={profile.id}>
              <td>{profile.username}</td>
              <td>{profile.email}</td>
              <td>
                <select
                  value={profile.role}
                  onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                  disabled={profile.username === 'Donfim'} // Donfim não pode ter o papel alterado por ele mesmo ou outros admins
                >
                  <option value="admin">Admin</option>
                  <option value="agente">Agente</option>
                  <option value="cliente">Cliente</option>
                </select>
              </td>
              <td>
                {/* Outras ações como exclusão, reset de senha (via Supabase Auth) */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminPanel;
```

### 2.4. Considerações de Segurança

-   **Variáveis de Ambiente**: Sempre utilize variáveis de ambiente para chaves de API e URLs sensíveis. No React, prefixe-as com `REACT_APP_`.
-   **Senhas**: O Supabase Auth lida com o hashing seguro das senhas, então nunca tente armazená-las ou manipulá-las diretamente.
-   **RLS**: As políticas de Row Level Security no Supabase são cruciais para garantir que os dados sejam acessados apenas por usuários com as permissões corretas, mesmo que o frontend seja comprometido.
-   **Validação de Entrada**: Sempre valide as entradas do usuário no frontend e, se possível, também no backend (via funções Supabase ou Edge Functions) para prevenir ataques como injeção SQL ou XSS.
-   **HTTPS**: Garanta que sua aplicação esteja sempre servindo via HTTPS para proteger as credenciais e dados em trânsito.

--- 

## Passo 3: Arquitetura do Robô RPA Headless

Neste passo, detalhamos a arquitetura e fornecemos o código base para o robô RPA (Automação de Processos Robóticos) headless. Este robô, desenvolvido em Python com a biblioteca Playwright, será responsável por interagir com portais de operadoras de saúde/seguros, extrair boletos e integrá-los ao sistema Doncor de forma segura e automatizada.

### 3.1. Estrutura do Script RPA em Python (com Playwright)

O robô será executado em modo headless, ou seja, sem interface gráfica, em um ambiente de servidor. Ele receberá parâmetros necessários para o login e identificação do segurado, garantindo que as credenciais sensíveis não sejam expostas no frontend.

#### Pré-requisitos

Para executar o script, você precisará instalar o Python e as bibliotecas `playwright` e `supabase-py`.

```bash
pip install playwright supabase-py
playwright install
```

#### Código Base do Robô RPA

```python
# rpa_boleto_extractor.py
import asyncio
import os
import logging
from playwright.async_api import async_playwright, Playwright
from supabase import create_client, Client

# Configuração de logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Variáveis de Ambiente para Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Usar service_role_key para acesso privilegiado no backend

# Variáveis de Ambiente para o portal da operadora (exemplo)
OPERADORA_URL = os.environ.get("OPERADORA_URL")
OPERADORA_USERNAME = os.environ.get("OPERADORA_USERNAME")
OPERADORA_PASSWORD = os.environ.get("OPERADORA_PASSWORD")

# Inicializa o cliente Supabase
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logging.error(f"Erro ao inicializar cliente Supabase: {e}")
    exit(1)

async def extract_and_upload_boleto(user_id: str, unique_login_code: str, apolice_id: str):
    """
    Função principal do robô RPA para extrair boletos e fazer upload para o Supabase.
    Args:
        user_id (str): ID do usuário no Supabase para associar o boleto.
        unique_login_code (str): Código único do segurado para match.
        apolice_id (str): ID da apólice para associar o boleto.
    """
    logging.info(f"Iniciando extração de boleto para user_id: {user_id}, apolice_id: {apolice_id}")

    if not all([OPERADORA_URL, OPERADORA_USERNAME, OPERADORA_PASSWORD]):
        logging.error("Variáveis de ambiente da operadora não configuradas. Abortando RPA.")
        return False

    async with async_playwright() as p:
        browser = None
        try:
            browser = await p.chromium.launch(headless=True) # Execução headless
            page = await browser.new_page()

            # 1. Fazer login no portal da operadora
            logging.info(f"Navegando para {OPERADORA_URL}...")
            await page.goto(OPERADORA_URL)

            # Exemplo de preenchimento de formulário de login (ajustar seletores)
            await page.fill("input#username", OPERADORA_USERNAME)
            await page.fill("input#password", OPERADORA_PASSWORD)
            await page.click("button#loginButton")
            await page.wait_for_load_state("networkidle")
            logging.info("Login tentado.")

            # Verificar se o login foi bem-sucedido (exemplo: verificar URL ou elemento)
            if "dashboard" not in page.url:
                logging.error("Falha no login do portal da operadora. Verifique as credenciais.")
                return False

            # 2. Navegar até a seção de extratos/boletos
            logging.info("Navegando para a seção de extratos...")
            # Exemplo: clicar em um link ou navegar diretamente
            await page.goto(f"{OPERADORA_URL}/extratos") # Ajustar URL
            await page.wait_for_load_state("networkidle")

            # 3. Extrair e baixar os boletos de pagamento
            # Esta parte é altamente dependente da estrutura HTML do portal da operadora.
            # Será necessário inspecionar o site para identificar os seletores corretos.
            logging.info("Buscando boletos...")

            # Exemplo: Encontrar links de download de boletos e baixar
            # Supondo que cada boleto tenha um link ou botão de download
            boleto_links = await page.locator("a.download-boleto").all()
            if not boleto_links:
                logging.warning("Nenhum link de boleto encontrado.")
                return False

            downloaded_files = []
            for link in boleto_links:
                # Exemplo: Filtrar boletos pelo unique_login_code ou data de vencimento
                # Isso exigirá lógica para ler o texto próximo ao link ou atributos do link
                # Para este exemplo, vamos baixar o primeiro que encontrar.
                async with page.expect_download() as download_info:
                    await link.click()
                download = await download_info.value
                file_path = f"/tmp/{download.suggested_filename}"
                await download.save_as(file_path)
                downloaded_files.append(file_path)
                logging.info(f"Boleto baixado: {file_path}")
                break # Baixa apenas o primeiro para o exemplo

            if not downloaded_files:
                logging.warning("Nenhum boleto relevante foi baixado.")
                return False

            # 4. Fazer o match do boleto com o cadastro do segurado (já feito via unique_login_code)
            # O `unique_login_code` é usado para identificar qual segurado corresponde ao boleto.
            # No contexto do RPA, o `unique_login_code` pode ser um parâmetro de busca no portal
            # ou um identificador presente no nome do arquivo do boleto ou em seu conteúdo.
            # Para este exemplo, assumimos que o `user_id` e `apolice_id` já foram fornecidos
            # e o boleto baixado será associado a eles.

            # 5. Salvar o documento no perfil do usuário no Supabase Storage e DB
            uploaded_urls = []
            for local_file_path in downloaded_files:
                try:
                    with open(local_file_path, "rb") as f:
                        file_content = f.read()

                    # Upload para o Supabase Storage
                    bucket_name = "boletos"
                    file_name = f"{user_id}/{os.path.basename(local_file_path)}"
                    response = supabase.storage.from_(bucket_name).upload(file_name, file_content, {"content-type": "application/pdf"})

                    if response.status_code == 200 or response.status_code == 201:
                        public_url = supabase.storage.from_(bucket_name).get_public_url(file_name)
                        uploaded_urls.append(public_url)
                        logging.info(f"Boleto {os.path.basename(local_file_path)} enviado para Supabase Storage: {public_url}")

                        # Atualizar o banco de dados com a URL do boleto
                        # Assumindo que o boleto tem um número que pode ser extraído do nome do arquivo ou do próprio PDF
                        boleto_numero = os.path.basename(local_file_path).replace(".pdf", "") # Exemplo simples
                        
                        # Buscar informações da apólice para preencher os campos do boleto
                        apolice_data = supabase.from("apolices").select("seguradora, vigencia").eq("id", apolice_id).single().execute()
                        if apolice_data.data:
                            seguradora = apolice_data.data["seguradora"]
                            competencia = apolice_data.data["vigencia"] # Usar vigencia como competencia para o exemplo
                        else:
                            seguradora = "Desconhecida"
                            competencia = "2023-01-01" # Valor padrão

                        # Inserir registro na tabela 'boletos'
                        insert_data = {
                            "numero": boleto_numero,
                            "apolice_id": apolice_id,
                            "seguradora": seguradora,
                            "competencia": competencia,
                            "vencimento": "2023-12-31", # Placeholder, deve ser extraído do boleto
                            "valor": 0.00, # Placeholder, deve ser extraído do boleto
                            "url_boleto": public_url,
                            "user_id": user_id
                        }
                        response_db = supabase.from("boletos").insert([insert_data]).execute()
                        if response_db.data:
                            logging.info(f"Registro de boleto inserido no DB para {boleto_numero}.")
                        else:
                            logging.error(f"Erro ao inserir registro de boleto no DB: {response_db.error}")

                    else:
                        logging.error(f"Erro ao fazer upload do boleto {os.path.basename(local_file_path)}: {response.json()}")
                except Exception as e:
                    logging.error(f"Erro ao processar arquivo {local_file_path}: {e}")
                finally:
                    if os.path.exists(local_file_path):
                        os.remove(local_file_path) # Limpa o arquivo local

            return True if uploaded_urls else False

        except Exception as e:
            logging.error(f"Erro durante a execução do RPA: {e}")
            return False
        finally:
            if browser:
                await browser.close()

# Exemplo de como o robô seria acionado (em um ambiente de execução)
# if __name__ == "__main__":
#     # Estes valores viriam do backend/API
#     test_user_id = "<UUID_DO_USUARIO_TESTE>"
#     test_unique_login_code = "CODIGO123"
#     test_apolice_id = "<UUID_DA_APOLICE_TESTE>"
#     asyncio.run(extract_and_upload_boleto(test_user_id, test_unique_login_code, test_apolice_id))
```

### 3.2. Acionamento Seguro do Robô pelo Painel React

Para acionar o robô de forma segura a partir do Painel React, é crucial que as credenciais do portal da operadora e a `SUPABASE_SERVICE_ROLE_KEY` não sejam expostas no frontend. A abordagem recomendada é criar um endpoint de API no backend que o frontend possa chamar. Este endpoint, por sua vez, invocará o script RPA.

#### Opção 1: Supabase Edge Functions (Recomendado)

As Edge Functions do Supabase são ideais para isso, pois são funções serverless que podem ser acionadas via HTTP e têm acesso seguro às variáveis de ambiente do Supabase. Elas podem ser escritas em TypeScript/JavaScript e podem chamar o script Python RPA (se o ambiente permitir a execução de processos externos ou se o RPA for refatorado para JS).

**Fluxo:**

1.  O Painel React (Admin) faz uma requisição autenticada para uma Edge Function do Supabase (ex: `/api/trigger-rpa`).
2.  A Edge Function verifica a autorização do usuário (se é `admin`).
3.  A Edge Function coleta os parâmetros necessários (user_id, unique_login_code, apolice_id) do corpo da requisição.
4.  A Edge Function invoca o script Python RPA. Isso pode ser feito de algumas maneiras:
    *   **Chamada HTTP para um serviço externo**: Se o robô Python estiver hospedado como um serviço separado (ex: em um servidor dedicado ou outra plataforma serverless como AWS Lambda/Google Cloud Functions), a Edge Function faria uma requisição HTTP para este serviço. Esta é a abordagem mais desacoplada e escalável.
    *   **Execução direta (se possível)**: Em alguns ambientes serverless, é possível executar processos externos. No entanto, Edge Functions do Supabase são baseadas em Deno e JavaScript, então a execução direta de Python pode ser complexa ou inviável. Uma alternativa seria reescrever o RPA em JavaScript/TypeScript usando Playwright para Deno.

**Exemplo de Edge Function (TypeScript - Chamando um serviço externo):**

```typescript
// supabase/functions/trigger-rpa/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  // Verificar autenticação e role do usuário
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("perfis")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), { status: 403 });
  }

  try {
    const { user_id, unique_login_code, apolice_id } = await req.json();

    // Chamar o serviço RPA externo (ex: um endpoint onde o script Python está rodando)
    const rpaServiceUrl = Deno.env.get("RPA_SERVICE_URL");
    if (!rpaServiceUrl) {
      return new Response(JSON.stringify({ error: "RPA Service URL not configured" }), { status: 500 });
    }

    const rpaResponse = await fetch(rpaServiceUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, unique_login_code, apolice_id }),
    });

    if (!rpaResponse.ok) {
      const errorText = await rpaResponse.text();
      throw new Error(`RPA Service error: ${rpaResponse.status} - ${errorText}`);
    }

    const rpaResult = await rpaResponse.json();
    return new Response(JSON.stringify({ message: "RPA triggered successfully", result: rpaResult }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Erro na Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

#### Opção 2: Backend Dedicado (FastAPI/Python)

Se a complexidade do RPA ou a necessidade de um ambiente Python específico for alta, um backend dedicado (por exemplo, com FastAPI) pode ser mais adequado. Este backend seria responsável por expor um endpoint que o frontend consumiria e que, por sua vez, executaria o script RPA.

**Fluxo:**

1.  O Painel React (Admin) faz uma requisição autenticada para o backend FastAPI (ex: `/api/v1/trigger-rpa`).
2.  O backend FastAPI verifica a autorização do usuário (usando o token JWT do Supabase ou outro mecanismo).
3.  O backend coleta os parâmetros necessários (user_id, unique_login_code, apolice_id).
4.  O backend invoca o script Python RPA como um processo separado ou diretamente como uma função Python.
5.  O backend retorna o status da operação para o frontend.

**Exemplo de Endpoint FastAPI (Python):**

```python
# backend/server.py (Exemplo de adição de endpoint)
from fastapi import FastAPI, HTTPException, Depends, Header
from supabase import create_client, Client
import os
import asyncio
import logging

# Importar a função do robô RPA
from rpa_boleto_extractor import extract_and_upload_boleto # Assumindo que o arquivo está no mesmo diretório ou acessível

app = FastAPI()

# Configuração de logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Variáveis de Ambiente para Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Usar service_role_key para acesso privilegiado

# Inicializa o cliente Supabase
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logging.error(f"Erro ao inicializar cliente Supabase no FastAPI: {e}")
    # Em um ambiente real, você pode querer parar a aplicação ou ter um fallback

# Dependência para verificar se o usuário é admin
async def verify_admin_role(authorization: str = Header(...)):
    try:
        # O token JWT do Supabase vem no cabeçalho Authorization: Bearer <token>
        token = authorization.split(" ")[1]
        
        # Verificar o token com o Supabase Auth
        # Nota: A verificação de JWT em um backend pode ser mais complexa e envolver a validação da assinatura.
        # Para simplificar, vamos tentar obter o usuário e seu perfil.
        user_response = supabase.auth.get_user(token)
        user = user_response.user

        if not user:
            raise HTTPException(status_code=401, detail="Não autorizado")

        profile_response = supabase.from("perfis").select("role").eq("id", user.id).single().execute()
        profile = profile_response.data

        if not profile or profile["role"] != "admin":
            raise HTTPException(status_code=403, detail="Acesso negado: Requer papel de administrador")
        return user
    except Exception as e:
        logging.error(f"Erro na verificação de admin: {e}")
        raise HTTPException(status_code=401, detail=f"Não autorizado: {e}")

@app.post("/api/v1/trigger-rpa")
async def trigger_rpa(payload: dict, current_user: dict = Depends(verify_admin_role)):
    """
    Endpoint para acionar o robô RPA de extração de boletos.
    Requer autenticação de administrador.
    """
    try:
        user_id = payload.get("user_id")
        unique_login_code = payload.get("unique_login_code")
        apolice_id = payload.get("apolice_id")

        if not all([user_id, unique_login_code, apolice_id]):
            raise HTTPException(status_code=400, detail="Parâmetros user_id, unique_login_code e apolice_id são obrigatórios.")

        logging.info(f"Acionando RPA para user_id: {user_id}, apolice_id: {apolice_id}")
        
        # Executar o robô RPA em um processo separado ou diretamente
        # Para execução assíncrona e não bloqueante, use asyncio.create_task
        success = await extract_and_upload_boleto(user_id, unique_login_code, apolice_id)

        if success:
            return {"message": "RPA acionado com sucesso e boletos processados.", "status": "success"}
        else:
            raise HTTPException(status_code=500, detail="Falha na execução do RPA.")

    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"Erro inesperado ao acionar RPA: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {e}")

# Para rodar o FastAPI localmente:
# uvicorn server:app --reload
```

### 3.3. Acionamento do Frontend (React)

No Painel Administrativo do React, um botão ou ação pode disparar a chamada para o endpoint do backend/Edge Function.

```javascript
// src/pages/AdminPanel.jsx (Exemplo de acionamento do RPA)
import React from 'react';
import { supabase } from '../supabaseClient';
// ... (outros imports e código do AdminPanel)

const handleTriggerRPA = async (userId, uniqueLoginCode, apoliceId) => {
  try {
    // Obter a sessão atual para pegar o token de autenticação
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error("Usuário não autenticado.");
    }

    // URL do seu endpoint (Edge Function ou FastAPI)
    const rpaEndpoint = process.env.REACT_APP_RPA_TRIGGER_URL || "/api/v1/trigger-rpa";

    const response = await fetch(rpaEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}` // Enviar o token JWT para autenticação no backend
      },
      body: JSON.stringify({
        user_id: userId,
        unique_login_code: uniqueLoginCode,
        apolice_id: apoliceId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.error || 'Erro ao acionar o RPA');
    }

    const result = await response.json();
    alert(result.message);
  } catch (error) {
    console.error('Erro ao acionar RPA:', error.message);
    alert('Erro ao acionar RPA: ' + error.message);
  }
};

// ... dentro do componente AdminPanel, onde você renderiza a lista de usuários/apólices
// <button onClick={() => handleTriggerRPA(profile.id, profile.codigo_login_unico, apolice.id)}>Acionar RPA</button>
```

### 3.4. Considerações de Segurança e Robustez

-   **Credenciais**: Nunca armazene credenciais de portais de operadoras diretamente no código. Use variáveis de ambiente seguras no servidor onde o RPA será executado.
-   **Supabase Service Role Key**: A `SUPABASE_SERVICE_ROLE_KEY` deve ser usada APENAS no backend (Edge Function ou FastAPI) e nunca exposta no frontend, pois ela concede acesso total ao seu banco de dados Supabase.
-   **Tratamento de Erros**: O script RPA deve ter tratamento de erros robusto para lidar com falhas de login, mudanças na estrutura do site da operadora, falhas de download, etc.
-   **Logs**: Implemente um sistema de logging detalhado para monitorar a execução do robô e diagnosticar problemas.
-   **Idempotência**: O processo de upload e registro de boletos deve ser idempotente, ou seja, a execução repetida não deve causar duplicação de dados (ex: verificar se o boleto já existe antes de inserir).
-   **Agendamento**: Para automações recorrentes, considere agendar a execução do robô (ex: via cron jobs no servidor, ou recursos de agendamento do Supabase/plataforma serverless).
-   **Notificações**: Implemente notificações (e-mail, Slack) para administradores em caso de falhas críticas do RPA.
-   **Variáveis de Ambiente**: No ambiente de execução do robô (servidor, Edge Function, etc.), configure as variáveis de ambiente necessárias (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPERADORA_URL`, `OPERADORA_USERNAME`, `OPERADORA_PASSWORD`).

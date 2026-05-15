# Passo 2: Lógica de Autenticação e RBAC

Neste passo, detalharemos a implementação da lógica de autenticação e controle de acesso baseado em papéis (RBAC) utilizando o Supabase Auth no frontend React. O objetivo é garantir que apenas usuários autorizados, com os níveis de permissão corretos, possam acessar as funcionalidades do sistema, especialmente o Painel Administrativo.

## 2.1. Configuração do Supabase no Frontend

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

## 2.2. Fluxo de Autenticação de Usuários

O Supabase Auth oferece métodos para registro, login e logout de usuários. É crucial que as senhas nunca sejam armazenadas diretamente no código ou no banco de dados, mas sim tratadas com hashes seguros pelo Supabase.

### Registro de Usuários (Sign Up)

O registro de novos usuários pode ser feito com e-mail e senha. Após o registro, o usuário pode ser redirecionado para uma página de confirmação de e-mail ou diretamente para o login, dependendo da configuração do Supabase.

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

### Login de Usuários (Sign In)

O login é igualmente simples, utilizando e-mail e senha. Após o login bem-sucedido, o Supabase armazena o token de sessão, permitindo que o usuário permaneça autenticado.

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

### Logout de Usuários

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

## 2.3. Controle de Acesso Baseado em Papéis (RBAC)

O RBAC será implementado verificando a `role` do usuário, que é armazenada na tabela `perfis` e pode ser acessada após a autenticação.

### Obtenção do Perfil e Papel do Usuário

É fundamental ter um mecanismo para obter o perfil e, consequentemente, o papel (`role`) do usuário logado. Isso pode ser feito através de um hook React ou um contexto global.

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

### Proteção de Rotas e Componentes

Com o `useAuth` hook, podemos proteger rotas e renderizar componentes condicionalmente com base no papel do usuário.

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

### Painel Administrativo e o Superusuário "Donfim"

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

## 2.4. Gerenciamento de Papéis (Admin Panel)

Dentro do Painel Administrativo, o usuário "Donfim" poderá gerenciar os papéis de outros usuários. Isso envolverá a leitura e atualização da tabela `public.perfis`.

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

## 2.5. Considerações de Segurança

-   **Variáveis de Ambiente**: Sempre utilize variáveis de ambiente para chaves de API e URLs sensíveis. No React, prefixe-as com `REACT_APP_`.
-   **Senhas**: O Supabase Auth lida com o hashing seguro das senhas, então nunca tente armazená-las ou manipulá-las diretamente.
-   **RLS**: As políticas de Row Level Security no Supabase são cruciais para garantir que os dados sejam acessados apenas por usuários com as permissões corretas, mesmo que o frontend seja comprometido.
-   **Validação de Entrada**: Sempre valide as entradas do usuário no frontend e, se possível, também no backend (via funções Supabase ou Edge Functions) para prevenir ataques como injeção SQL ou XSS.
-   **HTTPS**: Garanta que sua aplicação esteja sempre servindo via HTTPS para proteger as credenciais e dados em trânsito.

## Próximos Passos

Com a lógica de autenticação e RBAC estabelecida, o próximo passo será a **Arquitetura do Robô RPA Headless (Passo 3)**, onde detalharemos a estrutura do script Python para o scraping invisível e sua integração segura com o sistema.

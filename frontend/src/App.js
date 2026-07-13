import React, { useState, useEffect, useCallback, useMemo } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopNav from "./components/TopNav";
import TabSystem from "./components/TabSystem";
import DoncorLogo from "./components/DoncorLogo";
import Dashboard from "./pages/Dashboard";
import Adesao from "./pages/Adesao";
import Empresarial from "./pages/Empresarial";
import GenericPage from "./pages/GenericPage";
import Inclusao from "./pages/Inclusao";
import Exclusao from "./pages/Exclusao";
import Transferencia from "./pages/Transferencia";
import Faturas from "./pages/Faturas";
import Comissoes from "./pages/Comissoes";
import Seguradoras from "./pages/Seguradoras";
import Produtos from "./pages/Produtos";
import Colaboradores from "./pages/Colaboradores";
import Relatorios from "./pages/Relatorios";
import Robo from "./pages/Robo";
import RoboConfig from "./pages/RoboConfig";
import Chat from "./pages/Chat";
import PortalDonCor from "./pages/PortalDonCor";
import PortalParceiros from "./pages/PortalParceiros";
import PortalFormularios from "./pages/PortalFormularios";
import PortalSolicitacoes from "./pages/PortalSolicitacoes";
import PortalSinistralidade from "./pages/PortalSinistralidade";
import LgpdGovernance from "./pages/LgpdGovernance";
import { Loader2 } from "lucide-react";
import { fetchColaboradores } from "./services/api";

const DEFAULT_ACCESS = "dashboard";
const MASTER_USERNAME = "Donfim";
const ALL_PAGES = [
  "dashboard",
  "adesao",
  "empresarial",
  "chat",
  "inclusao",
  "exclusao",
  "transferencia",
  "faturas",
  "comissoes",
  "seguradoras",
  "produtos",
  "colaboradores",
  "portal-parceiros",
  "portal-solicitacoes",
  "portal-formularios",
  "portal-sinistralidade",
  "relatorios",
  "robo",
  "robo-config",
  "exportar",
  "perfil",
  "configuracoes",
  "suporte",
];

const DEFAULT_ACCESS_BY_ROLE = {
  Master: ALL_PAGES,
  Diretoria: ALL_PAGES,
  Gerencia: [
    "dashboard",
    "adesao",
    "empresarial",
    "chat",
    "inclusao",
    "exclusao",
    "transferencia",
    "faturas",
    "comissoes",
    "seguradoras",
    "produtos",
    "portal-parceiros",
    "portal-formularios",
    "relatorios",
    "perfil",
    "suporte",
  ],
  Analista: [
    "dashboard",
    "adesao",
    "empresarial",
    "inclusao",
    "exclusao",
    "transferencia",
    "faturas",
    "comissoes",
    "relatorios",
    "perfil",
    "suporte",
  ],
};

const ACCESS_MIGRATION_PAGES = ["portal-formularios"];

const safeParseJSON = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeAccessConfig = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_ACCESS_BY_ROLE;
  }

  const normalized = {
    ...DEFAULT_ACCESS_BY_ROLE,
    ...value,
  };

  Object.keys(DEFAULT_ACCESS_BY_ROLE).forEach((role) => {
    if (!Array.isArray(value[role])) return;
    const migrationPages = DEFAULT_ACCESS_BY_ROLE[role].filter((page) => ACCESS_MIGRATION_PAGES.includes(page));
    normalized[role] = Array.from(new Set([...value[role], ...migrationPages]));
  });

  return normalized;
};

const LoginScreen = ({ onLogin, error }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSession, setKeepSession] = useState(false);
  const [collaborators, setCollaborators] = useState([]);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotInput, setForgotInput] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  useEffect(() => {
    const loadColabs = async () => {
      try {
        const list = await fetchColaboradores();
        setCollaborators(list || []);
      } catch (e) {
        console.error("Erro ao carregar colaboradores no login:", e);
      }
    };
    loadColabs();
  }, []);

  const handleRecoverPassword = (e) => {
    e.preventDefault();
    const input = forgotInput.trim().toLowerCase();
    if (!input) {
      setForgotError("Por favor, digite seu usuário ou e-mail.");
      setForgotMessage("");
      return;
    }

    // Search static users
    if (input === MASTER_USERNAME.toLowerCase() || input === "master") {
      setForgotMessage(`Instruções de recuperação de senha enviadas para o e-mail cadastrado do usuário Master. (Para testes, a senha padrão é 121418).`);
      setForgotError("");
      return;
    }

    const staticRoles = ["diretoria", "gerencia", "analista"];
    if (staticRoles.includes(input)) {
      setForgotMessage(`Instruções de recuperação de senha para o perfil de ${input} enviadas para o e-mail cadastrado. (Para testes, a senha padrão é 121418).`);
      setForgotError("");
      return;
    }

    // Search collaborators
    const colab = collaborators.find(c => 
      (c.usuario && c.usuario.toLowerCase() === input) ||
      (c.email && c.email.toLowerCase() === input) ||
      (c.nome && c.nome.toLowerCase() === input)
    );

    if (colab) {
      const emailDest = colab.email || "suporte@doncor.com.br";
      setForgotMessage(`Instruções de recuperação de senha enviadas para o e-mail: ${emailDest}. ${colab.senha ? `(Para testes rápidos, sua senha atual é: ${colab.senha})` : ''}`);
      setForgotError("");
    } else {
      setForgotError("Nenhum usuário ou colaborador encontrado com as informações fornecidas.");
      setForgotMessage("");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const typedUser = username.trim();
    const typedPass = password;

    if (!typedUser) {
      onLogin(null, "Por favor, digite o usuário.");
      return;
    }
    if (!typedPass) {
      onLogin(null, "Por favor, digite a senha.");
      return;
    }

    // 1. Check if static Master user
    if (typedUser.toLowerCase() === MASTER_USERNAME.toLowerCase()) {
      const isMasterKey = process.env.REACT_APP_MASTER_LOGIN_KEY || "121418";
      if (typedPass === isMasterKey) {
        onLogin({ username: MASTER_USERNAME, role: 'Master' });
      } else {
        onLogin(null, "Senha incorreta.");
      }
      return;
    }

    // 2. Check if static role users
    const staticRoles = ["Diretoria", "Gerencia", "Analista"];
    const matchedStaticRole = staticRoles.find(r => r.toLowerCase() === typedUser.toLowerCase());
    if (matchedStaticRole) {
      const isStaffKey = process.env.REACT_APP_STAFF_LOGIN_KEY || "121418";
      if (typedPass === isStaffKey) {
        onLogin({ username: matchedStaticRole, role: matchedStaticRole });
      } else {
        onLogin(null, "Senha incorreta.");
      }
      return;
    }

    // 3. Check collaborators in MongoDB
    const matchedColab = collaborators.find(c => 
      (c.usuario && c.usuario.toLowerCase() === typedUser.toLowerCase()) ||
      (c.email && c.email.toLowerCase() === typedUser.toLowerCase()) ||
      (c.nome && c.nome.toLowerCase() === typedUser.toLowerCase())
    );

    if (matchedColab) {
      if (matchedColab.senha === typedPass) {
        onLogin({
          username: matchedColab.nome,
          role: matchedColab.departamento || 'Analista',
          collaboratorId: matchedColab.id
        });
      } else {
        onLogin(null, "Senha incorreta.");
      }
      return;
    }

    onLogin(null, "Usuário não cadastrado.");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #eef4fb 0%, #f8fafc 100%)", padding: "24px" }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "400px", background: "#fff", border: "1px solid #eaeaea", borderRadius: "20px", padding: "36px 36px 28px", boxShadow: "0 15px 35px rgba(0, 0, 0, 0.05)", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          <div style={{ marginBottom: "14px", display: "flex", justifyContent: "center" }}>
            <DoncorLogo size={46} />
          </div>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "0.85rem" }}>Gestão de Apólices e Benefícios</p>
        </div>

        {error && (
          <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", borderRadius: "8px", padding: "10px 12px", marginBottom: "16px", fontSize: "0.86rem" }}>
            {error}
          </div>
        )}

        <label style={{ display: "block", color: "#000000", fontWeight: "700", fontSize: "0.88rem", marginBottom: "6px", textAlign: "left" }}>
          Usuário
        </label>
        <div style={{ position: "relative", marginBottom: "18px" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "1.1rem", color: "#64748b", pointerEvents: "none" }}>👤</span>
          <input 
            type="text"
            value={username} 
            onChange={(event) => setUsername(event.target.value)} 
            placeholder="Digite seu usuário ou e-mail"
            style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "10px 12px 10px 38px", fontSize: "0.95rem", background: "#f8fafc", color: "#1e293b", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <label style={{ display: "block", color: "#000000", fontWeight: "700", fontSize: "0.88rem", marginBottom: "6px", textAlign: "left" }}>
          Senha
        </label>
        <div style={{ position: "relative", marginBottom: "20px" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "1.1rem", color: "#64748b", pointerEvents: "none" }}>🔑</span>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Digite sua senha"
            style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "10px 38px 10px 38px", fontSize: "0.95rem", background: "#f8fafc", color: "#1e293b", outline: "none", boxSizing: "border-box" }}
          />
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)}
            style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", padding: 0 }}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input 
              type="checkbox" 
              id="keep-session" 
              checked={keepSession} 
              onChange={(e) => setKeepSession(e.target.checked)}
              style={{ width: "16px", height: "16px", cursor: "pointer", borderRadius: "4px" }} 
            />
            <label htmlFor="keep-session" style={{ fontSize: "0.88rem", color: "#000000", cursor: "pointer", userSelect: "none" }}>
              Manter conectado
            </label>
          </div>
          <button 
            type="button" 
            onClick={() => setShowForgot(true)} 
            style={{ background: "none", border: "none", color: "#2C7BE5", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer", padding: 0 }}
          >
            Esqueci a senha
          </button>
        </div>

        <button 
          type="submit" 
          style={{ 
            width: "100%", 
            background: "linear-gradient(to bottom, #f1f5f9, #cbd5e1)", 
            border: "1px solid #94a3b8", 
            color: "#0f172a", 
            borderRadius: "8px", 
            padding: "12px 14px", 
            fontWeight: "700", 
            fontSize: "0.95rem", 
            cursor: "pointer", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            gap: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
          }}
        >
          <span>🔒</span> Entrar no Sistema
        </button>

        <div style={{ textAlign: "center", marginTop: "18px" }}>
          <a href="/portal-doncor" style={{ color: "#2C7BE5", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none" }}>
            Acessar Portal do Cliente
          </a>
        </div>
      </form>

      {showForgot && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.3)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "28px",
            width: "100%",
            maxWidth: "400px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            border: "1px solid #e2e8f0"
          }}>
            <h3 style={{ margin: "0 0 8px", color: "#0f172a", fontSize: "1.2rem", fontWeight: 700 }}>Recuperar Senha</h3>
            <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "0.85rem", lineHeight: "1.4" }}>
              Digite seu nome de usuário ou e-mail cadastrado para obter sua senha de acesso.
            </p>

            <form onSubmit={handleRecoverPassword}>
              {forgotError && (
                <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", borderRadius: "8px", padding: "10px 12px", marginBottom: "16px", fontSize: "0.85rem" }}>
                  {forgotError}
                </div>
              )}
              {forgotMessage && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "8px", padding: "10px 12px", marginBottom: "16px", fontSize: "0.85rem", lineHeight: "1.4" }}>
                  {forgotMessage}
                </div>
              )}

              <label style={{ display: "block", color: "#000000", fontWeight: "700", fontSize: "0.85rem", marginBottom: "6px", textAlign: "left" }}>
                Usuário ou E-mail
              </label>
              <input 
                type="text"
                placeholder="Ex: joao.silva ou joao@email.com"
                value={forgotInput}
                onChange={e => setForgotInput(e.target.value)}
                style={{ 
                  width: "100%", 
                  marginBottom: "20px", 
                  padding: "10px 12px", 
                  fontSize: "0.9rem",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                  outline: "none"
                }}
              />

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button 
                  type="button" 
                  onClick={() => { setShowForgot(false); setForgotInput(""); setForgotMessage(""); setForgotError(""); }}
                  style={{ 
                    fontSize: "0.85rem",
                    padding: "8px 14px",
                    background: "none",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    cursor: "pointer"
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  style={{ 
                    background: "#2C7BE5", 
                    color: "#fff", 
                    fontSize: "0.85rem",
                    padding: "8px 14px",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  Recuperar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const LoadingScreen = ({ onFinish }) => {
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setValidating(false);
      const timer2 = setTimeout(() => {
        onFinish();
      }, 800);
      return () => clearTimeout(timer2);
    }, 1200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="loading-screen">
      <span style={{ fontSize: '18pt', fontWeight: 600, color: '#e6832a', marginTop: '4px', zIndex: 1 }}>Gestão de Apólices - Don Cor</span>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', zIndex: 1, marginTop: '16px' }}>
        {validating ? (
          <span style={{ fontSize: '13pt', fontWeight: 600, color: '#2C7BE5', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            Validando o usuário...
          </span>
        ) : (
          <span style={{ fontSize: '13pt', fontWeight: 600, color: '#27ae60' }}>Acesso validado com sucesso!</span>
        )}
      </div>
    </div>
  );
};

const pageComponents = {
  dashboard: Dashboard,
  adesao: Adesao,
  empresarial: Empresarial,
  chat: Chat,
  inclusao: Inclusao,
  exclusao: Exclusao,
  transferencia: Transferencia,
  faturas: Faturas,
  comissoes: Comissoes,
  seguradoras: Seguradoras,
  produtos: Produtos,
  colaboradores: Colaboradores,
  "portal-parceiros": PortalParceiros,
  "portal-solicitacoes": PortalSolicitacoes,
  "portal-formularios": PortalFormularios,
  "portal-sinistralidade": PortalSinistralidade,
  "lgpd-governance": LgpdGovernance,
  relatorios: Relatorios,
  robo: Robo,
  "robo-config": RoboConfig,
  perfil: GenericPage,
  configuracoes: GenericPage,
  suporte: GenericPage,
};

function MainApp({ session, onLogout, accessByRole, onAccessChange }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tabs, setTabs] = useState([
    { id: DEFAULT_ACCESS, label: "Dashboard do Usuário", icon: "LayoutDashboard", page: DEFAULT_ACCESS, closable: false },
  ]);
  const [activeTab, setActiveTab] = useState(DEFAULT_ACCESS);

  const role = session?.role || 'Diretoria';
  const allowedPages = useMemo(() => {
    const base = accessByRole[role] || accessByRole.Diretoria || [];
    if (role === 'Master') {
      return [...base, 'lgpd-governance'];
    }
    return base;
  }, [accessByRole, role]);

  const openTab = useCallback((item) => {
    if (!allowedPages.includes(item.page) && item.page !== 'dashboard') return;
    setTabs((prev) => prev.find((t) => t.id === item.id) ? prev : [...prev, { id: item.id, label: item.label, icon: item.icon, page: item.page, closable: true }]);
    setActiveTab(item.id);
  }, [allowedPages]);

  const closeTab = useCallback((tabId) => {
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== tabId);
      if (activeTab === tabId && filtered.length > 0) setActiveTab(filtered[filtered.length - 1].id);
      return filtered;
    });
  }, [activeTab]);

  const refreshTab = useCallback(() => { const current = activeTab; setActiveTab(""); setTimeout(() => setActiveTab(current), 50); }, [activeTab]);

  const renderContent = () => {
    const tab = tabs.find((t) => t.id === activeTab);
    if (!tab) return null;
    const Component = pageComponents[tab.page] || GenericPage;
    return <Component key={tab.id} pageId={tab.page} tabId={tab.id} pageLabel={tab.label} session={session} accessByRole={accessByRole} onAccessChange={onAccessChange} />;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} onMenuClick={openTab} activeItem={activeTab} allowedPages={allowedPages} />
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} style={{ flex: 1 }}>
        <TopNav
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
          onMenuClick={openTab}
          onLogout={onLogout}
          session={session}
        />
        <div className="content-area">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(() => safeParseJSON(localStorage.getItem('doncor_session'), null));
  const [error, setError] = useState('');
  const [accessByRole, setAccessByRole] = useState(() => normalizeAccessConfig(safeParseJSON(localStorage.getItem('doncor_access'), DEFAULT_ACCESS_BY_ROLE)));

  const handleLoadingFinish = useCallback(() => setLoading(false), []);
  const handleLogin = (sessionOrUsername, errorMessage = '') => {
    if (errorMessage) {
      setError(errorMessage);
      return;
    }

    if (sessionOrUsername && typeof sessionOrUsername === "object") {
      setSession(sessionOrUsername);
      localStorage.setItem('doncor_session', JSON.stringify(sessionOrUsername));
      setError('');
      setLoading(true);
      return;
    }

    const username = sessionOrUsername;
    const availableRoles = ["Diretoria", "Gerencia", "Analista"];
    const matchedRole = availableRoles.find((roleName) => roleName.toLowerCase() === username.toLowerCase());
    const isMaster = username.toLowerCase() === MASTER_USERNAME.toLowerCase();

    if (isMaster) {
      const masterSession = { username: MASTER_USERNAME, role: 'Master' };
      setSession(masterSession);
      localStorage.setItem('doncor_session', JSON.stringify(masterSession));
      setError('');
      setLoading(true);
      return;
    }

    if (matchedRole) {
      const userSession = { username: matchedRole, role: matchedRole };
      setSession(userSession);
      localStorage.setItem('doncor_session', JSON.stringify(userSession));
      setError('');
      setLoading(true);
      return;
    }

    setError('Perfil de acesso inválido.');
  };

  const onLogout = () => { setSession(null); localStorage.removeItem('doncor_session'); setLoading(true); };
  const onAccessChange = (next) => {
    const normalized = normalizeAccessConfig(next);
    setAccessByRole(normalized);
    localStorage.setItem('doncor_access', JSON.stringify(normalized));
  };

  if (window.location.pathname.startsWith('/portal-doncor')) {
    return <PortalDonCor />;
  }

  if (!session) return <LoginScreen onLogin={handleLogin} error={error} />;

  return <BrowserRouter>{loading && <LoadingScreen onFinish={handleLoadingFinish} />}{!loading && <Routes><Route path="/*" element={<MainApp session={session} onLogout={onLogout} accessByRole={accessByRole} onAccessChange={onAccessChange} />} /></Routes>}</BrowserRouter>;
}

export default App;

import React, { useState, useEffect, useCallback, useMemo } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopNav from "./components/TopNav";
import TabSystem from "./components/TabSystem";
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
import { Loader2 } from "lucide-react";

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

  return {
    ...DEFAULT_ACCESS_BY_ROLE,
    ...value,
  };
};

const LoginScreen = ({ onLogin, error }) => {
  const [username, setUsername] = useState(MASTER_USERNAME);

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin(username.trim());
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #eef4fb 0%, #f8fafc 100%)", padding: "24px" }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "420px", background: "#fff", border: "1px solid #e3e6f0", borderRadius: "16px", padding: "28px", boxShadow: "0 20px 45px rgba(44, 64, 80, 0.12)" }}>
        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <div style={{ width: "54px", height: "54px", borderRadius: "16px", background: "#3a5a8c", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "20px", marginBottom: "12px" }}>DC</div>
          <h1 style={{ margin: 0, fontSize: "1.35rem", color: "#344050" }}>Don Cor Web</h1>
          <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: "0.88rem" }}>Gestão de Apólices - Don Cor</p>
          <a href="/portal-doncor" style={{ display:'inline-block', marginTop:'10px', color:'#2C7BE5', fontSize:'0.82rem', fontWeight:700 }}>Acessar Portal DonCor para empresas</a>
        </div>

        {error && (
          <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", borderRadius: "8px", padding: "10px 12px", marginBottom: "14px", fontSize: "0.86rem" }}>
            {error}
          </div>
        )}

        <label style={{ display: "block", color: "#344050", fontWeight: 600, fontSize: "0.85rem", marginBottom: "6px" }}>
          Perfil de acesso
        </label>
        <select value={username} onChange={(event) => setUsername(event.target.value)} style={{ width: "100%", border: "1px solid #d8e2ef", borderRadius: "8px", padding: "10px 12px", marginBottom: "16px", fontSize: "0.95rem", background: "#fff" }}>
          <option value="Donfim">Donfim / Master</option>
          <option value="Diretoria">Diretoria</option>
          <option value="Gerencia">Gerencia</option>
          <option value="Analista">Analista</option>
        </select>

        <button type="submit" style={{ width: "100%", background: "#2C7BE5", color: "#fff", border: "none", borderRadius: "8px", padding: "11px 14px", fontWeight: 700, cursor: "pointer" }}>
          Entrar
        </button>

        <p style={{ margin: "16px 0 0", color: "#8a8d93", fontSize: "0.78rem", textAlign: "center" }}>
          Acesso local temporário para liberar o frontend. Para produção, use Supabase Auth.
        </p>
      </form>
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
  const allowedPages = useMemo(() => accessByRole[role] || accessByRole.Diretoria || [], [accessByRole, role]);

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
    return <Component key={tab.id} pageId={tab.page} pageLabel={tab.label} session={session} accessByRole={accessByRole} onAccessChange={onAccessChange} />;
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
        <TabSystem
          tabs={tabs}
          activeTab={activeTab}
          onTabClick={setActiveTab}
          onTabClose={closeTab}
          onRefresh={refreshTab}
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
  const handleLogin = (username) => {
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

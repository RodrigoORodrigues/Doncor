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
import { Loader2 } from "lucide-react";

const DEFAULT_ACCESS = "dashboard";

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
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('doncor_session') || 'null'));
  const [error, setError] = useState('');
  const [accessByRole, setAccessByRole] = useState(getInitialAccess);

  const handleLoadingFinish = useCallback(() => setLoading(false), []);
  const handleLogin = (username, password) => {
    if (username === MASTER_USER.username && password === MASTER_USER.password) {
      const masterSession = { username: 'Donfim', role: 'Master' };
      setSession(masterSession);
      localStorage.setItem('doncor_session', JSON.stringify(masterSession));
      setError('');
      return;
    }
    if (['Diretoria', 'Gerencia', 'Analista'].includes(username) && password === '123456') {
      const userSession = { username, role: username };
      setSession(userSession);
      localStorage.setItem('doncor_session', JSON.stringify(userSession));
      setError('');
      return;
    }
    setError('Credenciais inválidas.');
  };

  const onLogout = () => { setSession(null); localStorage.removeItem('doncor_session'); };
  const onAccessChange = (next) => { setAccessByRole(next); localStorage.setItem('doncor_access', JSON.stringify(next)); };

  if (!session) return <LoginScreen onLogin={handleLogin} error={error} />;

  return <BrowserRouter>{loading && <LoadingScreen onFinish={handleLoadingFinish} />}{!loading && <Routes><Route path="/*" element={<MainApp session={session} onLogout={onLogout} accessByRole={accessByRole} onAccessChange={onAccessChange} />} /></Routes>}</BrowserRouter>;
}

export default App;

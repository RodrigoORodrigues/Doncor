import React, { useState, useEffect, useCallback } from "react";
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
import { Loader2 } from "lucide-react";

const LoadingScreen = ({ onFinish }) => {
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setValidating(false);
      const timer2 = setTimeout(() => {
        onFinish();
      }, 800);
      return () => clearTimeout(timer2);
    }, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="loading-screen">
      <div className="loading-corner-tl" />
      <div className="loading-corner-tr" />
      <div className="loading-corner-br" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70px', overflow: 'hidden', width: '380px', zIndex: 1 }}>
        <svg width="50" height="50" viewBox="0 0 100 100" style={{ marginRight: '10px' }}>
          <circle cx="50" cy="50" r="45" fill="#3a5a8c" />
          <path d="M35 25 Q35 75 65 75 Q45 75 45 50 Q45 25 65 25 Q35 25 35 25Z" fill="white" />
        </svg>
        <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 500, fontSize: '40pt', color: '#4979bb', fontFamily: 'Poppins, sans-serif', letterSpacing: '-1px' }}>
          Don Cor
        </span>
      </div>
      <span style={{ fontSize: '18pt', fontWeight: 600, color: '#e6832a', marginTop: '4px', zIndex: 1 }}>
        Gestão de Apólices - Don Cor
      </span>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', zIndex: 1, marginTop: '16px' }}>
        {validating ? (
          <span style={{ fontSize: '13pt', fontWeight: 600, color: '#2C7BE5', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            Validando o usuário...
          </span>
        ) : error ? (
          <>
            <span style={{ fontSize: '13pt', fontWeight: 600, color: '#e63757' }}>
              Usuário não identificado!!
            </span>
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: '8px', background: '#e63757', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
            >
              ACESSAR NOVAMENTE
            </button>
          </>
        ) : (
          <span style={{ fontSize: '13pt', fontWeight: 600, color: '#27ae60', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Acesso validado com sucesso!
          </span>
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

function MainApp() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tabs, setTabs] = useState([
    { id: "dashboard", label: "Dashboard do Usuário", icon: "LayoutDashboard", page: "dashboard", closable: false },
  ]);
  const [activeTab, setActiveTab] = useState("dashboard");

  const openTab = useCallback((item) => {
    const existingTab = tabs.find((t) => t.id === item.id);
    if (existingTab) {
      setActiveTab(item.id);
    } else {
      setTabs((prev) => [
        ...prev,
        { id: item.id, label: item.label, icon: item.icon, page: item.page, closable: true },
      ]);
      setActiveTab(item.id);
    }
  }, [tabs]);

  const closeTab = useCallback((tabId) => {
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== tabId);
      if (activeTab === tabId && filtered.length > 0) {
        setActiveTab(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  }, [activeTab]);

  const refreshTab = useCallback(() => {
    const current = activeTab;
    setActiveTab("");
    setTimeout(() => setActiveTab(current), 50);
  }, [activeTab]);

  const renderContent = () => {
    const tab = tabs.find((t) => t.id === activeTab);
    if (!tab) return null;
    const Component = pageComponents[tab.page] || GenericPage;
    return <Component key={tab.id} pageId={tab.page} pageLabel={tab.label} />;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onMenuClick={openTab}
        activeItem={activeTab}
      />
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

  const handleLoadingFinish = useCallback(() => {
    setLoading(false);
  }, []);

  return (
    <BrowserRouter>
      {loading && <LoadingScreen onFinish={handleLoadingFinish} />}
      {!loading && (
        <Routes>
          <Route path="/*" element={<MainApp />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;

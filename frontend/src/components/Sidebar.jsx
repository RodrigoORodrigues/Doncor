import React, { useState, useEffect } from 'react';
import { menuItems } from '../data/mockData';
import {
  Users, Handshake, UserPlus, UserMinus, ArrowLeftRight,
  Receipt, DollarSign, Building2, Package, UserCog,
  BarChart3, Download, LayoutDashboard,
  Menu, Bot, Settings, User, HelpCircle, MessageCircle, UserCheck, FileText, Shield,
  ChevronDown, ChevronRight
} from 'lucide-react';
import DoncorLogo from './DoncorLogo';

const iconMap = {
  Users, Handshake, UserPlus, UserMinus, ArrowLeftRight,
  Receipt, DollarSign, Building2, Package, UserCog,
  BarChart3, Download, LayoutDashboard, Menu, Bot, Settings, User, HelpCircle, MessageCircle, UserCheck, FileText, Shield
};

const buildStrictMenuItems = () => {
  const normalized = [];

  menuItems.forEach((section) => {
    if (section.section === 'Financeiro') return;

    if (section.section === 'Movimentações') return;

    if (section.section === 'Meus Contratos') {
      normalized.push({
        ...section,
        items: [
          ...section.items.filter((item) => !['adesao', 'empresarial'].includes(item.id)),
          { id: 'empresarial', label: 'Empresarial', icon: 'Handshake', page: 'empresarial' },
          { id: 'pme', label: 'PME', icon: 'Handshake', page: 'empresarial' },
        ],
      });
      return;
    }

    if (section.section === 'Cadastros') {
      normalized.push({
        ...section,
        items: [...section.items],
      });
      normalized.push({
        section: 'Portal do Cliente',
        items: [
          { id: 'portal-parceiros', label: 'Acessos e Clientes', icon: 'UserCheck', page: 'portal-parceiros' },
          {
            id: 'movimentacao',
            label: 'Movimentação',
            icon: 'ArrowLeftRight',
            isSubmenu: true,
            subItems: [
              { id: 'inclusao', label: 'Inclusão', icon: 'UserPlus', page: 'inclusao' },
              { id: 'exclusao', label: 'Exclusão', icon: 'UserMinus', page: 'exclusao' },
              { id: 'transferencia', label: 'Transferência', icon: 'ArrowLeftRight', page: 'transferencia' },
            ]
          },
          { id: 'portal-solicitacoes', label: 'Solicitações', icon: 'FileText', page: 'portal-solicitacoes' },
          { id: 'portal-formularios', label: 'Formulários e Manuais', icon: 'FileText', page: 'portal-formularios' },
          { id: 'portal-sinistralidade', label: 'Sinistralidade e BI', icon: 'BarChart3', page: 'portal-sinistralidade' },
          { id: 'chat', label: 'Chat', icon: 'MessageCircle', page: 'chat' },
          { id: 'lgpd-governance', label: 'Governança LGPD', icon: 'Shield', page: 'lgpd-governance' },
        ],
      });
      return;
    }

    normalized.push(section);
  });

  return normalized;
};

const Sidebar = ({ collapsed, onToggle, onMenuClick, activeItem, allowedPages = [] }) => {
  const visibleMenuItems = buildStrictMenuItems();
  
  const [expandedMenus, setExpandedMenus] = useState({
    movimentacao: true, // expanded by default for a user-friendly view
  });

  const toggleSubmenu = (menuId) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  useEffect(() => {
    if (['inclusao', 'exclusao', 'transferencia'].includes(activeItem)) {
      setExpandedMenus((prev) => ({
        ...prev,
        movimentacao: true,
      }));
    }
  }, [activeItem]);

  return (
    <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: collapsed ? '14px 8px' : '14px 16px',
        borderBottom: '1px solid #0f3a7d',
        height: '56px',
        justifyContent: collapsed ? 'center' : 'flex-start'
      }}>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '4px',
            color: '#a8b5c3',
            marginRight: collapsed ? 0 : '12px',
            transition: 'color 0.2s'
          }}
          title="Menu de Navegação"
        >
          <Menu size={20} />
        </button>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', animation: 'fadeIn 0.3s ease', marginLeft: '4px' }}>
            <DoncorLogo size={26} />
          </div>
        )}
      </div>

      <div style={{ overflowY: 'auto', overflowX: 'hidden', height: 'calc(100vh - 56px)', padding: '8px 0' }}>
        <div style={{ padding: '0 0 4px 0' }}>
          <div
            className={`sidebar-item ${activeItem === 'dashboard' ? 'active' : ''}`}
            onClick={() => onMenuClick({ id: 'dashboard', label: 'Dashboard do Usuário', icon: 'LayoutDashboard', page: 'dashboard' })}
            title="Dashboard do Usuário"
          >
            <span className="icon"><LayoutDashboard size={16} /></span>
            {!collapsed && <span>Dashboard</span>}
          </div>
        </div>

        {visibleMenuItems.map((section, sIdx) => (
          <div key={sIdx}>
            {!collapsed && (
              <>
                <div className="sidebar-section-label">{section.section}</div>
                <div className="sidebar-divider"><hr /></div>
              </>
            )}
            {collapsed && <div style={{ borderTop: '1px solid #e3e6f0', margin: '8px 12px' }} />}
            {section.items.filter((item) => {
              if (item.isSubmenu) {
                return item.subItems.some((sub) => allowedPages.includes(sub.page));
              }
              return allowedPages.includes(item.page);
            }).map((item) => {
              if (item.isSubmenu) {
                const isExpanded = expandedMenus[item.id];
                const IconComp = iconMap[item.icon] || Users;
                const isSubActive = item.subItems.some((sub) => activeItem === sub.id);

                return (
                  <div key={item.id}>
                    {/* Parent Menu Item */}
                    <div
                      className={`sidebar-item ${isSubActive && !isExpanded ? 'active' : ''}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleSubmenu(item.id)}
                      title={item.label}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="icon"><IconComp size={16} /></span>
                        {!collapsed && <span>{item.label}</span>}
                      </div>
                      {!collapsed && (
                        <span style={{ display: 'flex', alignItems: 'center', marginRight: '4px' }}>
                          {isExpanded ? <ChevronDown size={14} style={{ opacity: 0.7 }} /> : <ChevronRight size={14} style={{ opacity: 0.7 }} />}
                        </span>
                      )}
                    </div>

                    {/* Submenu Items (Branches) */}
                    {(isExpanded || collapsed) && (
                      <div style={{
                        paddingLeft: collapsed ? '0' : '12px',
                        borderLeft: collapsed ? 'none' : '2px solid rgba(255, 255, 255, 0.08)',
                        marginLeft: collapsed ? '0' : '22px',
                        marginTop: '2px',
                        marginBottom: '4px',
                      }}>
                        {item.subItems.filter(sub => allowedPages.includes(sub.page)).map((sub) => {
                          const SubIcon = iconMap[sub.icon] || Users;
                          return (
                            <div
                              key={sub.id}
                              className={`sidebar-item ${activeItem === sub.id ? 'active' : ''}`}
                              onClick={() => onMenuClick(sub)}
                              title={sub.label}
                              style={{
                                margin: '2px 4px',
                                paddingLeft: collapsed ? '16px' : '10px',
                              }}
                            >
                              <span className="icon"><SubIcon size={14} /></span>
                              {!collapsed && <span style={{ fontSize: '0.78rem' }}>{sub.label}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const IconComp = iconMap[item.icon] || Users;
              return (
                <div
                  key={item.id}
                  className={`sidebar-item ${activeItem === item.id ? 'active' : ''}`}
                  onClick={() => onMenuClick(item)}
                  title={item.label}
                >
                  <span className="icon"><IconComp size={16} /></span>
                  {!collapsed && <span>{item.label}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
};

export default Sidebar;

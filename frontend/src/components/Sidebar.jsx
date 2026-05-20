import React from 'react';
import { menuItems } from '../data/mockData';
import {
  Users, Handshake, UserPlus, UserMinus, ArrowLeftRight,
  Receipt, DollarSign, Building2, Package, UserCog,
  BarChart3, Download, LayoutDashboard,
  Menu, Bot
} from 'lucide-react';

const iconMap = {
  Users, Handshake, UserPlus, UserMinus, ArrowLeftRight,
  Receipt, DollarSign, Building2, Package, UserCog,
  BarChart3, Download, LayoutDashboard, Menu, Bot
};

const Sidebar = ({ collapsed, onToggle, onMenuClick, activeItem, allowedPages = [] }) => {
  return (
    <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo Area */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: collapsed ? '14px 8px' : '14px 16px',
        borderBottom: '1px solid #e3e6f0',
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
            color: '#5E6E82',
            marginRight: collapsed ? 0 : '12px',
            transition: 'color 0.2s'
          }}
          title="Menu de Navegação"
        >
          <Menu size={20} />
        </button>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', animation: 'fadeIn 0.3s ease' }}>
            <svg width="32" height="32" viewBox="0 0 100 100" style={{ marginRight: '6px' }}>
              <circle cx="50" cy="50" r="45" fill="#3a5a8c" />
              <path d="M35 25 Q35 75 65 75 Q45 75 45 50 Q45 25 65 25 Q35 25 35 25Z" fill="white" />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{ fontWeight: 600, fontSize: '1.1rem', color: '#4979bb', fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.5px' }}>
                Don Cor
                <span style={{ fontSize: '0.6rem', fontWeight: 400, color: '#e6832a', marginLeft: '4px' }}>WEB</span>
              </span>
              <span style={{ fontSize: '0.55rem', color: '#8a8d93', fontWeight: 400, marginTop: '1px' }}>
                Gestão de Apólices - Don Cor
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div style={{ overflowY: 'auto', overflowX: 'hidden', height: 'calc(100vh - 56px)', padding: '8px 0' }}>
        {/* Dashboard item */}
        <div style={{ padding: '0 0 4px 0' }}>
          <div
            className={`sidebar-item ${activeItem === 'dashboard' ? 'active' : ''}`}
            onClick={() => onMenuClick({ id: 'dashboard', label: 'Dashboard do Usuário', icon: 'LayoutDashboard', page: 'dashboard' })}
            title="Dashboard do Usuário"
          >
            <span className="icon">
              <LayoutDashboard size={16} />
            </span>
            {!collapsed && <span>Dashboard</span>}
          </div>
        </div>

        {menuItems.map((section, sIdx) => (
          <div key={sIdx}>
            {!collapsed && (
              <>
                <div className="sidebar-section-label">{section.section}</div>
                <div className="sidebar-divider"><hr /></div>
              </>
            )}
            {collapsed && <div style={{ borderTop: '1px solid #e3e6f0', margin: '8px 12px' }} />}
            {section.items.filter((item) => allowedPages.includes(item.page)).map((item) => {
              const IconComp = iconMap[item.icon] || Users;
              return (
                <div
                  key={item.id}
                  className={`sidebar-item ${activeItem === item.id ? 'active' : ''}`}
                  onClick={() => onMenuClick(item)}
                  title={item.label}
                >
                  <span className="icon">
                    <IconComp size={16} />
                  </span>
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

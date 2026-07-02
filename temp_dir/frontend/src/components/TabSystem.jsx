import React from 'react';
import { X, RefreshCw, LayoutDashboard, Users, Handshake, UserPlus, UserMinus, ArrowLeftRight, Receipt, DollarSign, Building2, Package, UserCog, BarChart3, Download } from 'lucide-react';

const iconMap = {
  LayoutDashboard, Users, Handshake, UserPlus, UserMinus, ArrowLeftRight,
  Receipt, DollarSign, Building2, Package, UserCog, BarChart3, Download
};

const TabSystem = ({ tabs, activeTab, onTabClick, onTabClose, onRefresh }) => {
  return (
    <div className="tab-bar">
      {tabs.map((tab) => {
        const IconComp = iconMap[tab.icon] || LayoutDashboard;
        const isActive = activeTab === tab.id;
        return (
          <div
            key={tab.id}
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabClick(tab.id)}
          >
            <IconComp size={13} style={{ marginRight: '6px', flexShrink: 0 }} />
            <span>{tab.label}</span>
            {tab.closable && (
              <span
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                <X size={12} />
              </span>
            )}
          </div>
        );
      })}
      <div className="tab-refresh" onClick={onRefresh} title="Recarregar tela selecionada">
        <RefreshCw size={14} />
      </div>
    </div>
  );
};

export default TabSystem;

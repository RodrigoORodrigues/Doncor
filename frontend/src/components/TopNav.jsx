import React from 'react';
import { currentUser, saldoVidas } from '../data/mockData';
import {
  Menu, Bell, Search, Lightbulb, Signal, ChevronDown,
  User, Settings, LogOut, HelpCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';

const TopNav = ({ onToggleSidebar, sidebarCollapsed }) => {
  return (
    <div className="top-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {sidebarCollapsed && (
          <button
            onClick={onToggleSidebar}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '4px',
              color: '#5E6E82'
            }}
          >
            <Menu size={20} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Latency Indicator */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '35px',
            height: '35px',
            background: 'transparent',
            border: '1px solid #d8e2ef',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#5E6E82',
            transition: 'all 0.2s'
          }}
          title="Latência do Sistema"
        >
          <div style={{
            width: '16px',
            height: '16px',
            borderLeft: '2px solid #666',
            borderRight: '2px solid #666',
            borderBottom: '2px solid #666',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end'
          }}>
            <div style={{ width: '100%', height: '100%', backgroundColor: '#27ae60' }} />
          </div>
        </button>

        {/* Tour button */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '35px',
            height: '35px',
            background: 'transparent',
            border: '1px solid #d8e2ef',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#5E6E82',
            transition: 'all 0.2s'
          }}
          title="Exibir Tour"
        >
          <Lightbulb size={16} />
        </button>

        <div style={{ width: '1px', height: '24px', background: 'rgba(44,123,229,0.2)', margin: '0 4px' }} />

        {/* Notifications */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '35px',
            height: '35px',
            background: 'transparent',
            border: '1px solid #d8e2ef',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#5E6E82',
            position: 'relative',
            transition: 'all 0.2s'
          }}
          title="Notificações"
        >
          <Bell size={16} />
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: '#e63757',
            color: '#fff',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.6rem',
            fontWeight: 700
          }}>
            3
          </span>
        </button>

        {/* Saldo Vidas */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#fff',
          border: '1px solid #d8e2ef',
          borderRadius: '6px',
          padding: '4px 12px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#5E6E82', marginRight: '6px' }}>Vidas:</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2C7BE5' }}>{saldoVidas.percentual_total}%</span>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'rgba(44,123,229,0.2)', margin: '0 4px' }} />

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#4979bb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#344050', lineHeight: 1.2 }}>
                  {currentUser.name.split(' ').slice(0, 2).join(' ')}
                </div>
                <div style={{ fontSize: '0.62rem', color: '#8a8d93' }}>
                  {currentUser.role}
                </div>
              </div>
              <ChevronDown size={14} color="#5E6E82" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" style={{ minWidth: '200px' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f2f5' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#344050' }}>{currentUser.name}</div>
              <div style={{ fontSize: '0.7rem', color: '#8a8d93' }}>{currentUser.email}</div>
              <div style={{ fontSize: '0.65rem', color: '#8a8d93', marginTop: '2px' }}>{currentUser.company}</div>
            </div>
            <DropdownMenuItem style={{ cursor: 'pointer', fontSize: '0.8rem' }}>
              <User size={14} style={{ marginRight: '8px' }} /> Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem style={{ cursor: 'pointer', fontSize: '0.8rem' }}>
              <Settings size={14} style={{ marginRight: '8px' }} /> Configurações
            </DropdownMenuItem>
            <DropdownMenuItem style={{ cursor: 'pointer', fontSize: '0.8rem' }}>
              <HelpCircle size={14} style={{ marginRight: '8px' }} /> Suporte
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#e63757' }}>
              <LogOut size={14} style={{ marginRight: '8px' }} /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TopNav;

import React, { useState, useEffect } from 'react';
import { fetchSaldoVidas, fetchNotifications, markNotificationRead } from '../services/api';
import {
  Menu, Bell, Lightbulb, ChevronDown,
  User, Settings, LogOut, HelpCircle, MessageCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const TopNav = ({ onToggleSidebar, sidebarCollapsed, onMenuClick, onLogout, session }) => {
  const [saldoVidas, setSaldoVidas] = useState({ percentual_total: 0 });
  const [notifications, setNotifications] = useState([]);
  const userName = session?.username || 'Usuário';
  const userData = {
    name: userName,
    email: `${userName.toLowerCase()}@doncor.local`,
    role: session?.role || 'Colaborador',
    company: 'Don Cor'
  };

  useEffect(() => {
    fetchSaldoVidas().then(setSaldoVidas).catch(console.error);
    if (session?.documento) {
        fetchNotifications(session.documento).then(setNotifications).catch(console.error);
    }
  }, [session]);

  const openChat = () => {
    onMenuClick?.({ id: 'chat', label: 'Chat', icon: 'MessageCircle', page: 'chat' });
  };

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
        <div
          title="Sistema Online"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '9999px',
            padding: '4px 10px'
          }}
        >
          <div className="animate-pulse" style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669' }}>Online</span>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'rgba(44,123,229,0.2)', margin: '0 4px' }} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
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
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  background: '#e63757',
                  color: '#fff',
                  borderRadius: '50%',
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6rem',
                  fontWeight: 700
                }}>
                  {notifications.length > 99 ? '99+' : notifications.length}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" style={{ minWidth: '300px', maxHeight: '400px', overflowY: 'auto' }}>
            <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: '0.8rem', borderBottom: '1px solid #f0f2f5' }}>Notificações</div>
            {notifications.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '0.8rem', color: '#8a8d93' }}>Nenhuma notificação nova</div>
            ) : (
              notifications.map(n => (
                <DropdownMenuItem key={n.id} style={{ cursor: 'pointer', fontSize: '0.8rem', display: 'flex', gap: '8px', alignItems: 'center' }} onClick={() => {
                  markNotificationRead(n.id).then(() => {
                    setNotifications(prev => prev.filter(item => item.id !== n.id));
                  });
                  if (n.type === 'chat') openChat();
                }}>
                  {n.type === 'chat' && <MessageCircle size={14} color="#2C7BE5" />}
                  {n.type === 'inclusao' && <div style={{width: 8, height: 8, borderRadius: '50%', background: '#10B981'}} />}
                  {n.type === 'exclusao' && <div style={{width: 8, height: 8, borderRadius: '50%', background: '#DC2626'}} />}
                  {n.type === 'transferencia' && <div style={{width: 8, height: 8, borderRadius: '50%', background: '#F59E0B'}} />}
                  <span>{n.text}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

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
                {userData.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#344050', lineHeight: 1.2 }}>
                  {userData.name.split(' ').slice(0, 2).join(' ')}
                </div>
                <div style={{ fontSize: '0.62rem', color: '#8a8d93' }}>
                  {userData.role}
                </div>
              </div>
              <ChevronDown size={14} color="#5E6E82" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" style={{ minWidth: '200px' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f2f5' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#344050' }}>{userData.name}</div>
              <div style={{ fontSize: '0.7rem', color: '#8a8d93' }}>{userData.email}</div>
              <div style={{ fontSize: '0.65rem', color: '#8a8d93', marginTop: '2px' }}>{userData.company}</div>
            </div>
            <DropdownMenuItem
              style={{ cursor: 'pointer', fontSize: '0.8rem' }}
              onClick={() => onMenuClick?.({ id: 'perfil', label: 'Meu Perfil', icon: 'User', page: 'perfil' })}
            >
              <User size={14} style={{ marginRight: '8px' }} /> Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              style={{ cursor: 'pointer', fontSize: '0.8rem' }}
              onClick={() => onMenuClick?.({ id: 'configuracoes', label: 'Configurações', icon: 'Settings', page: 'configuracoes' })}
            >
              <Settings size={14} style={{ marginRight: '8px' }} /> Configurações
            </DropdownMenuItem>
            <DropdownMenuItem
              style={{ cursor: 'pointer', fontSize: '0.8rem' }}
              onClick={() => onMenuClick?.({ id: 'suporte', label: 'Suporte', icon: 'HelpCircle', page: 'suporte' })}
            >
              <HelpCircle size={14} style={{ marginRight: '8px' }} /> Suporte
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#e63757' }} onClick={onLogout}>
              <LogOut size={14} style={{ marginRight: '8px' }} /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TopNav;

import React, { useState, useEffect, useMemo } from 'react';
import { fetchSaldoVidas, fetchPortalDonCorChat, markPortalDonCorChatRead } from '../services/api';
import {
  Menu, Bell, Lightbulb, ChevronDown,
  User, Settings, LogOut, HelpCircle, Paperclip
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

const TopNav = ({ onToggleSidebar, sidebarCollapsed, onMenuClick, onLogout, session }) => {
  const [saldoVidas, setSaldoVidas] = useState({ percentual_total: 0 });
  const [chatUnread, setChatUnread] = useState(() => Number(localStorage.getItem('doncor_chat_unread') || 0));
  const userName = session?.username || 'Usuário';

  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);

  const loadNotifications = async () => {
    try {
      const chat = await fetchPortalDonCorChat({});
      // Filter only movement notifications (messages that have a 'protocolo' field)
      const movementNotifications = (chat || []).filter(item => item.protocolo);
      setNotifications(movementNotifications);
    } catch (e) {
      console.error("Erro ao carregar notificações no TopNav:", e);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  const notificationUnreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await markPortalDonCorChatRead({ id });
      loadNotifications();
    } catch (e) {
      console.error("Erro ao marcar notificação como lida:", e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markPortalDonCorChatRead({ all_notifications: true });
      loadNotifications();
    } catch (e) {
      console.error("Erro ao marcar todas as notificações como lidas:", e);
    }
  };

  const handleProtocolClick = (item) => {
    setSelectedNotification(item);
    if (!item.read) {
      handleMarkAsRead(item.id);
    }
  };

  const [brokerProfile, setBrokerProfile] = useState(() => {
    const cached = localStorage.getItem('doncor_profile_broker');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.nome) return parsed;
      } catch (e) {}
    }
    return {
      nome: userName,
      email: `${userName.toLowerCase()}@doncor.local`,
      logo: ''
    };
  });

  const userData = {
    name: brokerProfile.nome,
    email: brokerProfile.email,
    company: 'Don Cor'
  };

  useEffect(() => {
    fetchSaldoVidas().then(setSaldoVidas).catch(console.error);
  }, []);

  useEffect(() => {
    const handleProfileUpdate = () => {
      const cached = localStorage.getItem('doncor_profile_broker');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.nome) {
            setBrokerProfile(parsed);
          }
        } catch (e) {}
      }
    };
    window.addEventListener('doncor-profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('doncor-profile-updated', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    const updateUnread = (event) => {
      const count = event?.detail?.count;
      setChatUnread(Number.isFinite(Number(count)) ? Number(count) : Number(localStorage.getItem('doncor_chat_unread') || 0));
    };
    window.addEventListener('doncor-chat-unread', updateUnread);
    window.addEventListener('storage', updateUnread);
    return () => {
      window.removeEventListener('doncor-chat-unread', updateUnread);
      window.removeEventListener('storage', updateUnread);
    };
  }, []);

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
              aria-label="bell-btn"
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
                color: notificationUnreadCount > 0 ? '#2C7BE5' : '#5E6E82',
                position: 'relative',
                transition: 'all 0.2s'
              }}
              title={notificationUnreadCount > 0 ? `${notificationUnreadCount} nova(s) movimentação(ões)` : 'Notificações de Movimentações'}
            >
              <Bell size={16} />
              {notificationUnreadCount > 0 && (
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
                  {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" style={{ width: '400px', maxHeight: '480px', overflowY: 'auto', padding: '12px', background: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #d8e2ef', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #f0f2f5', paddingBottom: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#344050' }}>Notificações de Movimentações</span>
              {notificationUnreadCount > 0 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleMarkAllAsRead(); }} 
                  style={{ background: 'none', border: 'none', color: '#2C7BE5', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div style={{ padding: '24px 8px', textAlign: 'center', color: '#8a8d93', fontSize: '0.8rem', fontStyle: 'italic' }}>
                Nenhuma notificação de movimentação.
              </div>
            ) : (
              notifications.map((item) => (
                <div key={item.id} style={{ padding: '10px', borderBottom: '1px solid #f8fafc', borderRadius: '6px', background: !item.read ? '#eff6ff' : 'transparent', marginBottom: '4px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleProtocolClick(item); }}
                      style={{ background: 'none', border: 'none', color: '#2C7BE5', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', padding: 0, textDecoration: 'underline', textAlign: 'left' }}
                    >
                      Protocolo: {item.protocolo}
                    </button>
                    <span style={{ fontSize: '0.65rem', color: '#8a8d93' }}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : ''}</span>
                  </div>
                  <p style={{ margin: '4px 0', fontSize: '0.78rem', color: '#344050', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</p>
                  
                  {item.attachments && item.attachments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                      {item.attachments.map((att, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                          <Paperclip size={12} color="#5e6e82" />
                          {att.base64 ? (
                            <a
                              href={att.base64.startsWith('data:') ? att.base64 : `data:${att.type || 'application/octet-stream'};base64,${att.base64}`}
                              download={att.name}
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: '#2C7BE5', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}
                            >
                              {att.name}
                            </a>
                          ) : (
                            <span style={{ color: '#5e6e82', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>{att.name}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!item.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMarkAsRead(item.id); }}
                      style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#8a8d93', fontSize: '0.65rem', cursor: 'pointer' }}
                    >
                      ✓ Lido
                    </button>
                  )}
                </div>
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
              {brokerProfile.logo ? (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#fff',
                  border: '1px solid #d8e2ef',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  padding: '2px'
                }}>
                  <img src={brokerProfile.logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              ) : (
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
              )}
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#344050', lineHeight: 1.2 }}>
                  {userData.name.split(' ').slice(0, 2).join(' ')}
                </div>
              </div>
              <ChevronDown size={14} color="#5E6E82" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" style={{ minWidth: '220px' }}>
            <div style={{ padding: '12px', borderBottom: '1px solid #f0f2f5', display: 'flex', gap: '10px', alignItems: 'center' }}>
              {brokerProfile.logo ? (
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#fff',
                  border: '1px solid #d8e2ef',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  padding: '3px',
                  flexShrink: 0
                }}>
                  <img src={brokerProfile.logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              ) : (
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#e0ebf7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2C7BE5',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {userData.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#344050', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{userData.name}</div>
                <div style={{ fontSize: '0.7rem', color: '#8a8d93', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{userData.email}</div>
              </div>
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

      {/* Dialog Detalhes do Protocolo */}
      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent style={{ maxWidth: '550px' }}>
          <DialogHeader>
            <DialogTitle>📄 Detalhes da Notificação ({selectedNotification?.protocolo})</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.82rem', color: '#344050', margin: '14px 0' }}>
            <div>
              <span style={{ color: '#8a8d93', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Protocolo</span>
              <div style={{ fontWeight: 800, color: '#2C7BE5', fontSize: '0.95rem', marginTop: 2 }}>{selectedNotification?.protocolo}</div>
            </div>
            <div>
              <span style={{ color: '#8a8d93', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Data Notificação</span>
              <div style={{ fontWeight: 600, marginTop: 2 }}>{selectedNotification?.createdAt ? new Date(selectedNotification.createdAt).toLocaleString('pt-BR') : '-'}</div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#8a8d93', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Empresa</span>
              <div style={{ fontWeight: 600, marginTop: 2 }}>{selectedNotification?.empresa || selectedNotification?.company || '-'}</div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#8a8d93', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Detalhes</span>
              <div style={{ marginTop: 2, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{selectedNotification?.text}</div>
            </div>

            {/* Anexos */}
            {selectedNotification?.attachments && selectedNotification.attachments.length > 0 && (
              <div style={{ gridColumn: 'span 2', marginTop: '8px' }}>
                <span style={{ color: '#8a8d93', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Documentos Anexados</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedNotification.attachments.map((att, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <Paperclip size={14} color="#2C7BE5" />
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.base64 ? (
                          <a
                            href={att.base64.startsWith('data:') ? att.base64 : `data:${att.type || 'application/octet-stream'};base64,${att.base64}`}
                            download={att.name}
                            style={{ color: '#2C7BE5', fontWeight: 700, textDecoration: 'underline' }}
                          >
                            {att.name}
                          </a>
                        ) : (
                          <span style={{ color: '#344050', fontWeight: 600 }}>{att.name}</span>
                        )}
                        {att.size ? <span style={{ color: '#8a8d93', fontSize: '0.72rem', marginLeft: '6px' }}>({(att.size / 1024).toFixed(0)} KB)</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setSelectedNotification(null)} style={{ background: '#2C7BE5', color: '#fff' }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TopNav;

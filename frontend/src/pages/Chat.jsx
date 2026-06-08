import React, { useEffect, useMemo, useState } from 'react';
import { Building2, MessageCircle, Paperclip, Send, Bell, CheckCheck } from 'lucide-react';
import { fetchContratosEmpresarial } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const STORAGE_MESSAGES = 'doncor_chat_messages';
const STORAGE_UNREAD = 'doncor_chat_unread';

const defaultCompanies = ['Tech Solutions Ltda', 'Global Commerce SA', 'Indústria ABC ME'];

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const saveUnread = (count) => {
  localStorage.setItem(STORAGE_UNREAD, String(count));
  window.dispatchEvent(new CustomEvent('doncor-chat-unread', { detail: { count } }));
};

const Chat = ({ session }) => {
  const [companies, setCompanies] = useState(defaultCompanies);
  const [selectedCompany, setSelectedCompany] = useState(defaultCompanies[0]);
  const [messages, setMessages] = useState(() => readJson(STORAGE_MESSAGES, []));
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);

  const userRole = session?.role || 'Usuário';
  const userName = session?.username || 'Usuário';

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const contratos = await fetchContratosEmpresarial('', 'todos');
        const names = Array.from(new Set((contratos || []).map((item) => item.empresa).filter(Boolean)));
        if (names.length) {
          setCompanies(names);
          setSelectedCompany((current) => current || names[0]);
        }
      } catch (error) {
        console.error(error);
      }
    };
    loadCompanies();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(messages));
    const unread = messages.filter((item) => item.direction === 'incoming' && !item.read).length;
    saveUnread(unread);
  }, [messages]);

  const companyMessages = useMemo(
    () => messages.filter((item) => item.company === selectedCompany),
    [messages, selectedCompany]
  );

  const unreadByCompany = useMemo(() => {
    return messages.reduce((acc, item) => {
      if (item.direction === 'incoming' && !item.read) acc[item.company] = (acc[item.company] || 0) + 1;
      return acc;
    }, {});
  }, [messages]);

  const sendMessage = () => {
    if (!selectedCompany || (!message.trim() && !attachment)) return;
    const next = {
      id: `${Date.now()}-${Math.random()}`,
      company: selectedCompany,
      text: message.trim(),
      attachmentName: attachment?.name || '',
      attachmentSize: attachment?.size || 0,
      sender: `${userName} (${userRole})`,
      direction: 'outgoing',
      read: true,
      createdAt: new Date().toISOString(),
    };
    setMessages((items) => [...items, next]);
    setMessage('');
    setAttachment(null);
  };

  const simulateIncoming = () => {
    if (!selectedCompany) return;
    const next = {
      id: `${Date.now()}-${Math.random()}`,
      company: selectedCompany,
      text: 'Nova mensagem recebida da empresa cadastrada.',
      attachmentName: '',
      attachmentSize: 0,
      sender: selectedCompany,
      direction: 'incoming',
      read: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((items) => [...items, next]);
  };

  const markSelectedAsRead = () => {
    setMessages((items) => items.map((item) => item.company === selectedCompany ? { ...item, read: true } : item));
  };

  const formatDate = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const formatSize = (size) => size ? `${Math.max(size / 1024, 1).toFixed(0)} KB` : '';

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#2C7BE515', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <MessageCircle size={18} color="#2C7BE5" />
          </div>
          <div>
            <h2 style={{ fontSize:'1.1rem', fontWeight:600, color:'#344050', margin:0 }}>Chat</h2>
            <p style={{ fontSize:'0.72rem', color:'#8a8d93', margin:0 }}>Comunicação da gerência e diretoria com empresas cadastradas</p>
          </div>
        </div>
        <Button onClick={markSelectedAsRead} variant="outline" style={{ fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'6px' }}>
          <CheckCheck size={14}/>Marcar como lidas
        </Button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:'14px' }}>
        <div style={{ background:'#fff', borderRadius:'10px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', padding:'12px', minHeight:'520px' }}>
          <div style={{ fontWeight:700, color:'#344050', marginBottom:'10px', display:'flex', alignItems:'center', gap:'6px' }}>
            <Building2 size={15}/> Empresas
          </div>
          {companies.map((name) => (
            <button
              key={name}
              onClick={() => setSelectedCompany(name)}
              style={{
                width:'100%', textAlign:'left', border:'1px solid #e3e6f0', borderRadius:'8px', background:selectedCompany === name ? '#eef4fb' : '#fff',
                padding:'10px', marginBottom:'8px', cursor:'pointer', color:'#344050', display:'flex', justifyContent:'space-between', alignItems:'center'
              }}
            >
              <span style={{ fontSize:'0.85rem', fontWeight:600 }}>{name}</span>
              {!!unreadByCompany[name] && <span style={{ background:'#e63757', color:'#fff', borderRadius:'999px', fontSize:'0.68rem', padding:'2px 7px' }}>{unreadByCompany[name]}</span>}
            </button>
          ))}
        </div>

        <div style={{ background:'#fff', borderRadius:'10px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', minHeight:'520px', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid #e3e6f0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontWeight:700, color:'#344050' }}>{selectedCompany}</div>
              <div style={{ fontSize:'0.72rem', color:'#8a8d93' }}>Canal exclusivo para mensagens, documentos e avisos</div>
            </div>
            <Button onClick={simulateIncoming} variant="outline" style={{ fontSize:'0.75rem', display:'flex', gap:'6px' }}>
              <Bell size={13}/>Simular nova mensagem
            </Button>
          </div>

          <div style={{ flex:1, padding:'16px', overflowY:'auto', background:'#f7f9fc' }}>
            {companyMessages.length === 0 ? (
              <div style={{ color:'#8a8d93', textAlign:'center', marginTop:'80px' }}>Nenhuma conversa iniciada com esta empresa.</div>
            ) : companyMessages.map((item) => (
              <div key={item.id} style={{ display:'flex', justifyContent:item.direction === 'outgoing' ? 'flex-end' : 'flex-start', marginBottom:'10px' }}>
                <div style={{ maxWidth:'70%', background:item.direction === 'outgoing' ? '#2C7BE5' : '#fff', color:item.direction === 'outgoing' ? '#fff' : '#344050', border:'1px solid #e3e6f0', borderRadius:'12px', padding:'10px 12px' }}>
                  <div style={{ fontSize:'0.68rem', opacity:0.8, marginBottom:'4px' }}>{item.sender} • {formatDate(item.createdAt)}</div>
                  {item.text && <div style={{ fontSize:'0.88rem', lineHeight:1.35 }}>{item.text}</div>}
                  {item.attachmentName && (
                    <div style={{ marginTop:'8px', display:'flex', alignItems:'center', gap:'6px', fontSize:'0.78rem', fontWeight:600 }}>
                      <Paperclip size={13}/>{item.attachmentName} {formatSize(item.attachmentSize)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding:'14px', borderTop:'1px solid #e3e6f0' }}>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Digite a mensagem para a empresa cadastrada..."
              style={{ width:'100%', minHeight:'80px', border:'1px solid #d8e2ef', borderRadius:'8px', padding:'10px 12px', resize:'vertical', fontFamily:'inherit', fontSize:'0.86rem' }}
            />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', marginTop:'10px' }}>
              <label style={{ border:'1px solid #d8e2ef', borderRadius:'8px', padding:'8px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', color:'#344050', fontSize:'0.8rem' }}>
                <Paperclip size={14}/> {attachment ? attachment.name : 'Anexar documento'}
                <Input type="file" onChange={(event) => setAttachment(event.target.files?.[0] || null)} style={{ display:'none' }} />
              </label>
              <Button onClick={sendMessage} style={{ background:'#2C7BE5', color:'#fff', display:'flex', alignItems:'center', gap:'6px' }}>
                <Send size={14}/>Enviar mensagem
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;

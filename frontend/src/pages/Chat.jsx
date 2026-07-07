import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, MessageCircle, Paperclip, Send, Bell, CheckCheck } from 'lucide-react';
import { fetchContratosEmpresarial, fetchPortalParceiros, fetchPortalDonCorChat, sendPortalDonCorChat, markPortalDonCorChatRead } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const STORAGE_UNREAD = 'doncor_chat_unread';
const CHAT_REFRESH_MS = 30000;

const defaultCompanies = [];

const saveUnread = (count) => {
  localStorage.setItem(STORAGE_UNREAD, String(count));
  window.dispatchEvent(new CustomEvent('doncor-chat-unread', { detail: { count } }));
};

const Chat = ({ session }) => {
  const [companies, setCompanies] = useState(defaultCompanies);
  const [selectedCompany, setSelectedCompany] = useState(defaultCompanies[0]);
  const [companyDocuments, setCompanyDocuments] = useState({});
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(false);

  const userRole = session?.role || 'Usuário';
  const userName = session?.username || 'Usuário';

  const loadChatData = useCallback(async () => {
    setLoading(true);
    try {
      const [contratos, parceiros, chat] = await Promise.all([
        fetchContratosEmpresarial('', 'todos'),
        fetchPortalParceiros('', 'todos'),
        fetchPortalDonCorChat({}),
      ]);
      const documents = {};
      const names = [];
      const addCompany = (name, documento = '') => {
        const cleanName = String(name || '').trim();
        if (!cleanName) return;
        if (!names.includes(cleanName)) names.push(cleanName);
        if (documento) documents[cleanName] = documento;
      };

      (parceiros || []).forEach((item) => addCompany(item.empresa || item.nome, item.documento));
      (chat || []).forEach((item) => addCompany(item.empresa || item.company, item.documento));
      (contratos || []).forEach((item) => addCompany(item.empresa, item.cnpj));

      setMessages(chat || []);
      setCompanyDocuments(documents);
      if (names.length) {
        setCompanies(names);
        setSelectedCompany((current) => names.includes(current) ? current : names[0]);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadChatData();
    const timer = setInterval(loadChatData, CHAT_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadChatData]);

  useEffect(() => {
    const unread = messages.filter((item) => item.direction === 'incoming' && !item.read).length;
    saveUnread(unread);
  }, [messages]);

  const companyMessages = useMemo(
    () => messages.filter((item) => (item.company || item.empresa) === selectedCompany),
    [messages, selectedCompany]
  );

  const unreadByCompany = useMemo(() => {
    return messages.reduce((acc, item) => {
      const company = item.company || item.empresa;
      if (item.direction === 'incoming' && !item.read && company) acc[company] = (acc[company] || 0) + 1;
      return acc;
    }, {});
  }, [messages]);

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const sendMessage = async () => {
    if (!selectedCompany || (!message.trim() && !attachment)) return;
    if (attachment && attachment.size > 2 * 1024 * 1024) {
      alert('O tamanho máximo do anexo é de 2MB. Por favor, escolha um arquivo menor.');
      return;
    }
    
    try {
      let attachmentData = null;
      if (attachment) {
        attachmentData = { name: attachment.name, size: attachment.size, type: attachment.type, category: 'Chat', base64: await fileToBase64(attachment) };
      }
      
      const saved = await sendPortalDonCorChat({
        documento: companyDocuments[selectedCompany] || '',
        empresa: selectedCompany,
        text: message.trim(),
        attachmentName: attachment?.name || '',
        attachmentSize: attachment?.size || 0,
        attachments: attachmentData ? [attachmentData] : [],
        sender: `${userName} (${userRole})`,
        senderRole: 'corretor',
      });
      setMessages((items) => [...items, saved]);
      setMessage('');
      setAttachment(null);
    } catch(e) {
      console.error(e);
      alert('Erro ao enviar mensagem');
    }
  };

  const markSelectedAsRead = async () => {
    if (!selectedCompany) return;
    await markPortalDonCorChatRead({ documento: companyDocuments[selectedCompany] || '', empresa: selectedCompany });
    setMessages((items) => items.map((item) => (item.company === selectedCompany || item.empresa === selectedCompany) ? { ...item, read: true } : item));
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
          {companies.length === 0 ? (
            <div style={{ padding: '24px 8px', textAlign: 'center', color: '#8a8d93', fontSize: '0.8rem', fontStyle: 'italic' }}>
              Nenhuma empresa encontrada com histórico de chat.
            </div>
          ) : companies.map((name) => (
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
              <div style={{ fontWeight:700, color:'#344050' }}>{selectedCompany || "Nenhuma Empresa Selecionada"}</div>
              <div style={{ fontSize:'0.72rem', color:'#8a8d93' }}>Canal exclusivo para mensagens, documentos e avisos</div>
            </div>
            <Button onClick={loadChatData} variant="outline" style={{ fontSize:'0.75rem', display:'flex', gap:'6px' }}>
              <Bell size={13}/>{loading ? 'Atualizando...' : 'Atualizar'}
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
                  {item.attachments && item.attachments.length > 0 ? (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {item.attachments.map((att, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                          <Paperclip size={13}/>
                          {att.base64 ? (
                            <a 
                              href={att.base64.startsWith('data:') ? att.base64 : `data:${att.type || 'application/octet-stream'};base64,${att.base64}`} 
                              download={att.name} 
                              style={{ color: 'inherit', textDecoration: 'underline' }}
                            >
                              {att.name}
                            </a>
                          ) : (
                            <span>{att.name}</span>
                          )}
                          {att.size ? <span>({(att.size / 1024).toFixed(0)} KB)</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : item.attachmentName ? (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                      <Paperclip size={13}/>
                      <span>{item.attachmentName}</span>
                      {formatSize(item.attachmentSize)}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding:'14px', borderTop:'1px solid #e3e6f0' }}>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={!selectedCompany}
              placeholder={selectedCompany ? "Digite a mensagem para a empresa cadastrada..." : "Selecione uma empresa para iniciar a conversa..."}
              style={{ width:'100%', minHeight:'80px', border:'1px solid #d8e2ef', borderRadius:'8px', padding:'10px 12px', resize:'vertical', fontFamily:'inherit', fontSize:'0.86rem', background: !selectedCompany ? '#f1f5f9' : '#fff' }}
            />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', marginTop:'10px' }}>
              <label style={{ border:'1px solid #d8e2ef', borderRadius:'8px', padding:'8px 12px', cursor: selectedCompany ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', gap:'6px', color:'#344050', fontSize:'0.8rem', opacity: selectedCompany ? 1 : 0.5 }}>
                <Paperclip size={14}/> {attachment ? attachment.name : 'Anexar documento'}
                <Input type="file" disabled={!selectedCompany} onChange={(event) => setAttachment(event.target.files?.[0] || null)} style={{ display:'none' }} />
              </label>
              <Button onClick={sendMessage} disabled={!selectedCompany} style={{ background:'#2C7BE5', color:'#fff', display:'flex', alignItems:'center', gap:'6px', opacity: selectedCompany ? 1 : 0.5 }}>
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

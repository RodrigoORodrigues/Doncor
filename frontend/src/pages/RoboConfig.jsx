import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Save, ShieldCheck, KeyRound, Globe, ServerCog, Plus, Trash2 } from 'lucide-react';
import { fetchRoboConfig, saveRoboConfig } from '../services/api';

const emptyOperadora = {
  nome: '',
  url: '',
  usuario: '',
  senha: '',
  selectors: {
    usuario: '',
    senha: '',
    entrar: '',
    boleto: '',
  },
  initialWaitMs: 20000,
  fieldTimeoutMs: 90000,
  loginWaitMs: 10000,
};

const normalizeOperadora = (op = {}) => ({
  ...emptyOperadora,
  ...op,
  selectors: {
    ...emptyOperadora.selectors,
    ...(op.selectors || {}),
  },
});

const inputStyle = {
  border: '1px solid #d8e2ef',
  borderRadius: '6px',
  padding: '8px',
  width: '100%',
};

const labelStyle = {
  fontSize: '0.78rem',
  color: '#5E6E82',
  display: 'grid',
  gap: '5px',
};

const RoboConfig = () => {
  const [config, setConfig] = useState({
    intervaloMinutos: 15,
    tentativas: 3,
    notificacoes: true,
    modoSeguro: true,
    ambienteExecucao: 'backend_fastapi',
    triggerEndpoint: '/api/v1/trigger-rpa',
    rpaServiceUrl: '',
    timeoutSegundos: 120,
    operadoras: [{ ...emptyOperadora }],
    supabaseUrl: '',
    supabaseServiceRoleKey: '',
    supabaseBucketBoletos: 'boletos',
    logNivel: 'INFO',
  });

  useEffect(() => {
    fetchRoboConfig().then((data) => {
      if (data && Object.keys(data).length) {
        setConfig((prev) => ({
          ...prev,
          ...data,
          operadoras: data.operadoras?.length
            ? data.operadoras.map(normalizeOperadora)
            : prev.operadoras,
        }));
      }
    }).catch(console.error);
  }, []);

  const requiredFields = useMemo(() => {
    const base = ['supabaseUrl', 'supabaseServiceRoleKey'];
    if (config.ambienteExecucao === 'edge_function') return [...base, 'triggerEndpoint'];
    if (config.ambienteExecucao === 'backend_fastapi') return [...base, 'triggerEndpoint'];
    return [...base, 'rpaServiceUrl'];
  }, [config.ambienteExecucao]);

  const operadoraMissing = config.operadoras.some((op) => !op.url || !op.usuario || !op.senha);
  const missingCount = requiredFields.filter((field) => !String(config[field] || '').trim()).length + (operadoraMissing ? 1 : 0);

  const updateOperadora = (index, key, value) => {
    const next = [...config.operadoras];
    next[index] = { ...next[index], [key]: value };
    setConfig({ ...config, operadoras: next });
  };

  const updateOperadoraSelector = (index, key, value) => {
    const next = [...config.operadoras];
    next[index] = {
      ...next[index],
      selectors: {
        ...(next[index].selectors || {}),
        [key]: value,
      },
    };
    setConfig({ ...config, operadoras: next });
  };

  const addOperadora = () => setConfig({
    ...config,
    operadoras: [...config.operadoras, normalizeOperadora()],
  });

  const removeOperadora = (index) => setConfig({
    ...config,
    operadoras: config.operadoras.filter((_, i) => i !== index),
  });

  const preencherSelectorsAmil = (index) => {
    const next = [...config.operadoras];
    next[index] = {
      ...normalizeOperadora(next[index]),
      nome: next[index].nome || 'AMIL',
      url: next[index].url || 'https://www.amil.com.br/empresa/#/login',
      selectors: {
        usuario: 'input[name="username"], input.test_input_username',
        senha: 'input[name="password"], input.test_input_password',
        entrar: 'button:has-text("Entrar"), button[type="submit"]',
        boleto: 'a[href*="boleto"], button:has-text("Boleto"), a:has-text("Boleto"), button:has-text("2ª via"), a:has-text("2ª via")',
      },
      initialWaitMs: next[index].initialWaitMs || 20000,
      fieldTimeoutMs: next[index].fieldTimeoutMs || 90000,
      loginWaitMs: next[index].loginWaitMs || 10000,
    };
    setConfig({ ...config, operadoras: next });
  };

  const preencherSelectorsAssim = (index) => {
    const next = [...config.operadoras];
    next[index] = {
      ...normalizeOperadora(next[index]),
      nome: next[index].nome || 'ASSIM',
      url: next[index].url || 'https://assim.com.br/site/?area=empresas&redir=2via_boleto',
      selectors: {
        usuario: '#login, input#login, input[name="login"], input[placeholder*="Digite apenas números"]',
        senha: '#input-senha, input#input-senha, input[name="senha"], input[placeholder*="Informe sua senha"]',
        entrar: 'input[type="submit"], button:has-text("Entrar"), a:has-text("Entrar"), .btn:has-text("Entrar")',
        boleto: 'a[href*="2via_boleto"], a[href*="acesso-boleto"], a:has-text("2ª via de boleto"), a:has-text("2 via de boleto"), a:has-text("Boleto")',
      },
      initialWaitMs: next[index].initialWaitMs || 12000,
      fieldTimeoutMs: next[index].fieldTimeoutMs || 60000,
      loginWaitMs: next[index].loginWaitMs || 10000,
      downloadTimeoutMs: next[index].downloadTimeoutMs || 30000,
    };
    setConfig({ ...config, operadoras: next });
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Bot size={20} color="#2C7BE5" />
        <div>
          <h2 style={{ margin: 0, color: '#344050', fontSize: '1.1rem' }}>Configuração do Robô (Master)</h2>
          <p style={{ margin: 0, color: '#8a8d93', fontSize: '0.78rem' }}>
            Parametrize conforme documentação: SUPABASEURL, SUPABASESERVICEROLEKEY, OPERADORAURL, OPERADORAUSERNAME, OPERADORA_PASSWORD e SELECTORS.
          </p>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '16px', maxWidth: '1180px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: '12px' }}>
          <label style={{ fontSize: '0.82rem', color: '#5E6E82' }}>Intervalo (min)
            <input type="number" value={config.intervaloMinutos} onChange={(e) => setConfig({ ...config, intervaloMinutos: Number(e.target.value) })} style={{ width: '100%', marginTop: '6px', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '8px' }} />
          </label>
          <label style={{ fontSize: '0.82rem', color: '#5E6E82' }}>Tentativas automáticas
            <input type="number" value={config.tentativas} onChange={(e) => setConfig({ ...config, tentativas: Number(e.target.value) })} style={{ width: '100%', marginTop: '6px', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '8px' }} />
          </label>
          <label style={{ fontSize: '0.82rem', color: '#5E6E82' }}>Timeout (seg)
            <input type="number" value={config.timeoutSegundos} onChange={(e) => setConfig({ ...config, timeoutSegundos: Number(e.target.value) })} style={{ width: '100%', marginTop: '6px', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '8px' }} />
          </label>
        </div>

        <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <label style={{ fontSize: '0.82rem', color: '#5E6E82' }}><ServerCog size={14} style={{ display: 'inline', marginRight: '6px' }} />Ambiente de execução
            <select value={config.ambienteExecucao} onChange={(e) => setConfig({ ...config, ambienteExecucao: e.target.value })} style={{ width: '100%', marginTop: '6px', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '8px' }}>
              <option value="edge_function">Edge Function (Recomendado)</option>
              <option value="backend_fastapi">Backend FastAPI/Python</option>
              <option value="servico_externo">Serviço Externo RPA</option>
            </select>
          </label>

          <label style={{ fontSize: '0.82rem', color: '#5E6E82' }}><Globe size={14} style={{ display: 'inline', marginRight: '6px' }} />Endpoint de acionamento
            <input value={config.triggerEndpoint} onChange={(e) => setConfig({ ...config, triggerEndpoint: e.target.value })} placeholder="/api/v1/trigger-rpa" style={{ width: '100%', marginTop: '6px', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '8px' }} />
          </label>
        </div>

        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <label style={{ fontSize: '0.82rem', color: '#5E6E82' }}>RPA_SERVICE_URL (quando serviço externo)
            <input value={config.rpaServiceUrl} onChange={(e) => setConfig({ ...config, rpaServiceUrl: e.target.value })} placeholder="https://rpa.example.com/execute" style={{ width: '100%', marginTop: '6px', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '8px' }} />
          </label>
          <label style={{ fontSize: '0.82rem', color: '#5E6E82' }}>Nível de log
            <select value={config.logNivel} onChange={(e) => setConfig({ ...config, logNivel: e.target.value })} style={{ width: '100%', marginTop: '6px', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '8px' }}>
              <option>INFO</option><option>WARNING</option><option>ERROR</option><option>DEBUG</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: '16px', borderTop: '1px solid #eef2f7', paddingTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#344050' }}><KeyRound size={14} style={{ display: 'inline', marginRight: '6px' }} />Credenciais da Operadora</h3>
            <button type="button" onClick={addOperadora} style={{ border: '1px solid #2C7BE5', color: '#2C7BE5', background: '#fff', borderRadius: '6px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={13} />Adicionar operadora</button>
          </div>

          {config.operadoras.map((op, idx) => {
            const safeOp = normalizeOperadora(op);
            return (
              <div key={idx} style={{ border: '1px solid #eef2f7', borderRadius: '8px', padding: '12px', marginBottom: '12px', background: '#fbfdff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr 1fr 1fr auto', gap: '10px', marginBottom: '10px' }}>
                  <input value={safeOp.nome} onChange={(e) => updateOperadora(idx, 'nome', e.target.value)} placeholder="Nome da operadora" style={inputStyle} />
                  <input value={safeOp.url} onChange={(e) => updateOperadora(idx, 'url', e.target.value)} placeholder="OPERADORAURL" style={inputStyle} />
                  <input value={safeOp.usuario} onChange={(e) => updateOperadora(idx, 'usuario', e.target.value)} placeholder="OPERADORAUSERNAME" style={inputStyle} />
                  <input type="password" value={safeOp.senha} onChange={(e) => updateOperadora(idx, 'senha', e.target.value)} placeholder="OPERADORA_PASSWORD" style={inputStyle} />
                  <button type="button" onClick={() => removeOperadora(idx)} disabled={config.operadoras.length === 1} style={{ border: '1px solid #ef4444', color: '#ef4444', background: '#fff', borderRadius: '6px', padding: '8px' }}><Trash2 size={14} /></button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 8px' }}>
                  <strong style={{ fontSize: '0.8rem', color: '#344050' }}>Selectors da operadora</strong>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => preencherSelectorsAmil(idx)} style={{ border: '1px solid #00AEEF', color: '#0077A3', background: '#fff', borderRadius: '6px', padding: '5px 8px', fontSize: '0.75rem' }}>
                      Preencher padrão AMIL
                    </button>
                    <button type="button" onClick={() => preencherSelectorsAssim(idx)} style={{ border: '1px solid #16a34a', color: '#15803d', background: '#fff', borderRadius: '6px', padding: '5px 8px', fontSize: '0.75rem' }}>
                      Preencher padrão ASSIM
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={labelStyle}>Selector usuário
                    <input value={safeOp.selectors.usuario || ''} onChange={(e) => updateOperadoraSelector(idx, 'usuario', e.target.value)} placeholder={'#login, input[name="login"]'} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>Selector senha
                    <input value={safeOp.selectors.senha || ''} onChange={(e) => updateOperadoraSelector(idx, 'senha', e.target.value)} placeholder={'#input-senha, input[name="senha"]'} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>Selector botão entrar
                    <input value={safeOp.selectors.entrar || ''} onChange={(e) => updateOperadoraSelector(idx, 'entrar', e.target.value)} placeholder={'button:has-text("Entrar"), input[type="submit"]'} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>Selector boleto
                    <input value={safeOp.selectors.boleto || ''} onChange={(e) => updateOperadoraSelector(idx, 'boleto', e.target.value)} placeholder={'a[href*="2via_boleto"], a:has-text("Boleto")'} style={inputStyle} />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <label style={labelStyle}>Espera inicial (ms)
                    <input type="number" value={safeOp.initialWaitMs || 0} onChange={(e) => updateOperadora(idx, 'initialWaitMs', Number(e.target.value))} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>Timeout dos campos (ms)
                    <input type="number" value={safeOp.fieldTimeoutMs || 0} onChange={(e) => updateOperadora(idx, 'fieldTimeoutMs', Number(e.target.value))} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>Espera pós-login (ms)
                    <input type="number" value={safeOp.loginWaitMs || 0} onChange={(e) => updateOperadora(idx, 'loginWaitMs', Number(e.target.value))} style={inputStyle} />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '14px', borderTop: '1px solid #eef2f7', paddingTop: '12px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#344050' }}><ShieldCheck size={14} style={{ display: 'inline', marginRight: '6px' }} />Supabase (backend seguro)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <input value={config.supabaseUrl} onChange={(e) => setConfig({ ...config, supabaseUrl: e.target.value })} placeholder="SUPABASEURL" style={inputStyle} />
            <input type="password" value={config.supabaseServiceRoleKey} onChange={(e) => setConfig({ ...config, supabaseServiceRoleKey: e.target.value })} placeholder="SUPABASESERVICEROLEKEY" style={inputStyle} />
            <input value={config.supabaseBucketBoletos} onChange={(e) => setConfig({ ...config, supabaseBucketBoletos: e.target.value })} placeholder="Bucket de boletos" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
          <label style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#344050' }}><input type="checkbox" checked={config.notificacoes} onChange={(e) => setConfig({ ...config, notificacoes: e.target.checked })} /> Notificar falhas (e-mail/slack)</label>
          <label style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#344050' }}><input type="checkbox" checked={config.modoSeguro} onChange={(e) => setConfig({ ...config, modoSeguro: e.target.checked })} /> Modo seguro habilitado</label>
        </div>

        <div style={{ marginTop: '12px', fontSize: '0.78rem', color: missingCount ? '#b45309' : '#15803d' }}>
          {missingCount ? `Campos obrigatórios pendentes: ${missingCount}` : 'Todos os campos obrigatórios foram preenchidos.'}
        </div>

        <button onClick={() => saveRoboConfig(config).then(() => alert('Configuração salva com sucesso.')).catch((e) => alert(e.message))} style={{ marginTop: '14px', background: '#2C7BE5', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Save size={14} /> Salvar parâmetros
        </button>
      </div>
    </div>
  );
};

export default RoboConfig;

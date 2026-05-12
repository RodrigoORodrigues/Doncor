import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  timeout: 15000,
});

// ─── Dashboard ────────────────────────────────────
export const fetchDashboardStats = () => api.get('/dashboard/stats').then(r => r.data);
export const fetchChartData = () => api.get('/dashboard/chart-data').then(r => r.data);
export const fetchSeguradoras = () => api.get('/dashboard/seguradoras').then(r => r.data);
export const fetchSaldoVidas = () => api.get('/dashboard/saldo-vidas').then(r => r.data);
export const fetchTarefasPendentes = () => api.get('/tarefas-pendentes').then(r => r.data);
export const fetchMovimentacoesRecentes = () => api.get('/movimentacoes-recentes').then(r => r.data);

// ─── Contratos Adesão ─────────────────────────────
export const fetchContratosAdesao = (search = '', status = 'todos') =>
  api.get('/contratos-adesao', { params: { search, status } }).then(r => r.data);
export const createContratoAdesao = (data) => api.post('/contratos-adesao', data).then(r => r.data);
export const getContratoAdesao = (id) => api.get(`/contratos-adesao/${id}`).then(r => r.data);
export const updateContratoAdesao = (id, data) => api.put(`/contratos-adesao/${id}`, data).then(r => r.data);
export const deleteContratoAdesao = (id) => api.delete(`/contratos-adesao/${id}`).then(r => r.data);

// ─── Contratos Empresarial ────────────────────────
export const fetchContratosEmpresarial = (search = '', status = 'todos') =>
  api.get('/contratos-empresarial', { params: { search, status } }).then(r => r.data);
export const createContratoEmpresarial = (data) => api.post('/contratos-empresarial', data).then(r => r.data);
export const getContratoEmpresarial = (id) => api.get(`/contratos-empresarial/${id}`).then(r => r.data);
export const updateContratoEmpresarial = (id, data) => api.put(`/contratos-empresarial/${id}`, data).then(r => r.data);
export const deleteContratoEmpresarial = (id) => api.delete(`/contratos-empresarial/${id}`).then(r => r.data);

// ─── Inclusões ────────────────────────────────────
export const fetchInclusoes = (search = '', status = 'todos') =>
  api.get('/inclusoes', { params: { search, status } }).then(r => r.data);
export const createInclusao = (data) => api.post('/inclusoes', data).then(r => r.data);
export const getInclusao = (id) => api.get(`/inclusoes/${id}`).then(r => r.data);

// ─── Exclusões ────────────────────────────────────
export const fetchExclusoes = (search = '', status = 'todos') =>
  api.get('/exclusoes', { params: { search, status } }).then(r => r.data);
export const createExclusao = (data) => api.post('/exclusoes', data).then(r => r.data);

// ─── Transferências ───────────────────────────────
export const fetchTransferencias = (search = '') =>
  api.get('/transferencias', { params: { search } }).then(r => r.data);
export const createTransferencia = (data) => api.post('/transferencias', data).then(r => r.data);

// ─── Faturas ──────────────────────────────────────
export const fetchFaturas = (search = '', status = 'todos') =>
  api.get('/faturas', { params: { search, status } }).then(r => r.data);
export const fetchFaturasResumo = () => api.get('/faturas/resumo').then(r => r.data);

// ─── Comissões ────────────────────────────────────
export const fetchComissoes = (search = '') =>
  api.get('/comissoes', { params: { search } }).then(r => r.data);
export const fetchComissoesEvolucao = () => api.get('/comissoes/evolucao').then(r => r.data);

export default api;

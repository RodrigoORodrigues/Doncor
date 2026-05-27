import axios from "axios";

const RAW_BACKEND_URL = (
  process.env.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_URL ||
  ""
).replace(/\/$/, "");

const API = RAW_BACKEND_URL
  ? RAW_BACKEND_URL.endsWith("/api")
    ? RAW_BACKEND_URL
    : `${RAW_BACKEND_URL}/api`
  : "/api";

const api = axios.create({
  baseURL: API,
  timeout: 120000,
});

const getStoredSession = () => {
  try {
    return JSON.parse(localStorage.getItem("doncor_session") || "null");
  } catch {
    return null;
  }
};

const getRoleForRequest = () => {
  const session = getStoredSession();
  return session?.role || session?.username || "master";
};

const roboAuthConfig = {
  headers: {
    "x-user-role": "master",
    "X-User-Role": "master",
  },
};

api.interceptors.request.use((config) => {
  const role = getRoleForRequest();

  if (role) {
    config.headers = config.headers || {};
    config.headers["X-User-Role"] = role;
    config.headers["x-user-role"] = role;
  }

  return config;
});

const asArray = (value, endpoint = "") => {
  if (Array.isArray(value)) return value;

  if (value && Array.isArray(value.data)) return value.data;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && Array.isArray(value.results)) return value.results;

  console.warn(`[API] ${endpoint} não retornou array. Retornando lista vazia.`, value);
  return [];
};

const asObject = (value, fallback = {}, endpoint = "") => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

  console.warn(`[API] ${endpoint} não retornou objeto. Retornando fallback.`, value);
  return fallback;
};

const getArray = async (url, config = {}) => {
  const response = await api.get(url, config);
  return asArray(response.data, url);
};

const getObject = async (url, fallback = {}, config = {}) => {
  const response = await api.get(url, config);
  return asObject(response.data, fallback, url);
};

// ─── Dashboard ────────────────────────────────────
export const fetchDashboardStats = () =>
  getObject("/dashboard/stats", {
    totalContratos: 0,
    contratosAtivos: 0,
    vidasTotal: 0,
    vidasAtivas: 0,
    percentualOcupacao: 0,
    movimentacoesPendentes: 0,
    faturasPendentes: 0,
  });

export const fetchChartData = () => getArray("/dashboard/chart-data");
export const fetchDashboardSeguradoras = () => getArray("/dashboard/seguradoras");

export const fetchSaldoVidas = () =>
  getObject("/dashboard/saldo-vidas", {
    percentual_total: 0,
    total_vidas: 0,
    vidas_ativas: 0,
    vidas_suspensas: 0,
    vidas_canceladas: 0,
  });

export const fetchTarefasPendentes = () => getArray("/tarefas-pendentes");
export const fetchMovimentacoesRecentes = () => getArray("/movimentacoes-recentes");

// ─── Contratos Adesão ─────────────────────────────
export const fetchContratosAdesao = (search = "", status = "todos") =>
  getArray("/contratos-adesao", { params: { search, status } });

export const createContratoAdesao = (data) =>
  api.post("/contratos-adesao", data).then((r) => r.data);

export const getContratoAdesao = (id) =>
  api.get(`/contratos-adesao/${id}`).then((r) => r.data);

export const updateContratoAdesao = (id, data) =>
  api.put(`/contratos-adesao/${id}`, data).then((r) => r.data);

export const deleteContratoAdesao = (id) =>
  api.delete(`/contratos-adesao/${id}`).then((r) => r.data);

// ─── Contratos Empresarial ────────────────────────
export const fetchContratosEmpresarial = (search = "", status = "todos") =>
  getArray("/contratos-empresarial", { params: { search, status } });

export const createContratoEmpresarial = (data) =>
  api.post("/contratos-empresarial", data).then((r) => r.data);

export const getContratoEmpresarial = (id) =>
  api.get(`/contratos-empresarial/${id}`).then((r) => r.data);

export const updateContratoEmpresarial = (id, data) =>
  api.put(`/contratos-empresarial/${id}`, data).then((r) => r.data);

export const deleteContratoEmpresarial = (id) =>
  api.delete(`/contratos-empresarial/${id}`).then((r) => r.data);

// ─── Inclusões ────────────────────────────────────
export const fetchInclusoes = (search = "", status = "todos") =>
  getArray("/inclusoes", { params: { search, status } });

export const createInclusao = (data) =>
  api.post("/inclusoes", data).then((r) => r.data);

export const getInclusao = (id) =>
  api.get(`/inclusoes/${id}`).then((r) => r.data);

// ─── Exclusões ────────────────────────────────────
export const fetchExclusoes = (search = "", status = "todos") =>
  getArray("/exclusoes", { params: { search, status } });

export const createExclusao = (data) =>
  api.post("/exclusoes", data).then((r) => r.data);

// ─── Transferências ───────────────────────────────
export const fetchTransferencias = (search = "") =>
  getArray("/transferencias", { params: { search } });

export const createTransferencia = (data) =>
  api.post("/transferencias", data).then((r) => r.data);

// ─── Faturas ──────────────────────────────────────
export const fetchFaturas = (search = "", status = "todos") =>
  getArray("/faturas", { params: { search, status } });

export const fetchFaturasResumo = () =>
  getObject("/faturas/resumo", {
    abertas: 0,
    vencidas: 0,
    pagas: 0,
  });

// ─── Comissões ────────────────────────────────────
export const fetchComissoes = (search = "") =>
  getArray("/comissoes", { params: { search } });

export const fetchComissoesEvolucao = () => getArray("/comissoes/evolucao");

// ─── Seguradoras ──────────────────────────────────
export const fetchSeguradoras = (search = "", status = "todos") =>
  getArray("/seguradoras", { params: { search, status } });

export const createSeguradora = (data) =>
  api.post("/seguradoras", data).then((r) => r.data);

export const updateSeguradora = (id, data) =>
  api.put(`/seguradoras/${id}`, data).then((r) => r.data);

export const deleteSeguradora = (id) =>
  api.delete(`/seguradoras/${id}`).then((r) => r.data);

// ─── Produtos ─────────────────────────────────────
export const fetchProdutos = (search = "", status = "todos", seguradora = "") =>
  getArray("/produtos", { params: { search, status, seguradora } });

export const createProduto = (data) =>
  api.post("/produtos", data).then((r) => r.data);

export const updateProduto = (id, data) =>
  api.put(`/produtos/${id}`, data).then((r) => r.data);

export const deleteProduto = (id) =>
  api.delete(`/produtos/${id}`).then((r) => r.data);

// ─── Colaboradores ────────────────────────────────
export const fetchColaboradores = (search = "", status = "todos", departamento = "") =>
  getArray("/colaboradores", { params: { search, status, departamento } });

export const createColaborador = (data) =>
  api.post("/colaboradores", data).then((r) => r.data);

export const updateColaborador = (id, data) =>
  api.put(`/colaboradores/${id}`, data).then((r) => r.data);

export const deleteColaborador = (id) =>
  api.delete(`/colaboradores/${id}`).then((r) => r.data);

// ─── Relatórios ───────────────────────────────────
export const fetchRelatorioResumo = () =>
  getObject("/relatorios/resumo-geral", {
    totalContratosAdesao: 0,
    totalContratosEmpresarial: 0,
    totalInclusoes: 0,
    totalExclusoes: 0,
    totalTransferencias: 0,
    porSeguradora: [],
    statusAdesao: {},
    statusEmpresarial: {},
  });

// ─── Robô / Automação ───────────────────────────
export const fetchRoboStatus = () =>
  getObject("/robo/status", {
    status: "offline",
    queue: 0,
    lastRunAt: null,
    successRate: 0,
  }, roboAuthConfig);

export const fetchRoboExecucoes = () => getArray("/robo/execucoes", roboAuthConfig);

export const fetchRoboHistorico = () =>
  getObject("/robo/historico", {
    resumo: {
      boletosBaixados: 0,
      arquivosGerados: 0,
      diagnosticos: 0,
    },
    boletos: [],
    arquivos: [],
    diagnosticos: [],
  }, roboAuthConfig);

export const startRobo = () => api.post("/robo/iniciar", {}, roboAuthConfig).then((r) => r.data);

export const pauseRobo = () => api.post("/robo/pausar", {}, roboAuthConfig).then((r) => r.data);

export const fetchRoboConfig = () => getObject("/robo/config", {}, roboAuthConfig);
export const saveRoboConfig = (data) => api.post("/robo/config", data, roboAuthConfig).then((r) => r.data);
export const triggerRoboReal = (data) => api.post("/robo/trigger-real", data, roboAuthConfig).then((r) => r.data);

export default api;

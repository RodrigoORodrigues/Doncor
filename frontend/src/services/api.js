import axios from "axios";

const PRODUCTION_BACKEND_URL = "https://doncor.up.railway.app";

const isHostedFrontend = () => {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return (
    /(^|\.)doncor\.site$/i.test(hostname) ||
    /\.vercel\.app$/i.test(hostname) ||
    /\.run\.app$/i.test(hostname) ||
    (hostname !== "localhost" && hostname !== "127.0.0.1" && !hostname.startsWith("192.168."))
  );
};

const normalizeBackendUrl = (value) => {
  const raw = String(value || "").trim().replace(/\/$/, "");
  const isPlaceholder = !raw || raw.includes("REACT_APP_BACKEND_URL") || raw.includes("REACT_APP_API_URL");

  if (isPlaceholder) {
    return isHostedFrontend() ? PRODUCTION_BACKEND_URL : "";
  }

  return raw;
};

const RAW_BACKEND_URL = normalizeBackendUrl(
  process.env.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_URL ||
  ""
);

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
export const fetchContratosEmpresarial = (search = "", status = "todos", tipo = "") =>
  getArray("/contratos-empresarial", { params: { search, status, tipo } });

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

export const updateInclusao = (id, data) =>
  api.put(`/inclusoes/${id}`, data).then((r) => r.data);

// ─── Exclusões ────────────────────────────────────
export const fetchExclusoes = (search = "", status = "todos") =>
  getArray("/exclusoes", { params: { search, status } });

export const createExclusao = (data) =>
  api.post("/exclusoes", data).then((r) => r.data);

export const updateExclusao = (id, data) =>
  api.put(`/exclusoes/${id}`, data).then((r) => r.data);

// ─── Transferências ───────────────────────────────
export const fetchTransferencias = (search = "") =>
  getArray("/transferencias", { params: { search } });

export const createTransferencia = (data) =>
  api.post("/transferencias", data).then((r) => r.data);

export const updateTransferencia = (id, data) =>
  api.put(`/transferencias/${id}`, data).then((r) => r.data);

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

// ─── Portal do Cliente / Parceiros ───────────────────
export const fetchPortalParceiros = (search = "", status = "todos") =>
  getArray("/portal-parceiros", { params: { search, status } });
export const createPortalParceiro = (data) => api.post("/portal-parceiros", data).then((r) => r.data);
export const updatePortalParceiro = (id, data) => api.put(`/portal-parceiros/${id}`, data).then((r) => r.data);
export const deletePortalParceiro = (id) => api.delete(`/portal-parceiros/${id}`).then((r) => r.data);
export const fetchPortalFormularios = (search = "", status = "todos", categoria = "todos") =>
  getArray("/portal-formularios", { params: { search, status, categoria } });
export const createPortalFormulario = (data) => api.post("/portal-formularios", data).then((r) => r.data);
export const updatePortalFormulario = (id, data) => api.put(`/portal-formularios/${id}`, data).then((r) => r.data);
export const deletePortalFormulario = (id) => api.delete(`/portal-formularios/${id}`).then((r) => r.data);
export const getPortalFormularioDownloadUrl = (item) => {
  if (item?.arquivoUrl) return item.arquivoUrl;
  if (!item?.id) return "";
  return `${API}/portal-formularios/${item.id}/arquivo`;
};
export const fetchPortalSinistralidade = (search = "", status = "todos") =>
  getArray("/portal-sinistralidade", { params: { search, status } });
export const createPortalSinistralidade = (data) => api.post("/portal-sinistralidade", data).then((r) => r.data);
export const updatePortalSinistralidade = (id, data) => api.put(`/portal-sinistralidade/${id}`, data).then((r) => r.data);
export const deletePortalSinistralidade = (id) => api.delete(`/portal-sinistralidade/${id}`).then((r) => r.data);
export const getPortalSinistralidadeDownloadUrl = (item) => {
  if (item?.arquivoUrl) return item.arquivoUrl;
  if (!item?.id) return "";
  return `${API}/portal-sinistralidade/${item.id}/arquivo`;
};

export const loginPortalDonCor = ({ documento, senha }) => api.post("/portal-doncor/login", { documento, senha }).then((r) => r.data);
export const alterarSenhaPortalDonCor = (data) => api.post("/portal-doncor/alterar-senha", data).then((r) => r.data);
export const esqueciSenhaPortalDonCor = (data) => api.post("/portal-doncor/esqueci-senha", data).then((r) => r.data);
export const fetchPortalDonCorResumo = (documento) => getObject("/portal-doncor/resumo", {}, { params: { documento } });
export const fetchPortalDonCorFormularios = ({ categoria = "todos" } = {}) =>
  getArray("/portal-doncor/formularios", { params: { categoria } });
export const fetchPortalDonCorSinistralidade = (documento) => getArray("/portal-doncor/sinistralidade", { params: { documento } });
export const fetchPortalDonCorSolicitacoes = ({ documento = "", search = "", tipo = "todos", status = "todos" } = {}) =>
  getArray("/portal-doncor/solicitacoes", { params: { documento, search, tipo, status } });
export const updatePortalDonCorSolicitacao = (id, data) => api.patch(`/portal-doncor/solicitacoes/${id}`, data).then((r) => r.data);
export const atualizarPerfilPortalDonCor = (data) => api.post("/portal-doncor/atualizar-perfil", data).then((r) => r.data);
export const deletePortalDonCorSolicitacao = (id) => api.delete(`/portal-doncor/solicitacoes/${id}`).then((r) => r.data);
export const createPortalDonCorMovimentacao = (data) => api.post("/portal-doncor/movimentacoes", data).then((r) => r.data);
export const fetchPortalDonCorChat = ({ documento = "", empresa = "" } = {}) =>
  getArray("/portal-doncor/chat", { params: { documento, empresa } });
export const sendPortalDonCorChat = (data) => api.post("/portal-doncor/chat", data).then((r) => r.data);
export const markPortalDonCorChatRead = (data) => api.patch("/portal-doncor/chat/read", data).then((r) => r.data);

export const fetchNotifications = (documento) => getArray("/portal-doncor/notifications", { params: { documento } });
export const markNotificationRead = (id) => api.patch(`/portal-doncor/notifications/${id}/read`).then((r) => r.data);

export const fetchLgpdConfig = () => api.get("/portal-doncor/lgpd/config").then((r) => r.data);
export const saveLgpdConfig = (data) => api.post("/portal-doncor/lgpd/nova-versao", data).then((r) => r.data);
export const fetchLgpdAceites = () => api.get("/portal-doncor/lgpd/aceites").then((r) => r.data);
export const deleteLgpdAceite = (id) => api.delete(`/portal-doncor/lgpd/aceites/${id}`).then((r) => r.data);
export const aceitarLgpd = (data) => api.post("/portal-doncor/lgpd/aceitar", data).then((r) => r.data);

export default api;

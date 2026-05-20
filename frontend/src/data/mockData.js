// Mock data for Don Cor - Gestão de Apólices

export const currentUser = {
  id: 1,
  name: "Carlos Eduardo Silva",
  email: "carlos.silva@corretora.com.br",
  role: "Administrador",
  company: "Corretora Premium Seguros",
  avatar: null,
  lastLogin: "06/03/2026 14:30",
};

export const menuItems = [
  {
    section: "Meus Contratos",
    items: [
      { id: "adesao", label: "Adesão", icon: "Users", page: "adesao" },
      { id: "empresarial", label: "Empresarial/PME", icon: "Handshake", page: "empresarial" },
    ],
  },
  {
    section: "Movimentações",
    items: [
      { id: "inclusao", label: "Inclusão", icon: "UserPlus", page: "inclusao" },
      { id: "exclusao", label: "Exclusão", icon: "UserMinus", page: "exclusao" },
      { id: "transferencia", label: "Transferência", icon: "ArrowLeftRight", page: "transferencia" },
    ],
  },
  {
    section: "Financeiro",
    items: [
      { id: "faturas", label: "Faturas", icon: "Receipt", page: "faturas" },
      { id: "comissoes", label: "Comissões", icon: "DollarSign", page: "comissoes" },
    ],
  },
  {
    section: "Cadastros",
    items: [
      { id: "seguradoras", label: "Seguradoras", icon: "Building2", page: "seguradoras" },
      { id: "produtos", label: "Produtos", icon: "Package", page: "produtos" },
      { id: "colaboradores", label: "Colaboradores", icon: "UserCog", page: "colaboradores" },
    ],
  },
  {
    section: "Automação",
    items: [
      { id: "robo", label: "Robô", icon: "Bot", page: "robo" },
      { id: "robo-config", label: "Configuração do Robô", icon: "Settings", page: "robo-config" },
    ],
  },
  {
    section: "Relatórios",
    items: [
      { id: "relatorios", label: "Relatórios", icon: "BarChart3", page: "relatorios" },
      { id: "exportar", label: "Exportar Dados", icon: "Download", page: "exportar" },
    ],
  },
];

export const dashboardStats = {
  totalContratos: 1247,
  contratosAtivos: 1089,
  vidasTotal: 28456,
  vidasAtivas: 25120,
  percentualOcupacao: 88.3,
  movimentacoesPendentes: 34,
  faturasPendentes: 12,
  ticketsAbertos: 5,
};

export const dashboardChartData = [
  { mes: "Jan", inclusoes: 45, exclusoes: 12, transferencias: 8 },
  { mes: "Fev", inclusoes: 52, exclusoes: 18, transferencias: 5 },
  { mes: "Mar", inclusoes: 38, exclusoes: 15, transferencias: 12 },
  { mes: "Abr", inclusoes: 67, exclusoes: 22, transferencias: 9 },
  { mes: "Mai", inclusoes: 55, exclusoes: 14, transferencias: 7 },
  { mes: "Jun", inclusoes: 71, exclusoes: 19, transferencias: 11 },
];

export const pendingTasks = [
  { id: 1, tipo: "Inclusão", descricao: "Incluir 5 vidas - Contrato #1234", prazo: "07/03/2026", status: "Pendente", prioridade: "Alta" },
  { id: 2, tipo: "Exclusão", descricao: "Excluir titular - Contrato #0987", prazo: "08/03/2026", status: "Em Análise", prioridade: "Média" },
  { id: 3, tipo: "Fatura", descricao: "Conferir fatura Mar/2026 - Amil", prazo: "10/03/2026", status: "Pendente", prioridade: "Alta" },
  { id: 4, tipo: "Transferência", descricao: "Transferir plano - Maria Silva", prazo: "12/03/2026", status: "Pendente", prioridade: "Baixa" },
  { id: 5, tipo: "Inclusão", descricao: "Incluir dependente - José Santos", prazo: "09/03/2026", status: "Em Análise", prioridade: "Média" },
];

export const contratosAdesao = [
  { id: 1, numero: "ADH-2024-001", seguradora: "Amil", produto: "Amil 400 QC Nacional", administradora: "Qualicorp", vigencia: "01/01/2024", vidas: 156, status: "Ativo", valorMensal: "R$ 45.200,00" },
  { id: 2, numero: "ADH-2024-002", seguradora: "Bradesco Saúde", produto: "Top Nacional Plus", administradora: "Qualicorp", vigencia: "01/03/2024", vidas: 89, status: "Ativo", valorMensal: "R$ 32.150,00" },
  { id: 3, numero: "ADH-2024-003", seguradora: "SulAmérica", produto: "Prestige", administradora: "Aliança", vigencia: "01/06/2024", vidas: 234, status: "Ativo", valorMensal: "R$ 78.900,00" },
  { id: 4, numero: "ADH-2023-015", seguradora: "Unimed", produto: "Unimax", administradora: "Qualicorp", vigencia: "01/08/2023", vidas: 67, status: "Ativo", valorMensal: "R$ 18.450,00" },
  { id: 5, numero: "ADH-2023-008", seguradora: "NotreDame", produto: "ND Sênior", administradora: "Aliança", vigencia: "01/04/2023", vidas: 45, status: "Cancelado", valorMensal: "R$ 12.300,00" },
  { id: 6, numero: "ADH-2024-007", seguradora: "Amil", produto: "Amil 500 QC", administradora: "Qualicorp", vigencia: "01/02/2024", vidas: 112, status: "Ativo", valorMensal: "R$ 38.700,00" },
  { id: 7, numero: "ADH-2024-010", seguradora: "Bradesco Saúde", produto: "Nacional Flex", administradora: "Qualicorp", vigencia: "01/05/2024", vidas: 78, status: "Ativo", valorMensal: "R$ 24.800,00" },
  { id: 8, numero: "ADH-2023-020", seguradora: "Porto Seguro", produto: "Bronze Plus", administradora: "Aliança", vigencia: "01/11/2023", vidas: 34, status: "Suspenso", valorMensal: "R$ 9.200,00" },
];

export const contratosEmpresarial = [
  { id: 1, numero: "EMP-2024-001", empresa: "Tech Solutions Ltda", cnpj: "12.345.678/0001-90", seguradora: "Amil", produto: "Amil S450", vigencia: "01/01/2024", vencimento: "01/01/2025", vidas: 45, status: "Ativo", valorMensal: "R$ 22.500,00" },
  { id: 2, numero: "EMP-2024-002", empresa: "Global Commerce SA", cnpj: "98.765.432/0001-10", seguradora: "Bradesco Saúde", produto: "Flex PME", vigencia: "01/02/2024", vencimento: "01/02/2025", vidas: 120, status: "Ativo", valorMensal: "R$ 54.000,00" },
  { id: 3, numero: "EMP-2024-003", empresa: "Indústria ABC ME", cnpj: "11.222.333/0001-44", seguradora: "SulAmérica", produto: "Executivo Plus", vigencia: "01/04/2024", vencimento: "01/04/2025", vidas: 230, status: "Ativo", valorMensal: "R$ 115.000,00" },
  { id: 4, numero: "EMP-2023-010", empresa: "Consultoria Delta", cnpj: "55.666.777/0001-88", seguradora: "Unimed", produto: "Uniflex", vigencia: "01/07/2023", vencimento: "01/07/2024", vidas: 18, status: "Vencido", valorMensal: "R$ 7.200,00" },
  { id: 5, numero: "EMP-2024-005", empresa: "Logística Express", cnpj: "22.333.444/0001-55", seguradora: "NotreDame", produto: "ND Empresarial", vigencia: "01/03/2024", vencimento: "01/03/2025", vidas: 85, status: "Ativo", valorMensal: "R$ 38.250,00" },
  { id: 6, numero: "EMP-2024-008", empresa: "Varejo Master Ltda", cnpj: "33.444.555/0001-66", seguradora: "Porto Seguro", produto: "Bronze Empresarial", vigencia: "01/06/2024", vencimento: "01/06/2025", vidas: 62, status: "Ativo", valorMensal: "R$ 24.800,00" },
  { id: 7, numero: "EMP-2023-015", empresa: "Educação Viva SA", cnpj: "44.555.666/0001-77", seguradora: "Amil", produto: "Amil S750", vigencia: "01/09/2023", vencimento: "01/09/2024", vidas: 310, status: "Ativo", valorMensal: "R$ 186.000,00" },
  { id: 8, numero: "EMP-2024-012", empresa: "Farmácia Saúde ME", cnpj: "66.777.888/0001-99", seguradora: "Bradesco Saúde", produto: "PME Compacto", vigencia: "01/05/2024", vencimento: "01/05/2025", vidas: 8, status: "Ativo", valorMensal: "R$ 3.200,00" },
];

export const recentMovements = [
  { id: 1, tipo: "Inclusão", contrato: "EMP-2024-001", beneficiario: "Ana Paula Santos", data: "05/03/2026", status: "Aprovado" },
  { id: 2, tipo: "Exclusão", contrato: "ADH-2024-003", beneficiario: "Roberto Oliveira", data: "04/03/2026", status: "Pendente" },
  { id: 3, tipo: "Transferência", contrato: "EMP-2024-002", beneficiario: "Maria Clara Lima", data: "03/03/2026", status: "Aprovado" },
  { id: 4, tipo: "Inclusão", contrato: "ADH-2024-001", beneficiario: "João Pedro Alves", data: "02/03/2026", status: "Em Análise" },
  { id: 5, tipo: "Inclusão", contrato: "EMP-2024-003", beneficiario: "Fernanda Costa", data: "01/03/2026", status: "Aprovado" },
];

export const saldoVidas = {
  percentual_total: 88,
  total_vidas: 28456,
  vidas_ativas: 25120,
  vidas_suspensas: 1234,
  vidas_canceladas: 2102,
};

export const seguradoras = [
  { id: 1, nome: "Amil", contratos: 3, vidas: 313 },
  { id: 2, nome: "Bradesco Saúde", contratos: 3, vidas: 287 },
  { id: 3, nome: "SulAmérica", contratos: 2, vidas: 464 },
  { id: 4, nome: "Unimed", contratos: 2, vidas: 85 },
  { id: 5, nome: "NotreDame", contratos: 2, vidas: 130 },
  { id: 6, nome: "Porto Seguro", contratos: 2, vidas: 96 },
];

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any
import uuid


class ContratoAdesaoBase(BaseModel):
    numero: str
    seguradora: str
    produto: Optional[str] = ""
    plano: Optional[str] = ""
    administradora: str
    vigencia: str
    vidas: int = 0
    status: str = "Ativo"
    valorMensal: str = "R$ 0,00"


class ContratoAdesao(ContratoAdesaoBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class ContratoAdesaoCreate(ContratoAdesaoBase):
    pass


class ContratoEmpresarialBase(BaseModel):
    numero: str
    empresa: str
    cnpj: str
    seguradora: str
    produto: Optional[str] = ""
    plano: Optional[str] = ""
    vigencia: str
    vencimento: str
    vidas: int = 0
    status: str = "Ativo"
    valorMensal: str = "R$ 0,00"
    tipo: str = "Empresarial"


class ContratoEmpresarial(ContratoEmpresarialBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class ContratoEmpresarialCreate(ContratoEmpresarialBase):
    pass


class InclusaoBase(BaseModel):
    contrato: str
    empresa: str = "-"
    beneficiario: str
    cpf: str
    dataNascimento: str = ""
    telefone: str = ""
    email: str = ""
    parentesco: str = "Titular"
    estadoCivil: str = ""
    plano: str = ""
    nomeMae: str = ""
    genero: Optional[str] = ""


class Inclusao(InclusaoBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    protocolo: str = ""
    dataSolicitacao: str = ""
    status: str = "Pendente"


class InclusaoCreate(InclusaoBase):
    pass


class ExclusaoBase(BaseModel):
    contrato: str
    beneficiario: str
    cpf: str
    dataFim: str = ""
    motivo: str = "Solicitação do titular"


class Exclusao(ExclusaoBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    protocolo: str = ""
    dataSolicitacao: str = ""
    status: str = "Pendente"


class ExclusaoCreate(ExclusaoBase):
    pass


class TransferenciaBase(BaseModel):
    contratoOrigem: str
    contratoDestino: str
    beneficiario: str
    cpf: str


class Transferencia(TransferenciaBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    protocolo: str = ""
    dataSolicitacao: str = ""
    status: str = "Pendente"


class TransferenciaCreate(TransferenciaBase):
    pass


class Fatura(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero: str
    contrato: str
    seguradora: str
    competencia: str
    vencimento: str
    valor: str
    valorPago: str = "-"
    status: str = "Aberta"


class Comissao(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    seguradora: str
    competencia: str
    contratos: int
    vidasBase: int
    percentual: str
    valorEstimado: str
    status: str = "Prevista"


class TarefaPendente(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tipo: str
    descricao: str
    prazo: str
    status: str = "Pendente"
    prioridade: str = "Média"


class MovimentacaoRecente(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tipo: str
    contrato: str
    beneficiario: str
    data: str
    status: str = "Pendente"


class SeguradoraBase(BaseModel):
    nome: str
    codigo: str = ""
    cnpj: str = ""
    telefone: str = ""
    email: str = ""
    endereco: str = ""
    status: str = "Ativo"


class Seguradora(SeguradoraBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contratos: int = 0
    vidas: int = 0


class SeguradoraCreate(SeguradoraBase):
    pass


class ProdutoBase(BaseModel):
    nome: str
    seguradora: str
    tipo: str = "Saúde"
    cobertura: str = "Nacional"
    acomodacao: str = "Enfermaria"
    reajuste: str = ""
    status: str = "Ativo"


class Produto(ProdutoBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contratosVinculados: int = 0


class ProdutoCreate(ProdutoBase):
    pass


class ColaboradorBase(BaseModel):
    nome: str
    cargo: str = ""
    email: str = ""
    telefone: str = ""
    departamento: str = ""
    status: str = "Ativo"
    senha: str = ""
    usuario: str = ""
    primeiroAcesso: bool = True
    senhaTemporaria: bool = True


class Colaborador(ColaboradorBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    dataAdmissao: str = ""


class ColaboradorCreate(ColaboradorBase):
    pass


class BeneficiarioBase(BaseModel):
    contrato: str
    nome: str
    cpf: str
    dataNascimento: str
    plano: str
    status: str = "Ativo"


class Beneficiario(BeneficiarioBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class OperadoraCredencial(BaseModel):
    model_config = ConfigDict(extra="allow")
    nome: str = ""
    url: str
    usuario: str
    senha: str
    selectors: dict[str, str] = Field(default_factory=dict)
    steps: list[dict[str, Any]] = Field(default_factory=list)
    loginWaitMs: int = 3000
    downloadTimeoutMs: int = 30000


class RoboConfigPayload(BaseModel):
    intervaloMinutos: int = 15
    tentativas: int = 3
    notificacoes: bool = True
    modoSeguro: bool = True
    ambienteExecucao: str = "backend_fastapi"
    triggerEndpoint: str = "/api/v1/trigger-rpa"
    rpaServiceUrl: str = ""
    timeoutSegundos: int = 120
    operadoras: list[OperadoraCredencial] = Field(default_factory=list)
    supabaseUrl: str = ""
    supabaseServiceRoleKey: str = ""
    supabaseBucketBoletos: str = "boletos"
    logNivel: str = "INFO"


class RoboTriggerPayload(BaseModel):
    user_id: str
    unique_login_code: str
    apolice_id: str
    operadora_nome: str = ""

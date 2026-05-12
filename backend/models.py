from pydantic import BaseModel, Field
from typing import Optional
import uuid


class ContratoAdesaoBase(BaseModel):
    numero: str
    seguradora: str
    produto: str
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
    produto: str
    vigencia: str
    vencimento: str
    vidas: int = 0
    status: str = "Ativo"
    valorMensal: str = "R$ 0,00"


class ContratoEmpresarial(ContratoEmpresarialBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class ContratoEmpresarialCreate(ContratoEmpresarialBase):
    pass


class InclusaoBase(BaseModel):
    contrato: str
    empresa: str = "-"
    beneficiario: str
    cpf: str
    parentesco: str = "Titular"


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

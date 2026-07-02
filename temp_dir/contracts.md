# Contratos API - GA Gestão de Apólices

## API Contracts

### Base URL: `/api`

### Dashboard
- `GET /api/dashboard/stats` → retorna estatísticas agregadas
- `GET /api/dashboard/chart-data` → dados dos gráficos de movimentações
- `GET /api/dashboard/seguradoras` → vidas por seguradora
- `GET /api/dashboard/saldo-vidas` → saldo percentual de vidas

### Contratos Adesão
- `GET /api/contratos-adesao` → listar (query: search, status)
- `POST /api/contratos-adesao` → criar
- `GET /api/contratos-adesao/{id}` → detalhe
- `PUT /api/contratos-adesao/{id}` → atualizar
- `DELETE /api/contratos-adesao/{id}` → deletar

### Contratos Empresarial
- `GET /api/contratos-empresarial` → listar (query: search, status)
- `POST /api/contratos-empresarial` → criar
- `GET /api/contratos-empresarial/{id}` → detalhe
- `PUT /api/contratos-empresarial/{id}` → atualizar
- `DELETE /api/contratos-empresarial/{id}` → deletar

### Inclusões
- `GET /api/inclusoes` → listar (query: search, status)
- `POST /api/inclusoes` → criar
- `GET /api/inclusoes/{id}` → detalhe

### Exclusões
- `GET /api/exclusoes` → listar (query: search, status)
- `POST /api/exclusoes` → criar

### Transferências
- `GET /api/transferencias` → listar (query: search)
- `POST /api/transferencias` → criar

### Faturas
- `GET /api/faturas` → listar (query: search, status)
- `GET /api/faturas/resumo` → resumo (abertas, vencidas, pagas)

### Comissões
- `GET /api/comissoes` → listar (query: search)
- `GET /api/comissoes/evolucao` → dados do gráfico de evolução

### Movimentações Recentes
- `GET /api/movimentacoes-recentes` → últimas 10 movimentações

### Tarefas Pendentes
- `GET /api/tarefas-pendentes` → tarefas do usuário

## Mock Data → Real Data
- mockData.js será substituído por chamadas axios ao backend
- Dados serão seedados no MongoDB na inicialização

## Frontend Integration
- Criar api.js com todas as chamadas
- Cada página usa hooks para carregar dados do backend
- Loading states e error handling em cada página

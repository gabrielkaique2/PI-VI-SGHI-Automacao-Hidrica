# SGH Inteligente — Frontend

Interface React responsiva para monitoramento e gestão do Sistema de Gestão Hídrica Inteligente. A estrutura visual usa o template Dashboard do MUI como referência, com a identidade visual do projeto nos temas claro e escuro.

## Requisitos

- Node.js 20.19+ ou 22.12+
- Backend do SGHI em execução na porta 3000

## Executar localmente

```powershell
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5500`. A porta 5500 corresponde às origens locais permitidas pela configuração padrão do backend. Para outra origem, configure `FRONTEND_ORIGINS` no backend antes de iniciar os serviços.

## Rotas

- `/login`: acesso público.
- `/dashboard`: leituras recentes e série temporal, disponível para usuários autenticados.
- `/limiares`: consulta e configuração dos limiares, disponível para `admin` e `operador`.
- `/usuarios`: gestão de usuários, disponível somente para `admin`.

O tema claro é o padrão. O usuário pode alternar manualmente para o escuro; a preferência fica salva no navegador.

## Integração

O frontend usa os endpoints existentes em `/auth`, `/leituras`, `/config/thresholds/:deviceID` e `/usuarios`, mantendo a autenticação no cookie HTTP-only do backend. As leituras são atualizadas pela API REST e por eventos autenticados no WebSocket `/ws`. Os valores são apresentados como leituras brutas na escala de 0 a 409.

## Build de produção

```powershell
npm run build
```

Os arquivos de distribuição são gerados em `frontend/dist`.
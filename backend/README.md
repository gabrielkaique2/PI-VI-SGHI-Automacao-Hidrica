# Backend SGHI

Backend Node.js do Sistema de Gestão Hídrica Inteligente (SGHI). Recebe leituras de sensores por MQTT, persiste dados no SQLite, disponibiliza endpoints HTTP e publica atualizações em tempo real por WebSocket.

O `npm start` inicia o app autenticado de `src/`, incluindo autenticação por cookie, allowlist CORS, API REST, WebSocket autenticado e integração MQTT. Os módulos legados que permanecem na raiz (`database.js`, `mqttClient.js`, `realtime.js` e `configService.js`) não são usados por esse entry point.

## Conteúdo

- [Arquitetura e estrutura](#arquitetura-e-estrutura)
- [Requisitos](#requisitos)
- [Instalação e execução](#instalação-e-execução)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [API disponível no servidor atual](#api-disponível-no-servidor-atual)
- [Integração MQTT](#integração-mqtt)
- [Controle da bomba](#controle-da-bomba)
- [WebSocket](#websocket)
- [Banco de dados](#banco-de-dados)
- [Autenticação implementada em `src/`](#autenticação-implementada-em-src)
- [Testes](#testes)
- [Solução de problemas](#solução-de-problemas)

## Arquitetura e estrutura

```text
Sensor/ESP32 ou simulador
        | MQTT
        v
Broker MQTT <----> backend Node.js
                         |       |
                         |       +---- HTTP/REST
                         |       +---- WebSocket (/ws)
                         v
                    SQLite
```

Principais diretórios e arquivos:

| Caminho | Responsabilidade |
| --- | --- |
| `server.js` | Inicializa o app de `src/`, banco, WebSocket e MQTT; exporta `startServer` para testes. |
| `src/app.js` | App Express, allowlist CORS e registro das rotas REST. |
| `src/routes/` | Rotas de autenticação, leituras, configuração e usuários. |
| `src/services/` | Regras de autenticação, usuários e configuração. |
| `src/integrations/` | Integrações MQTT e WebSocket autenticado. |
| `src/database/` | Inicialização do schema e resolução do caminho do SQLite. |
| `database.js`, `mqttClient.js`, `realtime.js`, `configService.js` | Implementação legada mantida na raiz; não é carregada por `npm start`. |
| `test/` | Testes automatizados existentes. |

O entry point oficial é `backend/server.js`; os módulos de runtime e rotas ativos ficam em `backend/src/`.

## Requisitos

- Node.js e npm instalados. O projeto não declara uma versão mínima de Node.js.
- Acesso a um broker MQTT. Por padrão, o cliente usa o broker público `broker.hivemq.com` na porta `1883`.
- Mosquitto ou outro cliente MQTT apenas se for publicar mensagens manualmente pela linha de comando.
- Para controlar uma bomba via HTTP, um simulador/serviço acessível no endereço configurado em `SIMULATOR_CONTROL_URL`.

## Instalação e execução

No PowerShell, a partir da raiz do repositório:

```powershell
Set-Location .\backend
npm install
$env:SIMULATOR_CONTROL_URL = "http://localhost:9080/bomba"
$env:BOOTSTRAP_ADMIN_EMAIL = "admin@exemplo.com"
$env:BOOTSTRAP_ADMIN_PASSWORD = "substitua-por-uma-senha-com-12-ou-mais-caracteres"
npm start
```

O backend escuta em `http://localhost:3000`. As variáveis `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD` são necessárias na primeira inicialização de um banco vazio. A senha precisa ter no mínimo 12 caracteres. Após criar o primeiro usuário, esses valores não são usados para recriá-lo.

Mantenha o terminal aberto enquanto estiver usando a API; encerre o processo com `Ctrl+C`. Não use credenciais reais em exemplos versionados.

No Linux/macOS:

```bash
cd backend
npm install
BOOTSTRAP_ADMIN_EMAIL="admin@example.com" \
BOOTSTRAP_ADMIN_PASSWORD="replace-with-a-password-of-at-least-12-characters" \
SIMULATOR_CONTROL_URL="http://localhost:9080/bomba" npm start
```

`npm start` executa `node server.js`. Portanto, executá-lo dentro de `backend/` é equivalente a `node ./server.js` na mesma pasta.

### Verificar se o servidor respondeu

Em outra janela do PowerShell:

```powershell
Invoke-RestMethod http://localhost:3000/
Invoke-RestMethod http://localhost:3000/leituras
```

A rota raiz deve retornar o nome do sistema, o status e um timestamp. `/leituras` retorna uma lista JSON, que pode estar vazia.

## Variáveis de ambiente

O projeto não carrega automaticamente um arquivo `.env`. As variáveis devem ser definidas no ambiente do processo antes de iniciar o Node.js.

### Usadas pelo entry point atual

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP e WebSocket. |
| `MQTT_URL` | `mqtt://broker.hivemq.com:1883` | URL do broker MQTT. Exemplo local: `mqtt://localhost:1883`. |
| `MQTT_TOPIC` | `sensor/umidade` | Tópico assinado pelo cliente MQTT. |
| `SIMULATOR_CONTROL_URL` | Sem padrão; controle HTTP é ignorado se não definida. | URL que recebe os comandos da bomba. Exemplo: `http://localhost:9080/bomba`. |
| `FRONTEND_ORIGINS` | `http://localhost:5500,http://127.0.0.1:5500` | Origens permitidas pelo CORS, separadas por vírgula. Use a origem exata da página frontend, incluindo protocolo e porta. |
| `JWT_SECRET` | Gerada aleatoriamente em desenvolvimento | Segredo de assinatura das sessões. Configure um valor estável em produção; obrigatório em `NODE_ENV=production` e deve ter pelo menos 32 caracteres. |
| `BOOTSTRAP_ADMIN_EMAIL` | Sem padrão | E-mail do primeiro administrador, obrigatório quando ainda não há usuários no banco. |
| `BOOTSTRAP_ADMIN_PASSWORD` | Sem padrão | Senha do primeiro administrador, obrigatória no banco vazio e com pelo menos 12 caracteres. |
| `BOOTSTRAP_ADMIN_NAME` | `Administrador` | Nome do primeiro administrador. |
| `DB_DIR` | Diretório `backend/` | Diretório onde `src/database` cria ou abre `dbm.db`. |
| `NODE_ENV` | — | Defina como `production` para ativar as verificações de configuração de produção. |

No PowerShell, as variáveis definidas com `$env:` permanecem disponíveis apenas na janela atual:

```powershell
$env:MQTT_URL = "mqtt://broker.hivemq.com:1883"
$env:MQTT_TOPIC = "sensor/umidade"
$env:SIMULATOR_CONTROL_URL = "http://localhost:9080/bomba"
$env:BOOTSTRAP_ADMIN_EMAIL = "admin@exemplo.com"
$env:BOOTSTRAP_ADMIN_PASSWORD = "substitua-por-uma-senha-com-12-ou-mais-caracteres"
npm start
```

Para persistir uma variável no Windows para novos terminais, pode-se usar `setx`; depois é necessário abrir uma nova janela:

```powershell
setx SIMULATOR_CONTROL_URL "http://localhost:9080/bomba"
```

`localhost` sempre se refere à máquina onde o backend está rodando. Se o simulador estiver em outra máquina ou container, substitua `localhost` pelo endereço que o backend consegue alcançar.

Se o frontend for servido por outra origem, configure-a explicitamente em `FRONTEND_ORIGINS`, por exemplo: `$env:FRONTEND_ORIGINS = "http://127.0.0.1:5500"`. Não inclua caminhos como `/index.html`; CORS compara apenas origem (protocolo, host e porta).

## API disponível no servidor atual

Todas as rotas abaixo, exceto `GET /` e `POST /auth/login`, exigem sessão autenticada. A autorização por papel é aplicada no backend.

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/` | Público; verifica se o backend está respondendo. |
| `POST` | `/auth/login` | Público; autentica e define cookie de sessão HttpOnly. |
| `GET` | `/auth/me` | Sessão autenticada; retorna o usuário atual. |
| `POST` | `/auth/logout` | Sessão autenticada; encerra a sessão. |
| `GET` | `/leituras` | Sessão autenticada; lista leituras por timestamp decrescente. |
| `GET` | `/leituras/:deviceID` | Sessão autenticada; lista leituras de um dispositivo. |
| `POST` | `/leituras` | Administrador ou operador; insere uma leitura manual. |
| `GET` | `/config/thresholds/:deviceID` | Sessão autenticada; consulta limiares. |
| `PUT` | `/config/thresholds/:deviceID` | Administrador ou operador; atualiza limiares. |
| `GET` | `/usuarios` | Administrador; lista usuários. |
| `POST` | `/usuarios` | Administrador; cria usuário. |
| `PUT` | `/usuarios/:id` | Administrador; atualiza usuário. |
| `DELETE` | `/usuarios/:id` | Administrador; desativa usuário. |

### Formato de leitura

Exemplo de corpo aceito por `POST /leituras`:

```json
{
  "deviceID": "sensor_01",
  "propriedade": "Umidade",
  "valor": 147,
  "statusBomba": "desligado",
  "timestamp": "2026-09-29T22:23:44Z"
}
```

Os campos obrigatórios são `deviceID`, `propriedade`, `valor` e `timestamp`. Se `statusBomba` não for informado, o backend usa `desligado`. A resposta de sucesso é HTTP `201` com uma mensagem e o ID criado.

Exemplo PowerShell:

```powershell
$login = @{
  email = "admin@exemplo.com"
  senha = "sua-senha-inicial"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri http://localhost:3000/auth/login `
  -Method Post `
  -ContentType "application/json" `
  -Body $login `
  -SessionVariable sghiSession

$body = @{
  deviceID = "sensor_teste"
  propriedade = "Umidade"
  valor = 147
  timestamp = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri http://localhost:3000/leituras `
  -Method Post `
  -ContentType "application/json" `
  -Body $body `
  -WebSession $sghiSession
```

### Limiares da bomba

O valor do sensor é tratado na escala bruta de `0` a `409`. A configuração padrão criada para `ESP32_Irrigacao_Gabriel` usa `102` para ligar e `103` para desligar.

Exemplo para consultar:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/config/thresholds/ESP32_Irrigacao_Gabriel `
  -WebSession $sghiSession
```

Exemplo para atualizar:

```powershell
$body = @{ pumpOnAtOrBelow = 100; pumpOffAtOrAbove = 120 } | ConvertTo-Json
Invoke-RestMethod `
  -Uri http://localhost:3000/config/thresholds/ESP32_Irrigacao_Gabriel `
  -Method Put `
  -ContentType "application/json" `
  -Body $body `
  -WebSession $sghiSession
```

`pumpOnAtOrBelow` e `pumpOffAtOrAbove` precisam ser inteiros entre `0` e `409`, e o limiar para ligar deve ser menor que o limiar para desligar. Entre os dois valores, a bomba mantém o estado anterior (histerese).

## Integração MQTT

O entry point atual assina o tópico `sensor/umidade` no broker definido por `MQTT_URL`. Cada mensagem deve ser um JSON com `deviceID`, `propriedade`, `valor` e `timestamp`. O valor precisa ser numérico e estar entre `0` e `409`.

Exemplo:

```json
{
  "deviceID": "ESP32_Irrigacao_Gabriel",
  "propriedade": "Umidade",
  "valor": 147.3,
  "timestamp": "2026-09-29T22:23:44Z"
}
```

Publicação de teste usando Mosquitto e o broker público padrão:

```powershell
mosquitto_pub -h broker.hivemq.com -p 1883 -t sensor/umidade -m '{"deviceID":"ESP32_Irrigacao_Gabriel","propriedade":"Umidade","valor":147.3,"timestamp":"2026-09-29T22:23:44Z"}'
```

Se estiver usando um broker local, defina `MQTT_URL` como `mqtt://localhost:1883` e publique no mesmo broker. Mensagens inválidas ou fora da faixa são ignoradas e registradas no log.

Para que a leitura seja processada pelo controle automático, deve existir uma configuração de limiares para o `deviceID` recebido. O backend decide o estado da bomba, tenta enviar o comando HTTP e salva a leitura no SQLite.

## Controle da bomba

Quando `SIMULATOR_CONTROL_URL` estiver definida, o backend envia um `POST` JSON para essa URL com este formato:

```json
{
  "deviceID": "ESP32_Irrigacao_Gabriel",
  "ligar": true,
  "valorBruto": 147.3,
  "configVersion": 1
}
```

O serviço de controle deve responder com um status HTTP de sucesso (`2xx`). Sem `SIMULATOR_CONTROL_URL`, a decisão continua sendo calculada e registrada, mas o comando físico/simulado não é enviado. Falhas e timeouts no controle são registrados; não impedem que a leitura seja persistida.

## WebSocket

O servidor disponibiliza WebSocket autenticado no caminho:

```text
ws://localhost:3000/ws
```

O servidor envia um evento `connection.status` ao conectar. Também pode emitir eventos como `reading.created`, `thresholds.updated` e `device.status`, no formato:

```json
{
  "type": "reading.created",
  "payload": {
    "deviceID": "ESP32_Irrigacao_Gabriel",
    "propriedade": "Umidade",
    "valor": 147.3,
    "statusBomba": "ligado",
    "timestamp": "2026-09-29T22:23:44Z"
  }
}
```

O handshake do WebSocket valida o cookie de sessão e a origem de conexão contra a mesma allowlist CORS.

## Banco de dados

O entry point atual usa SQLite em `backend/dbm.db` por padrão. Configure `DB_DIR` para escolher outro diretório. O schema e os limiares iniciais são preparados na inicialização. O banco legado `sensores.db`, se existir, é migrado para `dbm.db` quando este ainda não existir; faça backup antes de mover ou migrar dados.

## Autenticação e CORS

O login cria um cookie `HttpOnly` chamado `sghi_session`; o JavaScript do frontend não lê o token diretamente. `fetch` precisa usar `credentials: 'include'` tanto para login quanto para chamadas autenticadas. O frontend deve usar a mesma origem configurada em `FRONTEND_ORIGINS`, por exemplo `http://127.0.0.1:5500`.

Para requisições com credenciais, o servidor não usa `Access-Control-Allow-Origin: *`: ele valida a origem e devolve a origem permitida literalmente, além de `Access-Control-Allow-Credentials: true`. Se a página for aberta em `http://localhost:5500`, use essa origem; `localhost` e `127.0.0.1` são origens diferentes para CORS.

Em produção, configure `JWT_SECRET` e `FRONTEND_ORIGINS`. Se `JWT_SECRET` for gerado aleatoriamente em desenvolvimento, reiniciar o processo invalida cookies emitidos antes do reinício.

## Testes

Execute a suíte a partir do diretório `backend/`:

```powershell
npm test
```

O teste de API cobre autenticação por papel, cookie de sessão, WebSocket e preflight CORS para `http://127.0.0.1:5500`. Os testes de banco cobrem inicialização do schema e migração do arquivo legado.

## Solução de problemas

### CORS bloqueado ao consultar `/auth/me`

Confirme que o servidor antigo foi encerrado e reinicie o backend com `npm start` dentro de `backend/`. O entry point atual usa allowlist e credenciais; se ainda aparecer `*`, outra instância/versão antiga do servidor está respondendo. `404` em `/auth/me` também indica que a instância não está usando o entry point atualizado. `401` sem cookie é esperado; faça login primeiro.

### Porta 3000 já está em uso

Encerre o processo que já está usando a porta ou escolha outra com `$env:PORT = "3001"` antes de iniciar.

### Nenhuma mensagem MQTT aparece

- Confirme que backend e publicador usam o mesmo `MQTT_URL` e `MQTT_TOPIC`.
- Confira no terminal as mensagens de conexão e inscrição no tópico.
- Verifique conectividade com o broker, firewall e formato JSON da mensagem.
- Confirme que `deviceID` tem limiares cadastrados e que `valor` está entre `0` e `409`.

### A leitura chega, mas a bomba não é acionada

- Confira se `SIMULATOR_CONTROL_URL` foi definida na mesma janela em que o backend foi iniciado.
- Verifique se o endereço está acessível a partir da máquina/container do backend.
- Confirme se o endpoint aceita `POST` JSON e responde com status `2xx`.
- Consulte os logs do backend para erros HTTP ou timeout.

### O processo termina com código diferente de zero

Confira a primeira mensagem de erro ou stack trace no terminal. Mensagens de inicialização como `SGHI rodando...` e `Inscrito com sucesso...` indicam que HTTP e MQTT iniciaram, mas não explicam sozinhas por que o processo terminou. Ao relatar o problema, inclua a saída desde o comando até o encerramento.
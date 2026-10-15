---
applyTo: "frontend/**"
---

# Instruções do frontend

## Reconstrução do frontend
- O frontend será reconstruído em React; não trate a interface atual como referência visual obrigatória.
- Antes de implementar, examine o frontend existente, a documentação, os requisitos das telas e os contratos do backend.
- Preserve os requisitos funcionais e a integração com o backend, mas não mantenha telas, estilos ou componentes antigos só por já existirem.
- Não altere o backend nem seus endpoints para facilitar a implementação da interface sem autorização explícita.
- Verifique as ferramentas e dependências já configuradas. Reaproveite o que for compatível e adicione apenas o necessário para React e MUI, sem substituir a configuração do projeto sem justificativa.

## Layout e identidade visual
- Implemente o template Dashboard do MUI como base visual e estrutural, adaptando-o às telas e aos fluxos deste sistema.
- Remova ou substitua conteúdo, dados e telas de demonstração do template; não os apresente como funcionalidades reais.
- Consulte os arquivos de logo, cores e tipografia como referências visuais.
- Não distorça nem altere o logo.
- Existem dois assets para identidade visual em modo dark e claro; use-os conforme o tema definido pelo usuário.
- Consulte os assets em `.github/assets/`.
- Use `.github/assets/identidadeVisualDarkMode.jpg` como referência para o modo escuro.
- Use `.github/assets/identidadeVisualLightMode.jpg` como referência para o modo claro.
- Use o [template Dashboard do MUI](https://github.com/mui/material-ui/tree/v9.5.0/docs/data/material/getting-started/templates/dashboard) como base geral das páginas. Ao iniciar uma alteração visual, informe ao usuário que esse template está sendo usado como referência.
- Para telas de CRUD, siga o padrão do [template CRUD Dashboard do MUI](https://github.com/mui/material-ui/tree/v9.5.0/docs/data/material/getting-started/templates/crud-dashboard).
- Para telas de login, siga o padrão do [template Sign-in do MUI](https://github.com/mui/material-ui/tree/v9.5.0/docs/data/material/getting-started/templates/sign-in).


## Telas e navegação
- Use os requisitos e a documentação do projeto como fonte de verdade para as telas e os fluxos.
- Diferencie rotas da interface (URLs navegadas pelo usuário) de endpoints da API (URLs chamadas pelo frontend).
- Mantenha a navegação consistente com as rotas de interface definidas e não invente telas ou fluxos sem requisito.
- O frontend deve ser responsivo, adaptando-se a diferentes tamanhos de tela e dispositivos e ser mobile-first, priorizando a experiência em dispositivos móveis.
- Use o MUI para criar componentes responsivos e consistentes com a identidade visual do projeto.
- Evite criar componentes visuais do zero; prefira os componentes do MUI e, se necessário, estenda-os com estilos personalizados.
- A tela de login deve seguir a rota /login e deve ser publicamente acessível, sem exigir autenticação. Todas as outras telas devem exigir autenticação e redirecionar para a tela de login se o usuário não estiver autenticado.
- A tela do dashboard deve seguir a rota /dashboard e ser a primeira tela acessada após o login bem-sucedido.
- A tela de gestão de usuarios deve seguir a rota /usuarios e ser acessível apenas para usuários autenticados com permissão de administrador.
- A tela de gestão de limiares deve seguir a rota /limiares e ser acessível apenas para usuários autenticados com permissão de administrador ou produtores.

## Integração com o backend
- Use os endpoints e contratos definidos pelo projeto; não invente rotas, parâmetros ou formatos de requisição e resposta.
- Respeite o método HTTP, os parâmetros, o corpo da requisição, a resposta e a autenticação definidos para cada endpoint.
- Trate estados de carregamento, sucesso, erro e ausência de dados.

## Qualidade e validação
- Crie interfaces responsivas e acessíveis, seguindo os padrões existentes.
- Execute os testes e as verificações relevantes após cada alteração significativa.
- Ao concluir, informe o que foi alterado e quais verificações foram executadas.
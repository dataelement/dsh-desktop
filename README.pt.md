<h1 align="center">
  <img src="docs/images/readme-logo-black-v020.png" width="64" alt="Logotipo do DSH Desktop" valign="middle" />
  DSH Desktop
</h1>

<p align="center">
  Um aplicativo desktop local-first e multiplataforma para o
  <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a>.
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a> · <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="Licença: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-171513.svg" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

![DSH Desktop com Preset portáteis, provedores de modelos e controle pelo celular](docs/images/dsh-desktop-hero-v020.png)

<p align="center"><strong>Use modelos oficiais da DeepSeek ou provedores de terceiros populares, gerencie Agent Preset portáteis e continue suas sessões do Harness pelo celular.</strong></p>

O DSH Desktop transforma a experiência local do DeepSeek Harness em um aplicativo desktop instalável. Ele inicia o Harness automaticamente, armazena Profile, plugins, espaços de trabalho, configurações de modelos e sessões fora do diretório do aplicativo e abre a interface completa quando o Runtime local está pronto.

> [!IMPORTANT]
> O DSH Desktop é uma versão inicial baseada no `@deepseek-ai/dsh@0.1.1-rc.2`, que evolui rapidamente. As versões para macOS são assinadas e notarizadas pela Apple. Os instaladores para Windows x64 também são assinados; os avisos de segurança do Windows podem diminuir gradualmente à medida que o editor acumula reputação de downloads e instalações.

## Download

Baixe o DSH Desktop para macOS e Windows no [site oficial](https://www.dshdesktop.com/#download).

As versões instaladas verificam atualizações logo após a inicialização e a cada seis horas. Quando há uma nova versão, o DSH Desktop pede confirmação antes do download; a instalação só começa ao escolher **Restart and install**. Também é possível verificar manualmente ou ignorar uma versão sem ocultar lançamentos futuros.

## Comunidade

<p align="center">
  Leia o código QR abaixo com o WeChat para entrar no grupo do DSH Desktop.<br />
  <img src="docs/images/wechat-group-20260815.png" width="220" alt="Código QR do grupo do DSH Desktop no WeChat" /><br />
  Você também pode entrar na <a href="https://discord.gg/he2gAKCpj">comunidade do DSH Desktop no Discord</a>.
</p>

## O que o DSH Desktop acrescenta

O DeepSeek Harness já fornece o Agent Runtime e a Web UI. O DSH Desktop acrescenta os recursos nativos necessários para um produto desktop:

- Inicia e encerra o Harness sem uma CLI separada ou outra aba do navegador
- Usa o seletor de diretórios do sistema para adicionar e gerenciar espaços de trabalho
- Oferece suporte aos modelos oficiais da DeepSeek e a provedores de terceiros populares
- Importa e exporta Agent Preset completos como [pacotes `.dshpreset`](docs/preset-packages.md) portáteis
- Preserva Profile, plugins, espaços de trabalho, sessões e configurações de modelos durante atualizações
- Detecta falhas de inicialização e de plugins da interface, guarda diagnósticos e oferece recuperação guiada
- Inclui um Modo de segurança não destrutivo que bloqueia temporariamente plugins de terceiros
- Permite que um celular pareado continue sessões pela LAN ou por um túnel público temporário opcional
- Verifica atualizações do aplicativo e mantém download e instalação sob controle do usuário
- Adapta menus, barra de título, foco da janela, tema e marca para macOS e Windows

## Acesso pelo celular

Selecione **Connect Phone…** no menu `Harness` e leia o código. O desktop precisa aprovar explicitamente a conexão antes que o celular acesse as sessões.

O Harness permanece em uma porta aleatória de `127.0.0.1`. O celular usa um Bridge separado e pareado: ele pode ficar restrito à rede local ou ativar um Cloudflare Quick Tunnel temporário para acesso remoto.

## Modo de segurança e recuperação

Se um plugin de terceiros impedir a inicialização ou a renderização, o DSH Desktop relaciona as evidências do Runtime e do frontend aos plugins instalados e abre uma recuperação guiada.

Selecione **Restart as Safe Mode…** no menu `Harness` para iniciar um Profile isolado apenas com os Bundle oficiais principais. Os plugins externos do Profile normal ficam bloqueados, mas o Agent, as sessões, as configurações de modelos e os espaços de trabalho continuam disponíveis.

Se a interface normal não abrir, inicie o aplicativo com `--safe-mode`. No macOS:

```sh
open -a "DSH Desktop" --args --safe-mode
```

## Dados locais e segurança

- A Web UI do Harness é servida somente em uma porta de loopback aleatória.
- O Renderer não tem privilégios de Node.js e usa Context Isolation e sandbox.
- WebView, navegação interna não confiável e solicitações inesperadas de permissões são bloqueados.
- Profile e sessões ficam nos dados de usuário do aplicativo, não no diretório de instalação.
- O celular exige um Token de curta duração e aprovação explícita do desktop.

## Plataformas compatíveis

| Plataforma | Distribuição | Status |
| --- | --- | --- |
| macOS Apple Silicon | DMG/ZIP assinados e notarizados | Compatível |
| macOS Intel | DMG/ZIP assinados e notarizados | Compatível |
| Windows x64 | Instalador NSIS assinado | Compatível |
| Windows ARM64 | — | Não compatível atualmente |
| Linux | — | Não compatível atualmente |

O Harness inclui dependências nativas, portanto cada artefato é compilado no sistema operacional e na arquitetura correspondentes.

## Desenvolvimento e arquitetura

- [Guia de desenvolvimento](docs/development.md) — configuração, validação, manutenção de patches e empacotamento nativo
- [Arquitetura](docs/architecture.md) — Runtime, dados, segurança, recuperação, celular e atualizações
- [Guia de lançamento](docs/release-runbook.md) — assinatura e controles de publicação
- [Formato de pacote Preset](docs/preset-packages.md) — contrato de Agent Preset portátil

Antes de enviar alterações, execute `npm test`, `npm run typecheck` e `npm run build`, e teste o fluxo afetado no aplicativo real. Nunca inclua chaves de API reais em Issue, logs, capturas de tela ou dados de teste.

## Projetos amigos

[dsh-market](https://github.com/dsh-market/dsh-market) é o mercado comunitário de plugins do DeepSeek Harness. No Harness, você pode pesquisar e visualizar plugins, instalar ou atualizar pacotes, ativá-los ou desativá-los e mudar temas.

## Licença

O DSH Desktop é distribuído sob a [Licença MIT](LICENSE).

O DeepSeek Harness e suas dependências continuam sujeitos às respectivas licenças e políticas de marcas. O DSH Desktop é um aplicativo desktop comunitário independente.

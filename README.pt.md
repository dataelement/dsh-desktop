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

![Visão geral do DSH Desktop com Preset portáteis, provedores de modelos e controle pelo celular](docs/images/dsh-desktop-hero-v020.png)

<p align="center"><strong>Além dos modelos oficiais da DeepSeek, o DSH Desktop oferece suporte aos principais provedores de modelos de terceiros. Mais experiências desktop baseadas em DSH chegarão em breve.</strong></p>

O DSH Desktop transforma a experiência web local do DeepSeek Harness em um aplicativo desktop. Ele inicia automaticamente uma instância local do Harness, gerencia uma porta de loopback aleatória, mantém Profile, plugins e sessões e abre a interface completa assim que o Harness está pronto. Os espaços de trabalho dos projetos são adicionados e gerenciados inteiramente pela interface do Harness.

> [!IMPORTANT]
> O DSH Desktop está atualmente em uma fase inicial de prévia e depende do `@deepseek-ai/dsh@0.1.1-rc.1`, que evolui rapidamente. As versões para macOS são assinadas e notarizadas pela Apple; os instaladores atuais são distribuídos pelo site oficial.

## Download

Baixe o DSH Desktop para macOS e Windows no [site oficial](https://www.dshdesktop.com/#download).

As versões instaladas para macOS e Windows verificam atualizações automaticamente após a inicialização e a cada seis horas. As atualizações são baixadas em segundo plano e, quando ficam prontas, o aplicativo solicita uma reinicialização. Também é possível selecionar **Check for Updates…** no menu do aplicativo para verificar manualmente.

## Comunidade

<p align="center">
  Leia o código QR abaixo com o WeChat para entrar no grupo da comunidade do DSH Desktop.<br />
  <img src="docs/images/wechat-group-20260815.png" width="220" alt="Código QR do grupo do DSH Desktop no WeChat" /><br />
  Prefere o Discord? <a href="https://discord.gg/he2gAKCpj">Entre na comunidade do DSH Desktop no Discord</a>.
</p>

## Por que este projeto existe

O DeepSeek Harness já oferece um Agent Runtime completo e uma Web UI. O DSH Desktop não reimplementa o Harness; ele fornece as capacidades de host necessárias para um produto desktop:

- Executar sem iniciar manualmente uma CLI ou gerenciar portas locais
- Criar automaticamente, na inicialização, um diretório de execução do Harness pertencente ao aplicativo
- Adicionar e gerenciar espaços de trabalho por meio do seletor de diretórios integrado ao Harness
- Gerenciar em um só lugar o processo filho do Harness, as verificações de prontidão, os logs e o encerramento
- Armazenar Profile, plugins e sessões fora do diretório de instalação para que as atualizações não removam dados do usuário
- Fornecer pontos de entrada para empacotamento no macOS e Windows

## Recursos

- Abre diretamente no Harness, sem uma página inicial adicional
- Inicia sem solicitar um diretório inicial, criando e reutilizando um diretório interno de execução
- Oferece opções de tentar novamente, visualizar logs e sair quando o Harness não consegue iniciar
- Disponibiliza ações no menu do Harness para reiniciar o processo filho e visualizar seu log
- Encerra corretamente o processo filho do Harness quando o aplicativo desktop é fechado
- Escuta apenas em uma porta aleatória de `127.0.0.1` a cada inicialização
- Remove os privilégios de Node.js do Renderer e ativa `contextIsolation`, sandbox e restrições de navegação
- Usa o logotipo da marca DSH de forma consistente na janela desktop e na barra lateral do Harness
- Importa e exporta Preset personalizados completos como [pacotes `.dshpreset`](docs/preset-packages.md) portáteis, com verificação de conflitos e aviso de confiança antes da instalação
- Inclui um ícone de produção do DSH nos formatos ICNS do macOS e ICO do Windows

## Projetos amigos

[dsh-market](https://github.com/dsh-market/dsh-market) — o mercado de plugins do DeepSeek Harness: navegue e pesquise entre mais de 900 plugins da comunidade, veja capturas de tela e instale, atualize, ative ou desative plugins, ou altere temas com um clique. A maioria das mudanças entra em vigor imediatamente, sem reinicialização.

## Início rápido

### Requisitos

- Node.js 22 ou posterior
- npm
- macOS em Apple Silicon ou Intel, ou Windows x64

### Desenvolvimento local

```bash
git clone https://github.com/dataelement/dsh-desktop.git
cd dsh-desktop
npm install
npm run dev
```

O `npm install` executa o `patch-package` para reaplicar a configuração inicial de provedores de modelos, a transferência de pacotes Preset e a identidade visual da barra lateral do DSH Desktop; depois, instala os recursos da marca e o Electron Runtime.

### Verificações de qualidade

```bash
npm test
npm run typecheck
npm run build
```

### Empacotamento

```bash
# Gerar artefatos DMG e ZIP não assinados para a arquitetura atual do Mac
npm run package:mac

# Executar cada comando em um Mac ou CI Runner com a arquitetura correspondente
npm run package:mac:arm64
npm run package:mac:x64

# Gerar artefatos NSIS e Portable em uma máquina ou Runner Windows x64
npm run package:win
```

O Harness inclui módulos nativos específicos de arquitetura. As dependências devem ser reinstaladas e compiladas na plataforma correspondente para macOS ARM64, macOS Intel e Windows x64. Os scripts específicos de arquitetura validam o `platform/arch` atual antes do empacotamento para impedir artefatos que parecem ter sido criados corretamente, mas não incluem as dependências nativas.

## Arquitetura de execução

```text
DSH Desktop (Electron Main)
├── Diretório de execução pertencente ao aplicativo
├── Ciclo de vida do processo filho do Harness
├── Porta de loopback aleatória e verificações de prontidão
├── Logs nativos e ações de recuperação
└── BrowserWindow reforçada
     └── http://127.0.0.1:<random>  DeepSeek Harness Web UI

Electron userData
├── launch-root/
├── logs/harness.log
└── harness/
    ├── profiles/
    ├── sessions/
    └── Plugins e dados do usuário
```

O Harness é executado em um processo filho independente do Electron Node. A permissão `--expose-internals`, necessária para o Cordis HMR, é concedida apenas a esse processo filho e nunca ao Web Renderer.

## Estrutura do projeto

```text
src/main/             Processo principal do Electron, janelas e ciclo de vida do Harness
src/shared/           Tipos compartilhados do ambiente de execução
patches/              Personalizações reproduzíveis de UI para a versão fixada do DSH
scripts/              Instalação de recursos da marca e verificações de empacotamento por plataforma
test/                 Testes de configurações, execução, segurança e provedores
build/                Recursos do ícone do aplicativo
```

## Status atual de validação

- macOS Apple Silicon: fluxo de desenvolvimento, inicialização real do Harness, empacotamento DMG, assinatura de código, notarização da Apple e artefato montado verificados
- macOS Intel: configuração de empacotamento e verificações de plataforma disponíveis; a validação em execução ainda requer um Intel Mac ou Runner
- Windows x64: configuração NSIS/Portable e verificações de plataforma disponíveis; a validação em execução ainda requer um Windows Runner
- Windows ARM64: não compatível no momento
- Atualizações automáticas: ainda não integradas

## Versão upstream e patches

O projeto fixa atualmente `@deepseek-ai/dsh@0.1.1-rc.1`. A lista inicial de provedores e a interface desktop de transferência de Preset são mantidas com o [`patch-package`](https://github.com/ds300/patch-package) em [`patches/`](patches/), em vez de depender de alterações não rastreadas em `node_modules`.

Ao atualizar o DSH:

1. Verifique os contratos upstream de Settings, Credentials e Provider Directory.
2. Reaplique ou reescreva a interface de integração personalizada.
3. Gere novamente o patch.
4. Execute verificações de regressão com uma inicialização real do Harness e o fluxo de configuração de provedores.

## Contribuição

Issue e Pull Request são bem-vindos. Antes de enviar uma alteração, execute pelo menos:

```bash
npm test
npm run typecheck
npm run build
```

Nunca inclua chaves de API reais em Issue, logs, capturas de tela ou dados de teste.

## Licença

Este projeto é open source sob a [licença MIT](LICENSE).

O DeepSeek Harness e suas dependências continuam sujeitos às respectivas licenças upstream e políticas de marcas. O DSH Desktop é um aplicativo desktop independente criado pela comunidade.

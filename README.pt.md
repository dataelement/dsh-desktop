<h1 align="center">
  <img src="docs/images/readme-logo-black-rounded.svg" width="64" alt="Logotipo do DSH Desktop" valign="middle" />
  DSH Desktop
</h1>

<p align="center">
  <strong>DSH Desktop by Dataelem</strong> é um aplicativo Agent para desktop desenvolvido pela equipe da Dataelem com base no framework DeepSeek Harness, disponível em edições de código aberto e <a href="https://www.dshdesktop.com/pt/enterprise/">empresarial</a>.<br />
  Site oficial：<a href="https://www.dshdesktop.com/">www.dshdesktop.com</a>
</p>

<p align="center">
  <a href="README.md">简体中文</a> · <a href="README.en.md">English</a> · <a href="README.ja.md">日本語</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a> · <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="Licença: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-171513.svg" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

![DSH Desktop com Preset portáteis, provedores de modelos, controle pelo celular e geração de PPTX editáveis](docs/images/dsh-desktop-hero-v021.png)

Baseado no DeepSeek Harness, com melhorias na integração de modelos, modelos de Word / Excel / PPT, recuperação de inicialização e aplicativos Workbench.

## Download

Baixe o DSH Desktop pelo [site oficial](https://www.dshdesktop.com/pt/).

O DSH Desktop verifica atualizações automaticamente. As novas versões são disponibilizadas primeiro a um grupo limitado de usuários para testes e, após a confirmação de sua estabilidade, são distribuídas a todos os usuários.

## Comunidade

<p align="center">
  Leia o código QR abaixo com o WeChat para entrar no grupo do DSH Desktop.<br />
  <img src="docs/images/wechat-group-20260815.png" width="220" alt="Código QR do grupo do DSH Desktop no WeChat" /><br />
  Você também pode entrar na <a href="https://discord.gg/7Xgf3qe3Qp">comunidade do DSH Desktop no Discord</a>.
</p>

## O que o DSH Desktop acrescenta

O DeepSeek Harness fornece o Agent Runtime, a Web UI e a conexão básica com modelos. O DSH Desktop amplia essas bases com:

- **Integração de modelos**: configuração inicial aprimorada, busca de modelos, configuração de entrada de imagens e raciocínio, e compatibilidade com modelos de terceiros.
- **Modelos de Office**: edição de modelos nativos de Word, pastas de trabalho de exemplo de Excel e modelos PPT editáveis, com habilidades de negócio para criar DOCX, XLSX e PPTX; Python e dependências de Office incluídos.
- **Recuperação de falhas**: diagnósticos de inicialização e interface, recuperação guiada, Modo de segurança e acesso a um Agent de reparo, priorizando a preservação de sessões e configurações.
- **Workbench**: navegar, instalar pelo mercado ou importar localmente e abrir aplicativos que reutilizam as conversas do Harness.
- **Preset portáteis**: importar e exportar [pacotes `.dshpreset`](docs/preset-packages.md), com verificação de conflitos e avisos de confiança.
- **Acesso pelo celular**: pareamento por QR e continuação de sessões pela LAN ou por um túnel público opcional.
- **Experiência nativa**: gerenciamento da inicialização do Harness, seletor de pastas do sistema, menus e janelas nativos, preservação de dados e verificação automática de atualizações.

## Suíte Office

Escolha o modo Word, Excel ou PPT, um modelo e os materiais para o Agent criar arquivos editáveis.

- **Word**: preserva o layout e os estilos de modelos nativos para avisos, atas e relatórios, com saída DOCX.
- **Excel**: organiza dados, análises e gráficos com pastas de trabalho de exemplo, com saída XLSX.
- **PPT**: **16 modelos integrados e 192 layouts**, saída PPTX editável e importação de modelos pessoais. As prévias integradas são em inglês; as apresentações podem ser em inglês ou chinês. O idioma da prévia não determina o resultado.

Python e dependências de Office estão incluídos, sem instalar outro ambiente de execução. As instruções do modo de modelos PPT só se aplicam quando ele está ativado na sessão atual.

## Workbench

O Workbench combina interfaces específicas de negócio com conversas do Agent, oferecendo mais do que um chat.

Navegue, favorite e instale aplicativos pelo mercado ou importe um Workbench desenvolvido localmente. Use a interface com as conversas associadas do Agent; após instalar ou atualizar, reinicie quando solicitado. Remover um Workbench preserva as sessões e os arquivos do projeto.

## Acesso pelo celular

Selecione **Connect Phone…** no menu `Harness` e leia o QR. No Wi-Fi a conexão é imediata; pela internet também digite a senha de 6 dígitos do computador. Por padrão ela vale por 5 minutos; uma senha duradoura só é salva com sua autorização na janela de conexão.

Você pode usar a LAN ou um túnel público temporário. Se o Cloudflare estiver indisponível, usa-se o Pinggy; o Pinggy gratuito expira em cerca de 60 minutos.

Se o Cloudflare não iniciar, o aplicativo tenta usar o Pinggy. Se o link do Cloudflare aparecer, mas o celular não conseguir abri-lo, selecione **Can’t open? Try another link** para mudar para o Pinggy.

## Modo de segurança e recuperação

Se um plugin de terceiros impedir a inicialização ou a renderização, o DSH Desktop relaciona as evidências do Runtime e do frontend aos plugins instalados e abre uma recuperação guiada.

Selecione **Restart as Safe Mode…** no menu `Harness` para bloquear temporariamente plugins externos e manter o Agent, as sessões, os modelos e os espaços de trabalho. Desative o plugin problemático na tela de gerenciamento e reinicie normalmente para verificar a recuperação. Desativar não remove o plugin nem os dados, e ele pode ser reativado depois.

A tela de recuperação verifica se há atualizações compatíveis dos plugins e permite instalá-las quando disponíveis. O Modo de segurança também permite atualizar vários plugins de uma vez. Para obter ajuda, passe o cursor sobre **WeChat group** para exibir o QR code ou clique em **Discord** para abrir a comunidade.

Se a interface normal não abrir, inicie o aplicativo com `--safe-mode`. No macOS:

```sh
open -a "DSH Desktop" --args --safe-mode
```

## Dados locais e segurança

- Sessões e configurações ficam nos dados locais do usuário e são preservadas nas atualizações do aplicativo.
- O navegador lateral integrado é isolado dos privilégios do aplicativo; links externos comuns abrem no navegador do sistema.
- Pareie o celular lendo o código; pela internet também é exigida a senha mostrada no computador.
- Arquivos e comandos do Agent estão sujeitos a controles de permissão. Aprove ações sensíveis com cuidado e instale apenas plugins confiáveis.

## Plataformas compatíveis

| Plataforma | Distribuição | Status |
| --- | --- | --- |
| macOS Apple Silicon | DMG/ZIP assinados e notarizados | Compatível |
| macOS Intel | DMG/ZIP assinados e notarizados | Compatível |
| Windows x64 | Instalador NSIS assinado | Compatível |
| Windows ARM64 | — | Não compatível atualmente |
| Linux x64 | deb/AppImage não assinados, compilados do código-fonte | Compilação local compatível |

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

## Conheça a edição empresarial

A edição empresarial combina o cliente de desktop BISHENG com o servidor da plataforma empresarial BISHENG. Baseado no DSH Desktop, o cliente permite trabalhar com arquivos locais e modelos, conhecimento, ferramentas e habilidades autorizados por meio de uma conta empresarial. O servidor configura recursos e permissões de forma centralizada e gerencia créditos e uso. O cliente e o servidor BISHENG da edição empresarial são de código aberto; o código-fonte está disponível nos repositórios abaixo.

[Código da plataforma de gestão empresarial](https://github.com/dataelement/bisheng) · [Repositório do cliente empresarial](https://github.com/dataelement/bisheng-desktop) · [Sobre a edição empresarial](https://www.dshdesktop.com/pt/enterprise/)

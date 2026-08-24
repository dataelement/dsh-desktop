<h1 align="center">
  <img src="docs/images/readme-logo-black-v020.png" width="64" alt="Logotipo de DSH Desktop" valign="middle" />
  DSH Desktop
</h1>

<p align="center">
  Una aplicación de escritorio local, multiplataforma y diseñada para
  <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a>.
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a> · <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="Licencia: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-171513.svg" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

![Vista general de DSH Desktop con Preset portátiles, proveedores de modelos y control desde el teléfono](docs/images/dsh-desktop-hero-v020.png)

<p align="center"><strong>Además de los modelos oficiales de DeepSeek, DSH Desktop admite los principales proveedores de modelos de terceros. Próximamente llegarán más experiencias de escritorio impulsadas por DSH.</strong></p>

DSH Desktop convierte la experiencia web local de DeepSeek Harness en una aplicación de escritorio. Inicia automáticamente una instancia local de Harness, administra un puerto loopback aleatorio, conserva Profile, plugins y sesiones, y abre la interfaz completa en cuanto Harness está listo. Los espacios de trabajo de los proyectos se añaden y administran íntegramente desde la interfaz de Harness.

> [!IMPORTANT]
> DSH Desktop se encuentra actualmente en una fase preliminar y depende de `@deepseek-ai/dsh@0.1.1-rc.1`, que evoluciona rápidamente. Las versiones para macOS están firmadas y notarizadas por Apple; los instaladores actuales se distribuyen a través del sitio web oficial.

## Descarga

Descarga DSH Desktop para macOS y Windows desde el [sitio web oficial](https://www.dshdesktop.com/#download).

Las versiones instaladas para macOS y Windows comprueban las actualizaciones automáticamente después del inicio y cada seis horas. Las actualizaciones se descargan en segundo plano y, cuando están listas, se solicita reiniciar la aplicación. También puedes elegir **Check for Updates…** en el menú de la aplicación para comprobarlas manualmente.

## Comunidad

<p align="center">
  Escanea el siguiente código QR con WeChat para unirte al grupo de la comunidad de DSH Desktop.<br />
  <img src="docs/images/wechat-group-20260815.png" width="220" alt="Código QR del grupo de DSH Desktop en WeChat" /><br />
  ¿Prefieres Discord? <a href="https://discord.gg/he2gAKCpj">Únete a la comunidad de DSH Desktop en Discord</a>.
</p>

## Por qué existe este proyecto

DeepSeek Harness ya ofrece un Agent Runtime completo y una Web UI. DSH Desktop no vuelve a implementar Harness; proporciona las capacidades de host necesarias para convertirlo en un producto de escritorio:

- Ejecutarlo sin iniciar manualmente una CLI ni administrar puertos locales
- Crear automáticamente un directorio de inicio de Harness propiedad de la aplicación
- Añadir y administrar espacios de trabajo mediante el selector de directorios integrado en Harness
- Administrar en un solo lugar el proceso secundario de Harness, las comprobaciones de disponibilidad, los registros y el apagado
- Guardar Profile, plugins y sesiones fuera del directorio de instalación para que las actualizaciones no eliminen los datos del usuario
- Proporcionar puntos de entrada de empaquetado para macOS y Windows

## Funciones

- Abre Harness directamente, sin una página de inicio adicional
- Se inicia sin pedir un directorio inicial, ya que crea y reutiliza un directorio interno de inicio
- Permite reintentar, consultar los registros o salir cuando Harness no puede iniciarse
- Incluye acciones en el menú de Harness para reiniciar el proceso secundario y consultar su registro
- Finaliza correctamente el proceso secundario de Harness cuando se cierra la aplicación
- Escucha únicamente en un puerto aleatorio de `127.0.0.1` en cada inicio
- Elimina los privilegios de Node.js del Renderer y activa `contextIsolation`, sandbox y restricciones de navegación
- Utiliza el logotipo de DSH de forma coherente en la ventana de escritorio y la barra lateral de Harness
- Importa y exporta Preset personalizados completos como [paquetes `.dshpreset`](docs/preset-packages.md) portátiles, con comprobaciones de conflictos y una advertencia de confianza antes de la instalación
- Incluye un icono de producción de DSH en los formatos ICNS de macOS e ICO de Windows

## Proyectos amigos

[dsh-market](https://github.com/dsh-market/dsh-market) — el mercado de plugins para DeepSeek Harness: explora y busca entre más de 900 plugins de la comunidad, consulta capturas de pantalla e instala, actualiza, activa o desactiva plugins, o cambia de tema con un solo clic. La mayoría de los cambios se aplican de inmediato, sin reiniciar.

## Inicio rápido

### Requisitos

- Node.js 22 o posterior
- npm
- macOS en Apple Silicon o Intel, o Windows x64

### Desarrollo local

```bash
git clone https://github.com/dataelement/dsh-desktop.git
cd dsh-desktop
npm install
npm run dev
```

`npm install` ejecuta `patch-package` para volver a aplicar la configuración inicial de proveedores de modelos, la transferencia de paquetes Preset y la identidad visual de la barra lateral de DSH Desktop; después instala los recursos de marca y el Electron Runtime.

### Comprobaciones de calidad

```bash
npm test
npm run typecheck
npm run build
```

### Empaquetado

```bash
# Generar artefactos DMG y ZIP sin firmar para la arquitectura actual del Mac
npm run package:mac

# Ejecutar cada comando en un Mac o CI Runner con la arquitectura correspondiente
npm run package:mac:arm64
npm run package:mac:x64

# Generar artefactos NSIS y Portable en una máquina o Runner con Windows x64
npm run package:win
```

Harness incluye módulos nativos específicos de cada arquitectura. Las dependencias deben reinstalarse y compilarse en la plataforma correspondiente para macOS ARM64, macOS Intel y Windows x64. Los scripts específicos de arquitectura validan el `platform/arch` actual antes de empaquetar, para evitar artefactos que parecen haberse creado correctamente pero carecen de dependencias nativas.

## Arquitectura de ejecución

```text
DSH Desktop (Electron Main)
├── Directorio de inicio propiedad de la aplicación
├── Ciclo de vida del proceso secundario de Harness
├── Puerto loopback aleatorio y comprobaciones de disponibilidad
├── Registro nativo y acciones de recuperación
└── BrowserWindow reforzada
     └── http://127.0.0.1:<random>  DeepSeek Harness Web UI

Electron userData
├── launch-root/
├── logs/harness.log
└── harness/
    ├── profiles/
    ├── sessions/
    └── Plugins y datos del usuario
```

Harness se ejecuta en un proceso secundario independiente de Electron Node. El permiso `--expose-internals` que necesita Cordis HMR se concede únicamente a ese proceso secundario y nunca al Web Renderer.

## Estructura del proyecto

```text
src/main/             Proceso principal de Electron, ventanas y ciclo de vida de Harness
src/shared/           Tipos compartidos del entorno de ejecución
patches/              Personalizaciones de UI reproducibles para la versión fijada de DSH
scripts/              Instalación de recursos de marca y comprobaciones de empaquetado por plataforma
test/                 Pruebas de configuración, ejecución, seguridad y proveedores
build/                Recursos del icono de la aplicación
```

## Estado actual de validación

- macOS Apple Silicon: verificados el flujo de desarrollo, el inicio real de Harness, el empaquetado DMG, la firma de código, la notarización de Apple y el artefacto montado
- macOS Intel: se proporcionan la configuración de empaquetado y las comprobaciones de plataforma; la validación en ejecución todavía requiere un Intel Mac o Runner
- Windows x64: se proporcionan la configuración NSIS/Portable y las comprobaciones de plataforma; la validación en ejecución todavía requiere un Windows Runner
- Windows ARM64: no compatible actualmente
- Actualizaciones automáticas: aún no integradas

## Versión upstream y parches

El proyecto fija actualmente `@deepseek-ai/dsh@0.1.1-rc.1`. La lista inicial de proveedores y la interfaz de transferencia de Preset para escritorio se guardan mediante [`patch-package`](https://github.com/ds300/patch-package) dentro de [`patches/`](patches/), en lugar de depender de cambios sin seguimiento en `node_modules`.

Al actualizar DSH:

1. Verifica los contratos upstream de Settings, Credentials y Provider Directory.
2. Vuelve a aplicar o reescribe la interfaz de incorporación personalizada.
3. Regenera el parche.
4. Ejecuta comprobaciones de regresión con un inicio real de Harness y el flujo de configuración de proveedores.

## Contribuciones

Los Issue y Pull Request son bienvenidos. Antes de enviar un cambio, ejecuta como mínimo:

```bash
npm test
npm run typecheck
npm run build
```

Nunca incluyas claves API reales en Issue, registros, capturas de pantalla ni datos de prueba.

## Licencia

Este proyecto es de código abierto bajo la [licencia MIT](LICENSE).

DeepSeek Harness y sus dependencias continúan sujetos a sus respectivas licencias upstream y políticas de marcas. DSH Desktop es una aplicación de escritorio independiente creada por la comunidad.

<h1 align="center">
  <img src="docs/images/readme-logo-black-rounded.svg" width="64" alt="Logotipo de DSH Desktop" valign="middle" />
  DSH Desktop
</h1>

<p align="center">
  <strong>DSH Desktop by Dataelem</strong> es una aplicación Agent de escritorio desarrollada por el equipo de Dataelem sobre el framework DeepSeek Harness, disponible en ediciones de código abierto y <a href="https://www.dshdesktop.com/es/enterprise/">empresarial</a>.<br />
  Sitio web oficial：<a href="https://www.dshdesktop.com/">www.dshdesktop.com</a>
</p>

<p align="center">
  <a href="README.md">简体中文</a> · <a href="README.en.md">English</a> · <a href="README.ja.md">日本語</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a> · <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="Licencia: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-171513.svg" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

![DSH Desktop con Preset portátiles, proveedores de modelos, control desde el teléfono y generación de PPTX editables](docs/images/dsh-desktop-hero-v021.png)

Basado en DeepSeek Harness, con mejoras en la integración de modelos, plantillas de Word / Excel / PPT, recuperación de inicio y aplicaciones Workbench.

## Descarga

Descarga DSH Desktop desde el [sitio web oficial](https://www.dshdesktop.com/es/).

DSH Desktop busca actualizaciones automáticamente. Las nuevas versiones se distribuyen primero a un grupo limitado de usuarios para probarlas y, una vez confirmada su estabilidad, se ofrecen a todos los usuarios.

## Comunidad

<p align="center">
  Escanea el siguiente código QR con WeChat para unirte al grupo de DSH Desktop.<br />
  <img src="docs/images/wechat-group-20260815.png" width="220" alt="Código QR del grupo de DSH Desktop en WeChat" /><br />
  También puedes unirte a la <a href="https://discord.gg/7Xgf3qe3Qp">comunidad de DSH Desktop en Discord</a>.
</p>

## Qué añade DSH Desktop

DeepSeek Harness proporciona el Agent Runtime, la Web UI y la conexión básica con modelos. DSH Desktop amplía estas bases con:

- **Integración de modelos**: configuración inicial mejorada, búsqueda de modelos, configuración de entrada de imágenes y razonamiento, y compatibilidad con modelos externos.
- **Plantillas de Office**: edición de plantillas nativas de Word, libros de ejemplo de Excel y plantillas PPT editables, junto con habilidades de negocio para crear DOCX, XLSX y PPTX; Python y dependencias de Office incluidos.
- **Recuperación de fallos**: diagnósticos de inicio e interfaz, recuperación guiada, Modo seguro y acceso a un Agent de reparación, priorizando la conservación de sesiones y ajustes.
- **Workbench**: explorar, instalar desde el mercado o importar localmente y abrir aplicaciones que reutilizan las conversaciones de Harness.
- **Preset portátiles**: importar y exportar [paquetes `.dshpreset`](docs/preset-packages.md), con comprobación de conflictos y advertencias de confianza.
- **Acceso desde el teléfono**: vinculación por QR y continuación de sesiones por LAN o un túnel público opcional.
- **Experiencia nativa**: gestión del inicio y cierre de Harness, selector de carpetas del sistema, menús y ventanas nativos, conservación de datos y búsqueda automática de actualizaciones.

## Suite Office

Elige un modo Word, Excel o PPT, una plantilla y los materiales para que el Agent cree archivos editables.

- **Word**: conserva el diseño y los estilos de plantillas nativas para avisos, actas e informes, con salida DOCX.
- **Excel**: organiza datos, análisis y gráficos a partir de libros de ejemplo, con salida XLSX.
- **PPT**: **16 plantillas integradas y 192 diseños**, salida PPTX editable e importación de plantillas personales. Las vistas previas integradas están en inglés; las presentaciones admiten inglés y chino. El idioma de la vista previa no determina el resultado.

Python y las dependencias de Office vienen incluidos, sin instalar otro entorno de ejecución. Las instrucciones del modo de plantillas PPT solo se aplican cuando está activado en la sesión actual.

## Workbench

Workbench combina interfaces específicas de negocio con conversaciones del Agent para ofrecer algo más que un chat.

Explora, marca como favoritas e instala aplicaciones del mercado, o importa un Workbench desarrollado localmente. Utiliza su interfaz junto con las conversaciones asociadas del Agent; después de instalar o actualizar, reinicia cuando se indique. Quitar un Workbench conserva las sesiones y los archivos del proyecto.

## Acceso desde el teléfono

Elige **Connect Phone…** en el menú `Harness` y escanea el QR. Por Wi-Fi la conexión es inmediata; por internet también debes introducir la contraseña de 6 dígitos del ordenador. Por defecto caduca en 5 minutos; solo se guarda una contraseña duradera si lo autorizas en la ventana de conexión.

Puedes usar la LAN o un túnel público temporal. Si Cloudflare no está disponible se usa Pinggy; el servicio gratuito de Pinggy caduca tras unos 60 minutos.

Si Cloudflare no se inicia, la aplicación intenta usar Pinggy. Si aparece el enlace de Cloudflare pero el teléfono no puede abrirlo, selecciona **Can’t open? Try another link** para cambiar a Pinggy.

## Modo seguro y recuperación

Si un plugin de terceros impide el inicio o la visualización, DSH Desktop relaciona la evidencia del Runtime y del frontend con los plugins instalados y abre una recuperación guiada.

Elige **Restart as Safe Mode…** en el menú `Harness` para bloquear temporalmente plugins externos y conservar el Agent, las sesiones, los modelos y los espacios de trabajo. Desactiva el plugin problemático en la pantalla de gestión y reinicia normalmente para comprobar la recuperación. Desactivarlo no elimina el plugin ni los datos y puedes volver a activarlo después.

La pantalla de recuperación busca actualizaciones compatibles de los plugins y permite instalarlas cuando están disponibles. El Modo seguro también permite actualizar varios plugins a la vez. Para pedir ayuda, pasa el cursor sobre **WeChat group** para mostrar el código QR, o haz clic en **Discord** para abrir la comunidad.

Si no puedes abrir la interfaz normal, inicia la aplicación con `--safe-mode`. En macOS:

```sh
open -a "DSH Desktop" --args --safe-mode
```

## Datos locales y seguridad

- Las sesiones y los ajustes se guardan localmente en los datos de usuario y se conservan al actualizar la aplicación.
- El navegador lateral integrado está aislado de los privilegios de la aplicación; los enlaces externos habituales se abren en el navegador del sistema.
- Vincula el teléfono escaneando el código; por internet también se requiere la contraseña mostrada en el ordenador.
- Los archivos y comandos del Agent están sujetos a controles de permisos. Aprueba las acciones sensibles con cuidado e instala solo plugins de confianza.

## Plataformas compatibles

| Plataforma | Distribución | Estado |
| --- | --- | --- |
| macOS Apple Silicon | DMG/ZIP firmados y notarizados | Compatible |
| macOS Intel | DMG/ZIP firmados y notarizados | Compatible |
| Windows x64 | Instalador NSIS firmado | Compatible |
| Windows ARM64 | — | No compatible actualmente |
| Linux x64 | deb/AppImage sin firmar compilados desde el código fuente | Compilación local compatible |

Harness incluye dependencias nativas, por lo que cada artefacto se compila en el sistema operativo y la arquitectura correspondientes.

## Desarrollo y arquitectura

- [Guía de desarrollo](docs/development.md) — configuración, validación, mantenimiento de parches y empaquetado nativo
- [Arquitectura](docs/architecture.md) — Runtime, datos, seguridad, recuperación, teléfono y actualizaciones
- [Guía de publicación](docs/release-runbook.md) — firma y controles de publicación
- [Formato de paquetes Preset](docs/preset-packages.md) — contrato de Agent Preset portátil

Antes de enviar cambios, ejecuta `npm test`, `npm run typecheck` y `npm run build`, y prueba en la aplicación real el flujo afectado. Nunca incluyas claves API reales en Issue, registros, capturas o datos de prueba.

## Proyectos amigos

[dsh-market](https://github.com/dsh-market/dsh-market) es el mercado comunitario de plugins para DeepSeek Harness. Desde Harness puedes buscar y previsualizar plugins, instalar o actualizar paquetes, activarlos o desactivarlos y cambiar temas.

## Licencia

DSH Desktop se publica bajo la [licencia MIT](LICENSE).

DeepSeek Harness y sus dependencias siguen sujetos a sus licencias y políticas de marcas correspondientes. DSH Desktop es una aplicación de escritorio comunitaria independiente.

## Conoce la edición empresarial

La edición empresarial combina el cliente de escritorio BISHENG con el servidor de la plataforma empresarial BISHENG. El cliente, basado en DSH Desktop, permite trabajar con archivos locales y modelos, conocimiento, herramientas y habilidades autorizados mediante una cuenta empresarial. El servidor configura recursos y permisos de forma centralizada y gestiona créditos y uso. Tanto el cliente como el servidor BISHENG de la edición empresarial son de código abierto; su código fuente está disponible en los repositorios siguientes.

[Código de la plataforma de gestión empresarial](https://github.com/dataelement/bisheng) · [Repositorio del cliente empresarial](https://github.com/dataelement/bisheng-desktop) · [Acerca de la edición empresarial](https://www.dshdesktop.com/es/enterprise/)

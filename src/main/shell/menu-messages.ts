import { desktopLocale, type DesktopLocale } from '../../shared/desktop-locale'

const en = {
  enterprise: 'Explore Enterprise', update: 'Check for Updates…', about: 'About DSH Desktop', safeMode: 'Restart as Safe Mode…', restart: 'Restart',
  fileMenu: 'File', closePage: 'Close Page or Window', edit: 'Edit', undo: 'Undo', redo: 'Redo', cut: 'Cut', copy: 'Copy', copyAction: 'Copy', paste: 'Paste', selectAll: 'Select All', window: 'Window', minimize: 'Minimize', close: 'Close',
  hide: 'Hide {app}', hideOthers: 'Hide Others', showAll: 'Show All', quitApp: 'Quit {app}', application: 'Application', phone: 'Connect Phone…', log: 'Show Harness Log', exit: 'Exit', view: 'View', reload: 'Reload', devtools: 'Developer Tools', actualSize: 'Actual Size', zoomIn: 'Zoom In', zoomOut: 'Zoom Out', fullscreen: 'Toggle Full Screen', delete: 'Delete', zoomCurrent: 'Actual Size (now {zoom})'
}

type MenuMessages = Record<keyof typeof en, string>
export const menuMessages: Record<DesktopLocale, MenuMessages> = {
  en,
  zh: {
    enterprise: '了解企业版', update: '检查更新…', about: '关于 DSH Desktop', safeMode: '以安全模式重启…', restart: '重启', fileMenu: '文件', closePage: '关闭页面或窗口', edit: '编辑', undo: '撤销', redo: '重做', cut: '剪切', copy: '拷贝', copyAction: '复制', paste: '粘贴', selectAll: '全选', window: '窗口', minimize: '最小化', close: '关闭', hide: '隐藏 {app}', hideOthers: '隐藏其他', showAll: '全部显示', quitApp: '退出 {app}', application: '应用', phone: '连接手机…', log: '显示 Harness 日志', exit: '退出', view: '视图', reload: '重新加载', devtools: '开发者工具', actualSize: '实际大小', zoomIn: '放大', zoomOut: '缩小', fullscreen: '切换全屏', delete: '删除', zoomCurrent: '实际大小（当前 {zoom}）'
  },
  ja: {
    enterprise: 'エンタープライズ版について', update: 'アップデートを確認…', about: 'DSH Desktop について', safeMode: 'セーフモードで再起動…', restart: '再起動', fileMenu: 'ファイル', closePage: 'ページまたはウィンドウを閉じる', edit: '編集', undo: '取り消す', redo: 'やり直す', cut: '切り取り', copy: 'コピー', copyAction: 'コピー', paste: '貼り付け', selectAll: 'すべて選択', window: 'ウィンドウ', minimize: '最小化', close: '閉じる', hide: '{app} を隠す', hideOthers: 'ほかを隠す', showAll: 'すべて表示', quitApp: '{app} を終了', application: 'アプリケーション', phone: 'スマートフォンを接続…', log: 'Harness ログを表示', exit: '終了', view: '表示', reload: '再読み込み', devtools: '開発者ツール', actualSize: '実際のサイズ', zoomIn: '拡大', zoomOut: '縮小', fullscreen: 'フルスクリーン切り替え', delete: '削除', zoomCurrent: '実際のサイズ（現在 {zoom}）'
  },
  es: {
    enterprise: 'Conocer la edición empresarial', update: 'Buscar actualizaciones…', about: 'Acerca de DSH Desktop', safeMode: 'Reiniciar en modo seguro…', restart: 'Reiniciar', fileMenu: 'Archivo', closePage: 'Cerrar página o ventana', edit: 'Editar', undo: 'Deshacer', redo: 'Rehacer', cut: 'Cortar', copy: 'Copiar', copyAction: 'Copiar', paste: 'Pegar', selectAll: 'Seleccionar todo', window: 'Ventana', minimize: 'Minimizar', close: 'Cerrar', hide: 'Ocultar {app}', hideOthers: 'Ocultar otras', showAll: 'Mostrar todo', quitApp: 'Salir de {app}', application: 'Aplicación', phone: 'Conectar teléfono…', log: 'Mostrar registro de Harness', exit: 'Salir', view: 'Ver', reload: 'Recargar', devtools: 'Herramientas de desarrollo', actualSize: 'Tamaño real', zoomIn: 'Acercar', zoomOut: 'Alejar', fullscreen: 'Alternar pantalla completa', delete: 'Eliminar', zoomCurrent: 'Tamaño real (actual: {zoom})'
  },
  fr: {
    enterprise: 'Découvrir la version entreprise', update: 'Rechercher des mises à jour…', about: 'À propos de DSH Desktop', safeMode: 'Redémarrer en mode sans échec…', restart: 'Redémarrer', fileMenu: 'Fichier', closePage: 'Fermer la page ou la fenêtre', edit: 'Édition', undo: 'Annuler', redo: 'Rétablir', cut: 'Couper', copy: 'Copier', copyAction: 'Copier', paste: 'Coller', selectAll: 'Tout sélectionner', window: 'Fenêtre', minimize: 'Réduire', close: 'Fermer', hide: 'Masquer {app}', hideOthers: 'Masquer les autres', showAll: 'Tout afficher', quitApp: 'Quitter {app}', application: 'Application', phone: 'Connecter un téléphone…', log: 'Afficher le journal Harness', exit: 'Quitter', view: 'Affichage', reload: 'Recharger', devtools: 'Outils de développement', actualSize: 'Taille réelle', zoomIn: 'Agrandir', zoomOut: 'Réduire', fullscreen: 'Basculer en plein écran', delete: 'Supprimer', zoomCurrent: 'Taille réelle (actuelle : {zoom})'
  },
  de: {
    enterprise: 'Enterprise-Version entdecken', update: 'Nach Updates suchen…', about: 'Über DSH Desktop', safeMode: 'Im abgesicherten Modus neu starten…', restart: 'Neu starten', fileMenu: 'Datei', closePage: 'Seite oder Fenster schließen', edit: 'Bearbeiten', undo: 'Rückgängig', redo: 'Wiederholen', cut: 'Ausschneiden', copy: 'Kopieren', copyAction: 'Kopieren', paste: 'Einfügen', selectAll: 'Alles auswählen', window: 'Fenster', minimize: 'Minimieren', close: 'Schließen', hide: '{app} ausblenden', hideOthers: 'Andere ausblenden', showAll: 'Alle einblenden', quitApp: '{app} beenden', application: 'Anwendung', phone: 'Telefon verbinden…', log: 'Harness-Protokoll anzeigen', exit: 'Beenden', view: 'Ansicht', reload: 'Neu laden', devtools: 'Entwicklerwerkzeuge', actualSize: 'Originalgröße', zoomIn: 'Vergrößern', zoomOut: 'Verkleinern', fullscreen: 'Vollbild umschalten', delete: 'Löschen', zoomCurrent: 'Originalgröße (aktuell {zoom})'
  },
  ru: {
    enterprise: 'Корпоративная версия', update: 'Проверить обновления…', about: 'О DSH Desktop', safeMode: 'Перезапустить в безопасном режиме…', restart: 'Перезапустить', fileMenu: 'Файл', closePage: 'Закрыть страницу или окно', edit: 'Правка', undo: 'Отменить', redo: 'Повторить', cut: 'Вырезать', copy: 'Копировать', copyAction: 'Копировать', paste: 'Вставить', selectAll: 'Выбрать всё', window: 'Окно', minimize: 'Свернуть', close: 'Закрыть', hide: 'Скрыть {app}', hideOthers: 'Скрыть остальные', showAll: 'Показать все', quitApp: 'Завершить {app}', application: 'Приложение', phone: 'Подключить телефон…', log: 'Показать журнал Harness', exit: 'Выход', view: 'Вид', reload: 'Перезагрузить', devtools: 'Инструменты разработчика', actualSize: 'Исходный размер', zoomIn: 'Увеличить', zoomOut: 'Уменьшить', fullscreen: 'Переключить полноэкранный режим', delete: 'Удалить', zoomCurrent: 'Исходный размер (сейчас {zoom})'
  },
  pt: {
    enterprise: 'Conhecer a versão empresarial', update: 'Verificar atualizações…', about: 'Sobre o DSH Desktop', safeMode: 'Reiniciar em modo de segurança…', restart: 'Reiniciar', fileMenu: 'Arquivo', closePage: 'Fechar página ou janela', edit: 'Editar', undo: 'Desfazer', redo: 'Refazer', cut: 'Recortar', copy: 'Copiar', copyAction: 'Copiar', paste: 'Colar', selectAll: 'Selecionar tudo', window: 'Janela', minimize: 'Minimizar', close: 'Fechar', hide: 'Ocultar {app}', hideOthers: 'Ocultar outros', showAll: 'Mostrar tudo', quitApp: 'Encerrar {app}', application: 'Aplicativo', phone: 'Conectar telefone…', log: 'Mostrar registro do Harness', exit: 'Sair', view: 'Exibir', reload: 'Recarregar', devtools: 'Ferramentas de desenvolvimento', actualSize: 'Tamanho real', zoomIn: 'Ampliar', zoomOut: 'Reduzir', fullscreen: 'Alternar tela cheia', delete: 'Excluir', zoomCurrent: 'Tamanho real (atual: {zoom})'
  }
}

export function desktopMenuMessages(locale: string): MenuMessages {
  return menuMessages[desktopLocale(locale) ?? 'en']
}

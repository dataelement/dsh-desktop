import type { DesktopLocale } from '../../shared/desktop-locale'

interface NativeLocaleMessages {
  directory: string
  restartHeading: string
  restartDetail: string
  later: string
  restart: string
  notSaved: string
  close: string
}

export const nativeLocaleMessages: Record<DesktopLocale, NativeLocaleMessages> = {
  en: {
    directory: 'Select Workspace Directory', restartHeading: 'Restart to update the native dialog language?',
    restartDetail: 'The macOS file chooser will change language after a full DSH Desktop restart. Choose “Restart Later” to select a folder in the current language without stopping tasks. Restarting now stops running tasks; saved sessions and configuration are preserved.',
    later: 'Restart Later', restart: 'Restart App', notSaved: 'The language setting has not been saved yet. Please try again shortly.', close: 'Close'
  },
  zh: {
    directory: '选择工作区目录', restartHeading: '重启以更新原生对话框语言？',
    restartDetail: 'macOS 文件选择器将在完整重启 DSH Desktop 后切换语言。选择“稍后重启”可继续使用当前语言选择文件夹，不会停止任务。立即重启会停止当前运行中的任务；已保存的会话和配置会保留。',
    later: '稍后重启', restart: '重启应用', notSaved: '语言设置尚未保存，请稍后重试。', close: '关闭'
  },
  ja: {
    directory: 'ワークスペースのフォルダーを選択', restartHeading: '再起動してシステムダイアログの言語を変更しますか？',
    restartDetail: 'macOS のフォルダー選択画面の言語は DSH Desktop の再起動後に変わります。「後で再起動」を選ぶと、タスクを停止せずに現在の言語でフォルダーを選択できます。今すぐ再起動すると実行中のタスクは停止します。保存済みのセッションと設定は保持されます。',
    later: '後で再起動', restart: 'アプリを再起動', notSaved: '言語設定がまだ保存されていません。しばらくしてから再試行してください。', close: '閉じる'
  },
  es: {
    directory: 'Seleccionar carpeta del espacio de trabajo', restartHeading: '¿Reiniciar para cambiar el idioma de los diálogos nativos?',
    restartDetail: 'El selector de carpetas de macOS cambiará de idioma al reiniciar DSH Desktop. Elija «Reiniciar más tarde» para seleccionar una carpeta en el idioma actual sin detener tareas. Reiniciar ahora detiene las tareas en curso; se conservan las sesiones y la configuración guardadas.',
    later: 'Reiniciar más tarde', restart: 'Reiniciar aplicación', notSaved: 'El ajuste de idioma aún no se ha guardado. Vuelva a intentarlo en breve.', close: 'Cerrar'
  },
  fr: {
    directory: 'Choisir le dossier de l’espace de travail', restartHeading: 'Redémarrer pour changer la langue des dialogues natifs ?',
    restartDetail: 'Le sélecteur de dossiers macOS changera de langue après le redémarrage de DSH Desktop. Choisissez « Redémarrer plus tard » pour sélectionner un dossier dans la langue actuelle sans arrêter les tâches. Redémarrer maintenant arrête les tâches en cours ; les sessions et paramètres enregistrés sont conservés.',
    later: 'Redémarrer plus tard', restart: 'Redémarrer l’application', notSaved: 'Le paramètre de langue n’a pas encore été enregistré. Réessayez dans un instant.', close: 'Fermer'
  },
  de: {
    directory: 'Arbeitsbereichsordner auswählen', restartHeading: 'Neustarten, um die Sprache nativer Dialoge zu ändern?',
    restartDetail: 'Die macOS-Ordnerauswahl verwendet nach einem Neustart von DSH Desktop die neue Sprache. Mit „Später neu starten“ können Sie einen Ordner in der aktuellen Sprache auswählen, ohne Aufgaben zu stoppen. Ein sofortiger Neustart stoppt laufende Aufgaben; gespeicherte Sitzungen und Einstellungen bleiben erhalten.',
    later: 'Später neu starten', restart: 'App neu starten', notSaved: 'Die Spracheinstellung wurde noch nicht gespeichert. Bitte versuchen Sie es gleich erneut.', close: 'Schließen'
  },
  ru: {
    directory: 'Выберите папку рабочего пространства', restartHeading: 'Перезапустить для смены языка системных диалогов?',
    restartDetail: 'Язык выбора папки macOS изменится после перезапуска DSH Desktop. Выберите «Перезапустить позже», чтобы выбрать папку на текущем языке без остановки задач. Перезапуск сейчас остановит выполняемые задачи; сохранённые сеансы и настройки останутся.',
    later: 'Перезапустить позже', restart: 'Перезапустить приложение', notSaved: 'Настройка языка ещё не сохранена. Повторите попытку чуть позже.', close: 'Закрыть'
  },
  pt: {
    directory: 'Selecionar pasta do espaço de trabalho', restartHeading: 'Reiniciar para alterar o idioma das caixas de diálogo nativas?',
    restartDetail: 'O seletor de pastas do macOS mudará de idioma após reiniciar o DSH Desktop. Escolha “Reiniciar mais tarde” para selecionar uma pasta no idioma atual sem interromper tarefas. Reiniciar agora interrompe as tarefas em execução; sessões e configurações salvas são preservadas.',
    later: 'Reiniciar mais tarde', restart: 'Reiniciar aplicativo', notSaved: 'A configuração de idioma ainda não foi salva. Tente novamente em instantes.', close: 'Fechar'
  }
}

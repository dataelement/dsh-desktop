import type { DesktopLocale } from './desktop-locale'

const en = {
  mobileStarting: 'Harness is still starting.',
  mobileWait: 'Wait until DSH Desktop is ready, then connect your phone again.',
  mobileFailed: 'Failed to start mobile bridge.',
  tryAgain: 'Please try again.',
  repairOpenFailed: 'The repair agent session could not be opened',
  trayShow: 'Show DSH Desktop',
  appInstallFailed: 'Application installation did not finish.',
  repairNotReady: 'The repair core is not ready yet.',
  mobileWindowTitle: 'Connect Mobile Device'
} as const
export type DesktopDailyMessageKey = keyof typeof en
const messages: Record<DesktopLocale, Record<DesktopDailyMessageKey, string>> = {
  en,
  zh: {
    mobileStarting: '桌面服务还在启动。',
    mobileWait: '等 DSH Desktop 就绪后再连接手机。',
    mobileFailed: '手机桥没有启动。',
    tryAgain: '请再试一次。',
    repairOpenFailed: '无法打开智能修复 Agent 会话',
    trayShow: '显示 DSH Desktop',
    appInstallFailed: '应用安装未完成。',
    repairNotReady: '维修核心服务尚未就绪。',
    mobileWindowTitle: '连接移动设备'
  },
  ja: {
    mobileStarting: 'Harness はまだ起動中です。',
    mobileWait: 'DSH Desktop の準備ができてから、もう一度接続してください。',
    mobileFailed: 'モバイルブリッジを起動できませんでした。',
    tryAgain: '再試行してください。',
    repairOpenFailed: '修復エージェントのセッションを開けませんでした',
    trayShow: 'DSH Desktop を表示',
    appInstallFailed: 'アプリのインストールが完了しませんでした。',
    repairNotReady: '修復サービスの準備がまだできていません。',
    mobileWindowTitle: 'モバイル端末を接続'
  },
  es: {
    mobileStarting: 'Harness se está iniciando.',
    mobileWait: 'Espera a que DSH Desktop esté listo y vuelve a conectar el teléfono.',
    mobileFailed: 'No se pudo iniciar el puente móvil.',
    tryAgain: 'Inténtalo de nuevo.',
    repairOpenFailed: 'No se pudo abrir la sesión del agente de reparación',
    trayShow: 'Mostrar DSH Desktop',
    appInstallFailed: 'La instalación de la aplicación no se completó.',
    repairNotReady: 'El servicio de reparación aún no está listo.',
    mobileWindowTitle: 'Conectar dispositivo móvil'
  },
  fr: {
    mobileStarting: 'Harness est en cours de démarrage.',
    mobileWait: 'Attendez que DSH Desktop soit prêt, puis reconnectez votre téléphone.',
    mobileFailed: 'Impossible de démarrer la passerelle mobile.',
    tryAgain: 'Réessayez.',
    repairOpenFailed: 'Impossible d’ouvrir la session de l’agent de réparation',
    trayShow: 'Afficher DSH Desktop',
    appInstallFailed: 'L’installation de l’application ne s’est pas terminée.',
    repairNotReady: 'Le service de réparation n’est pas encore prêt.',
    mobileWindowTitle: 'Connecter un appareil mobile'
  },
  de: {
    mobileStarting: 'Harness wird noch gestartet.',
    mobileWait: 'Warte, bis DSH Desktop bereit ist, und verbinde das Telefon erneut.',
    mobileFailed: 'Die Mobilgerätebrücke konnte nicht gestartet werden.',
    tryAgain: 'Bitte erneut versuchen.',
    repairOpenFailed: 'Die Sitzung des Reparaturagenten konnte nicht geöffnet werden',
    trayShow: 'DSH Desktop anzeigen',
    appInstallFailed: 'Die Installation der Anwendung wurde nicht abgeschlossen.',
    repairNotReady: 'Der Reparaturdienst ist noch nicht bereit.',
    mobileWindowTitle: 'Mobilgerät verbinden'
  },
  ru: {
    mobileStarting: 'Harness ещё запускается.',
    mobileWait: 'Дождитесь готовности DSH Desktop и подключите телефон снова.',
    mobileFailed: 'Не удалось запустить мобильный мост.',
    tryAgain: 'Повторите попытку.',
    repairOpenFailed: 'Не удалось открыть сеанс агента восстановления',
    trayShow: 'Показать DSH Desktop',
    appInstallFailed: 'Установка приложения не завершена.',
    repairNotReady: 'Служба восстановления ещё не готова.',
    mobileWindowTitle: 'Подключить мобильное устройство'
  },
  pt: {
    mobileStarting: 'O Harness ainda está iniciando.',
    mobileWait: 'Aguarde o DSH Desktop ficar pronto e conecte o telefone novamente.',
    mobileFailed: 'Não foi possível iniciar a ponte móvel.',
    tryAgain: 'Tente novamente.',
    repairOpenFailed: 'Não foi possível abrir a sessão do agente de reparo',
    trayShow: 'Mostrar DSH Desktop',
    appInstallFailed: 'A instalação do aplicativo não foi concluída.',
    repairNotReady: 'O serviço de reparo ainda não está pronto.',
    mobileWindowTitle: 'Conectar dispositivo móvel'
  }
}

/** Daily native-shell feedback; does not require the client locale service. */
export function desktopDailyText(locale: DesktopLocale, key: DesktopDailyMessageKey): string {
  return messages[locale][key]
}

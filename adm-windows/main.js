// ============================================================
//  Oeste Cargas - Controle de Coleta (ADM) · app Windows
//
//  Abre o painel do Controle de Coleta v2 (o mesmo endereço do
//  navegador). O HTML vem do n8n: mudar o painel no n8n já
//  atualiza o app, sem instalador novo.
//
//  O que o app acrescenta ao navegador:
//    - ícone na bandeja: fechar a janela só esconde (continua avisando)
//    - avisos do Windows: motorista não coletou, cliente confirmou /
//      recusou, coleta concluída (o painel chama window.oesteApp)
//    - contador de pendências no ícone da barra de tarefas
//    - relatórios e páginas do próprio servidor abrem em janela do app
//      (imprimem normal); links de fora (WhatsApp, Maps) no navegador
//    - iniciar com o Windows (opcional), uma instância só, lembra o zoom
// ============================================================
const { app, BrowserWindow, shell, Menu, Tray, Notification, ipcMain, nativeImage, session } = require('electron');
const path = require('path');
const fs = require('fs');

app.setPath('userData', path.join(app.getPath('appData'), 'OesteCargas-AdmColeta'));
const APP_ID = 'br.com.oestecargas.admcoleta';
if (process.platform === 'win32') app.setAppUserModelId(APP_ID);

const CONFIG_PATH = path.join(__dirname, 'config.json');
const PREFS_PATH = path.join(app.getPath('userData'), 'preferencias.json');
const ICONE = path.join(__dirname, 'build', 'icon.ico');

function lerConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch (e) { return { url: 'https://n8n.paideguasistema.com.br/webhook/oeste-coletas2' }; }
}
function lerPrefs() {
  try { return { zoom: 0, avisos: true, bandeja: true, ...JSON.parse(fs.readFileSync(PREFS_PATH, 'utf8')) }; }
  catch (e) { return { zoom: 0, avisos: true, bandeja: true }; }
}
function salvarPrefs(p) {
  try { fs.mkdirSync(path.dirname(PREFS_PATH), { recursive: true }); fs.writeFileSync(PREFS_PATH, JSON.stringify(p, null, 2)); } catch (e) {}
}

const URL_PAINEL = lerConfig().url;
const ORIGEM = new URL(URL_PAINEL).origin;
let prefs = lerPrefs();
let janela = null, tray = null, saindo = false;

const mesmaOrigem = u => { try { return new URL(u).origin === ORIGEM; } catch (e) { return false; } };

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => mostrar());

  function mostrar() {
    if (!janela) return criarJanela();
    if (janela.isMinimized()) janela.restore();
    janela.show(); janela.focus();
  }

  function telaErro(descricao) {
    const f = `file://${path.join(__dirname, 'fallback.html')}?erro=${encodeURIComponent(descricao || '')}&alvo=${encodeURIComponent(URL_PAINEL)}`;
    janela.loadURL(f);
  }

  function criarJanela() {
    janela = new BrowserWindow({
      width: 1440, height: 900, minWidth: 1024, minHeight: 680, show: false,
      icon: ICONE, title: 'Oeste Cargas - Controle de Coleta',
      backgroundColor: '#f6f3f3',
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.js') },
    });
    janela.once('ready-to-show', () => { janela.maximize(); janela.show(); });

    janela.webContents.on('did-finish-load', () => janela.webContents.setZoomLevel(prefs.zoom || 0));
    janela.webContents.on('zoom-changed', (_e, dir) => {
      prefs.zoom = Math.max(-3, Math.min(3, (janela.webContents.getZoomLevel() || 0) + (dir === 'in' ? 0.5 : -0.5)));
      janela.webContents.setZoomLevel(prefs.zoom); salvarPrefs(prefs);
    });

    // páginas do próprio servidor (relatório, link de cadastro) → janela do app; o resto → navegador do Windows
    janela.webContents.setWindowOpenHandler(({ url }) => {
      if (mesmaOrigem(url)) {
        return { action: 'allow', overrideBrowserWindowOptions: {
          width: 1100, height: 850, icon: ICONE, autoHideMenuBar: true, backgroundColor: '#ffffff',
          webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } } };
      }
      if (/^(https?|mailto|tel):/i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    janela.webContents.on('will-navigate', (ev, url) => {
      if (!mesmaOrigem(url) && !url.startsWith('file://')) { ev.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); }
    });
    janela.webContents.on('did-fail-load', (_e, codigo, descricao, urlFalhou, principal) => {
      if (codigo === -3 || !principal) return;
      telaErro(descricao);
    });

    // fechar = esconder na bandeja (os avisos continuam); Sair pelo menu fecha de verdade
    janela.on('close', ev => {
      if (!saindo && prefs.bandeja && tray) {
        ev.preventDefault(); janela.hide();
        if (!prefs._dicaBandeja) {
          prefs._dicaBandeja = true; salvarPrefs(prefs);
          aviso('O Controle de Coleta continua aberto', 'Ele fica na bandeja (perto do relógio) para avisar das coletas. Para fechar de vez, use Sair.');
        }
      }
    });
    janela.on('closed', () => { janela = null; });

    janela.loadURL(URL_PAINEL);
    montarMenu();
  }

  function aviso(titulo, corpo) {
    if (!Notification.isSupported()) return;
    const n = new Notification({ title: titulo, body: corpo, icon: ICONE, silent: false });
    n.on('click', () => mostrar());
    n.show();
  }

  function iniciaComWindows() { return app.getLoginItemSettings().openAtLogin; }

  function montarMenu() {
    const menu = Menu.buildFromTemplate([
      { label: 'Painel', submenu: [
        { label: 'Recarregar', accelerator: 'CmdOrCtrl+R', click: () => janela && janela.loadURL(URL_PAINEL) },
        { label: 'Voltar', accelerator: 'Alt+Left', click: () => janela && janela.webContents.canGoBack() && janela.webContents.goBack() },
        { role: 'togglefullscreen', label: 'Tela cheia' },
        { label: 'Imprimir', accelerator: 'CmdOrCtrl+P', click: () => janela && janela.webContents.print() },
        { type: 'separator' },
        { label: 'Sair', accelerator: 'CmdOrCtrl+Q', click: () => { saindo = true; app.quit(); } },
      ] },
      { label: 'Exibir', submenu: [
        { label: 'Zoom padrão', accelerator: 'CmdOrCtrl+0', click: () => { prefs.zoom = 0; janela.webContents.setZoomLevel(0); salvarPrefs(prefs); } },
        { label: 'Aumentar zoom', accelerator: 'CmdOrCtrl+=', click: () => { prefs.zoom = Math.min(3, (prefs.zoom || 0) + 0.5); janela.webContents.setZoomLevel(prefs.zoom); salvarPrefs(prefs); } },
        { label: 'Diminuir zoom', accelerator: 'CmdOrCtrl+-', click: () => { prefs.zoom = Math.max(-3, (prefs.zoom || 0) - 0.5); janela.webContents.setZoomLevel(prefs.zoom); salvarPrefs(prefs); } },
      ] },
      { label: 'Opções', submenu: [
        { label: 'Avisos do Windows (coletas)', type: 'checkbox', checked: prefs.avisos, click: i => { prefs.avisos = i.checked; salvarPrefs(prefs); } },
        { label: 'Fechar a janela deixa na bandeja', type: 'checkbox', checked: prefs.bandeja, click: i => { prefs.bandeja = i.checked; salvarPrefs(prefs); } },
        { label: 'Iniciar com o Windows', type: 'checkbox', checked: iniciaComWindows(), click: i => app.setLoginItemSettings({ openAtLogin: i.checked, args: ['--oculto'] }) },
        { type: 'separator' },
        { label: 'Versão ' + app.getVersion(), enabled: false },
      ] },
    ]);
    Menu.setApplicationMenu(menu);
  }

  function montarBandeja() {
    tray = new Tray(nativeImage.createFromPath(ICONE));
    tray.setToolTip('Oeste Cargas - Controle de Coleta');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Abrir o painel', click: () => mostrar() },
      { label: 'Recarregar', click: () => { mostrar(); janela && janela.loadURL(URL_PAINEL); } },
      { type: 'separator' },
      { label: 'Sair', click: () => { saindo = true; app.quit(); } },
    ]));
    tray.on('click', () => mostrar());
  }

  // ------------------------------------------------------------ ponte com o painel (preload.js)
  ipcMain.on('oc:avisar', (ev, d) => {
    if (!prefs.avisos || !d) return;
    if (janela && janela.isVisible() && janela.isFocused() && !d.mesmoComFoco) return;   // está olhando o painel
    aviso(String(d.titulo || 'Controle de Coleta').slice(0, 120), String(d.texto || '').slice(0, 300));
  });
  ipcMain.on('oc:pendencias', (ev, d) => {
    const n = Math.max(0, Number(d && d.n) || 0), png = d && typeof d.png === 'string' && d.png.startsWith('data:image/png;base64,') ? d.png : null;
    if (tray) tray.setToolTip('Oeste Cargas - Controle de Coleta' + (n ? ` · ${n} aguardando o cliente` : ''));
    if (janela && process.platform === 'win32') {
      if (n && png) janela.setOverlayIcon(nativeImage.createFromDataURL(png), n + ' aguardando o cliente');
      else janela.setOverlayIcon(null, '');
    }
  });
  ipcMain.handle('oc:info', () => ({ versao: app.getVersion(), avisos: prefs.avisos }));

  app.whenReady().then(() => {
    // nada de câmera/microfone/localização para o painel
    session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(['notifications', 'clipboard-sanitized-write', 'fullscreen'].includes(perm)));
    montarBandeja();
    criarJanela();
    if (process.argv.includes('--oculto')) janela.once('ready-to-show', () => setTimeout(() => janela.hide(), 50));
  });
  app.on('before-quit', () => { saindo = true; });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin' && (saindo || !prefs.bandeja)) app.quit(); });
}

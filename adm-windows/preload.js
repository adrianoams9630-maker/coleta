// Ponte mínima entre o painel (página do n8n) e o Windows: só avisos e contador.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('oesteApp', {
  windows: true,
  avisar: (titulo, texto, mesmoComFoco) => ipcRenderer.send('oc:avisar', { titulo, texto, mesmoComFoco: !!mesmoComFoco }),
  pendencias: (n, png) => ipcRenderer.send('oc:pendencias', { n, png }),
  info: () => ipcRenderer.invoke('oc:info'),
});

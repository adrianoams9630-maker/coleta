# Oeste Cargas — Controle de Coleta (ADM) · app Windows

App Windows (Electron) do painel ADM do **Controle de Coleta v2**. Abre o mesmo endereço do navegador
(`config.json`): `https://n8n.paideguasistema.com.br/webhook/oeste-coletas2`. Mudanças no painel feitas no n8n
aparecem no app sem instalador novo.

## O que o app faz a mais que o navegador
- **Bandeja do Windows**: fechar a janela só esconde; o app continua avisando. *Sair* (menu ou bandeja) fecha de vez.
- **Avisos do Windows** (a cada minuto): motorista não coletou (com o motivo), cliente confirmou, cliente sem carga,
  coleta concluída, coleta nova. Muitas novidades juntas viram um aviso só. Clicar no aviso abre o painel.
- **Contador no ícone da barra de tarefas**: coletas de hoje aguardando a resposta do cliente.
- Relatórios e links de cadastro abrem em janela do próprio app (imprime normal); WhatsApp, Maps e links de fora abrem no navegador.
- **Opções**: avisos liga/desliga, fechar → bandeja, **iniciar com o Windows** (abre escondido na bandeja). Lembra o zoom.
- Uma instância só; tela amigável quando está sem internet.

## Instalador
Cada envio para o `main` que mexe em `adm-windows/` gera o instalador numa máquina Windows do GitHub e publica em
**Releases → `adm-windows`** (`OesteCargas-ControleColeta-Setup.exe`). Também fica em *Actions → artefatos*.

Para gerar à mão num Windows: `npm install` e `npm run build:win` (sai em `dist/`).

Mudou o endereço do servidor? Rode `CONFIGURAR-SERVIDOR.bat` e gere o instalador de novo.

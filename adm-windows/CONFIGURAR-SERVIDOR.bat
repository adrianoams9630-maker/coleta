@echo off
REM ===================================================================
REM  Oeste Cargas - Controle de Coleta - Configurar o endereco do servidor
REM
REM  Este projeto ja vem configurado com o endereco atual:
REM  https://n8n.paideguasistema.com.br/webhook/oeste-coletas2
REM
REM  So rode este script se esse endereco mudar no futuro (servidor
REM  novo, webhook renomeado etc). Rode ANTES de compilar o instalador.
REM
REM  COMO USAR: de duplo clique neste arquivo.
REM ===================================================================

setlocal enabledelayedexpansion
chcp 65001 >nul

echo.
echo ==========================================================
echo   Oeste Cargas - Controle de Coleta - Configuracao do servidor
echo ==========================================================
echo.
echo  Informe a URL COMPLETA do painel, com https:// e o caminho
echo  do webhook.
echo.
echo  Exemplo:
echo  https://n8n.paideguasistema.com.br/webhook/oeste-coletas2
echo.

set /p URLPAINEL="  URL do painel: "

if "%URLPAINEL%"=="" (
    echo.
    echo  [ERRO] Nenhuma URL informada. Nada foi alterado.
    echo.
    pause
    exit /b 1
)

echo.
echo  Configurando para: %URLPAINEL%
echo.

powershell -NoProfile -Command ^
  "$url = '%URLPAINEL%';" ^
  "$obj = @{ url = $url };" ^
  "$obj | ConvertTo-Json | Set-Content -Encoding UTF8 config.json;" ^
  "Write-Host '  OK  config.json atualizado'"

echo.
echo ==========================================================
echo   Pronto! Agora gere o instalador (veja o README-BUILD.md).
echo ==========================================================
echo.
pause

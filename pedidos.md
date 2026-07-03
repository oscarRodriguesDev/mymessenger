# Pedidos e Solicitações

## 03/07/2026 - Corrigir redirecionamento após QR exchange

**Solicitação:** "Acredito que seja alguma divergência, o front deveria encaminhar corretamente pq ta dando 200, mas quando vai redirecionar volta pra pagina do qrcode, como se tivesse forçando."

**Problema:** Exchange retornava 200 com `redirectTo`, mas após navegar para `/web#access_token=xxx`, o usuário era redirecionado de volta para `/web-access`.

**Causa raiz:** Middleware bloqueava `/api/auth/sync` (e demais APIs) no desktop, impedindo que `syncProfile()` setasse o `profile`. Com `profile = null`, a página `/web` redirecionava para `/web-access`.

**Solução:** Middleware agora permite APIs para desktop autenticado (que já passou pelo fluxo QR).

**Hash do commit:** (ainda não commitado - aguardando autorização)

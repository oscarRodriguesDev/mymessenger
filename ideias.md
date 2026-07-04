# Ideias e Melhorias

## MVP-AUDIO-001 | Corrigir envio de áudio no browser
**Código:** `MVP-AUDIO-001`
**Status:** Pendente
**Descrição:** O microfone funciona e grava, mas o envio (send) não finaliza. Verificar:
- Se o blob está sendo gerado corretamente
- Se o callback `onSend` está sendo chamado
- Se a API de upload de mensagem aceita o blob de áudio
- Se o ChatArea está tratando corretamente o retorno

## MVP-AUDIO-002 | Adaptar áudio para WebView React Native
**Código:** `MVP-AUDIO-002`
**Status:** Pendente
**Descrição:** No app React Native, o áudio não funciona porque a WebView padrão não expõe `navigator.mediaDevices.getUserMedia`. Possíveis soluções:
- Usar `react-native-webrtc` com polyfill injetado na WebView
- Configurar `mediaCapturePermissionGrantType` na WebView (iOS)
- Usar ponte nativa (postMessage) entre WebView e React Native
- Verificar permissões no manifest/Info.plist

## MVP-VIBE-001 | VibeService cache issue
**Código:** `MVP-VIBE-001`
**Status:** Bloqueado
**Descrição:** `prisma.vibeSignal` retorna undefined mesmo após adicionar ao schema. Requer restart do servidor dev para limpar cache do Next.js.

## MVP-STORAGE-001 | Storage RLS policy
**Código:** `MVP-STORAGE-001`
**Status:** Bloqueado
**Descrição:** Upload para bucket `message-media` falha com RLS. Executar `supabase/storage_policies.sql` no Supabase Dashboard.

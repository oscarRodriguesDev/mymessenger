# Requisitos do MVP - Plataforma de Mensagens

## Objetivo

Desenvolver uma plataforma de mensagens instantâneas simples, rápida e confiável, inicialmente composta por funcionalidades essenciais para comunicação entre usuários.

O MVP será desenvolvido utilizando:

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL (Supabase Database)
- Supabase Auth
- Supabase Realtime
- Supabase Storage

A aplicação será executada como:

- Web
- PWA
- Aplicativo Android (WebView)
- Aplicativo iOS (WebView)

---

# Requisitos Funcionais

## RF001 - Cadastro de usuários

O sistema deverá permitir o cadastro utilizando:

- Nome
- Username (obrigatório e único)
- E-mail (obrigatório e único)
- Senha
- Foto de perfil (opcional)
- Número de telefone (opcional)

### Regras

- Username deve possuir entre 3 e 30 caracteres.
- Username poderá conter apenas:
  - letras
  - números
  - "_"
  - "."
- E-mail deverá ser único.
- Senha deverá possuir no mínimo 8 caracteres.
- O telefone somente será considerado válido após confirmação via SMS.

---

## RF002 - Login

O usuário poderá autenticar utilizando:

- Username + senha

O sistema deverá permitir:

- Permanecer conectado
- Logout
- Recuperação de senha por e-mail

---

## RF003 - Perfil

O usuário poderá editar:

- Nome
- Username
- Foto
- E-mail
- Número de telefone
- Senha

Também poderá excluir sua conta.

---

## RF004 - Descoberta de usuários

O sistema deverá permitir localizar usuários através de:

- Username
- Número de telefone (quando permitido)

---

## RF005 - Sincronização da agenda

O aplicativo poderá solicitar permissão para acessar os contatos do dispositivo.

Após autorização:

- Os números serão enviados ao servidor utilizando conexão segura.
- O servidor verificará quais números pertencem a usuários cadastrados.
- Apenas os usuários encontrados serão retornados.
- Os contatos encontrados aparecerão automaticamente para o usuário.

---

## RF006 - Privacidade

Cada usuário poderá escolher:

- Ser encontrado apenas pelo username.
- Ser encontrado pelo número de telefone.
- Não aparecer através da agenda de contatos.

---

## RF007 - Contatos

O usuário poderá:

- Adicionar contato pelo username.
- Adicionar contato pela agenda sincronizada.
- Adicionar contato pelo número de telefone.
- Remover contato.
- Bloquear usuário.
- Desbloquear usuário.

---

## RF008 - Conversas privadas

O usuário poderá:

- Iniciar conversa.
- Visualizar histórico.
- Enviar mensagens.
- Receber mensagens em tempo real.

---

## RF009 - Conversas em grupo

O sistema deverá permitir:

- Criar grupos.
- Definir nome.
- Definir foto.
- Adicionar participantes.
- Remover participantes.
- Sair do grupo.

O administrador poderá:

- Alterar nome.
- Alterar foto.
- Remover membros.

---

## RF010 - Mensagens

Cada mensagem poderá ser do tipo:

- Texto
- Imagem
- Áudio
- Vídeo

Cada mensagem possuirá:

- ID
- Conversa
- Autor
- Tipo
- Conteúdo
- Data
- Hora
- Status

Status possíveis:

- Enviada
- Entregue
- Lida

---

## RF011 - Upload de arquivos

O sistema deverá aceitar:

### Imagens

- JPG
- JPEG
- PNG
- WEBP

### Áudios

- MP3
- AAC
- OGG
- WAV

### Vídeos

- MP4
- MOV

Os arquivos serão armazenados no Supabase Storage.

---

## RF012 - Lista de conversas

A tela principal deverá exibir:

- Foto
- Nome
- Última mensagem
- Horário
- Quantidade de mensagens não lidas

Ordenação:

- Conversas mais recentes primeiro.

---

## RF013 - Indicador de digitação

Durante a digitação deverá ser exibido:

```
Fulano está digitando...
```

---

## RF014 - Status do usuário

Cada usuário poderá possuir os estados:

- Online
- Offline

---

## RF015 - Confirmação de leitura

As mensagens deverão possuir:

- Enviada
- Entregue
- Lida

---

## RF016 - Notificações

O sistema deverá notificar:

- Nova mensagem privada.
- Nova mensagem em grupo.

---

## RF017 - Backup

Todo histórico ficará armazenado no banco.

Ao realizar login em outro dispositivo o usuário deverá recuperar:

- Conversas
- Grupos
- Contatos
- Histórico

---

## RF018 - Exclusão

O usuário poderá:

- Apagar conversa.
- Apagar mensagem apenas para si.

No MVP não existirá exclusão para todos.

---

# Requisitos Não Funcionais

## RNF001 - Arquitetura

Frontend:

- Next.js
- React
- TypeScript
- Tailwind CSS

Backend:

- Supabase

Banco:

- PostgreSQL (Supabase)

Armazenamento:

- Supabase Storage

Realtime:

- Supabase Realtime

Autenticação:

- Supabase Auth

---

## RNF002 - Performance

Objetivos:

- Login inferior a 2 segundos.
- Abertura das conversas inferior a 1 segundo.
- Envio de mensagem inferior a 500 ms.
- Recebimento praticamente instantâneo.

---

## RNF003 - Segurança

O sistema deverá possuir:

- HTTPS obrigatório.
- JWT.
- Senhas criptografadas.
- Row Level Security (RLS).
- Proteção contra SQL Injection.
- Proteção contra XSS.
- Rate Limit.

---

## RNF004 - Disponibilidade

Meta inicial:

99,9%

---

## RNF005 - Escalabilidade

A arquitetura deverá suportar crescimento gradual sem necessidade de alteração estrutural significativa.

---

## RNF006 - Compatibilidade

Compatível com:

- Android
- iOS
- Chrome
- Edge
- Firefox
- Safari

---

## RNF007 - Banco de Dados

O PostgreSQL do Supabase será utilizado para armazenar todas as informações da aplicação.

Tabelas previstas:

- profiles
- contacts
- conversations
- conversation_members
- messages
- message_reads
- blocked_users
- devices

---

## RNF008 - Storage

Buckets previstos:

- avatars
- images
- audios
- videos

---

## RNF009 - Realtime

O Supabase Realtime será utilizado para:

- Novas mensagens.
- Atualização da lista de conversas.
- Status online.
- Indicador de digitação.
- Confirmação de leitura.
- Confirmação de entrega.

---

## RNF010 - Interface

Páginas previstas:

- Splash
- Login
- Cadastro
- Recuperação de senha
- Lista de conversas
- Conversa privada
- Conversa em grupo
- Buscar usuários
- Perfil
- Configurações
- Criar grupo

---

# Modelo Inicial de Banco

## profiles

- id
- auth_id
- username
- name
- email
- phone
- phone_verified
- discoverable_by_phone
- discoverable_by_username
- avatar_url
- created_at
- updated_at

---

## contacts

- id
- user_id
- contact_id
- created_at

---

## blocked_users

- id
- user_id
- blocked_user_id
- created_at

---

## conversations

- id
- type (private | group)
- name
- avatar_url
- owner_id
- created_at
- updated_at

---

## conversation_members

- id
- conversation_id
- user_id
- role (admin | member)
- joined_at

---

## messages

- id
- conversation_id
- sender_id
- type
- text
- file_url
- status
- created_at
- updated_at

---

## message_reads

- id
- message_id
- user_id
- read_at

---

## devices

- id
- user_id
- platform
- push_token
- created_at

---

# Fluxo Principal

1. Usuário instala o aplicativo.
2. Cria uma conta.
3. Confirma o e-mail.
4. Opcionalmente informa um número de telefone.
5. Caso informe telefone, realiza a validação por SMS.
6. Concede acesso aos contatos (opcional).
7. O aplicativo identifica quais contatos utilizam a plataforma.
8. O usuário pode pesquisar por username ou selecionar contatos encontrados.
9. Inicia uma conversa.
10. Envia e recebe mensagens em tempo real.

---

# Funcionalidades Fora do Escopo do MVP

Não fazem parte da primeira versão:

- Chamadas de voz
- Chamadas de vídeo
- Compartilhamento de localização
- Compartilhamento de contatos
- Mensagens temporárias
- Editar mensagens
- Responder mensagens
- Encaminhar mensagens
- Reações com emojis
- Figurinhas
- GIFs
- Stories
- Status
- Canais
- Comunidades
- Bots
- Inteligência Artificial
- Criptografia ponta a ponta
- Pagamentos
- QR Code para login
- API pública
- Multi-dispositivo simultâneo
- Temas personalizados
- Tradução automática
- Busca avançada
- Mensagens agendadas
- Mensagens fixadas
- Enquetes
- Backup em provedores externos
- Compartilhamento de tela
- Chamadas em grupo

---

# Objetivo do MVP

Validar uma plataforma de mensagens instantâneas com foco em simplicidade, velocidade e confiabilidade, oferecendo comunicação por texto, imagem, áudio e vídeo, autenticação por username e integração opcional com a agenda de contatos do dispositivo, utilizando integralmente a infraestrutura do Supabase como backend.
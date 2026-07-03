'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
type Section = 'perfil' | 'avatar' | 'contato' | 'seguranca' | 'privacidade';

interface ProfileData {
  id: string;
  authId: string;
  username: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  discoverableByPhone: boolean;
  discoverableByUsername: boolean;
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}

function FormField({ label, value, onChange, placeholder, type = 'text', disabled }: FieldProps) {
  return (
    <Input
      id={label}
      label={label}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

// ---------------------------------------------------------------------------
// Toast local simples
// ---------------------------------------------------------------------------
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = type === 'success' ? 'bg-primary text-primary-foreground' : 'bg-destructive text-white';

  return (
    <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 shadow-2xl ${bg} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">&times;</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  const { profile: authProfile, user: authUser } = useAuth();
  const router = useRouter();

  // Estados do formulário
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [discoverableByPhone, setDiscoverableByPhone] = useState(true);
  const [discoverableByUsername, setDiscoverableByUsername] = useState(true);

  // Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Loading e feedback
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Seção ativa
  const [activeSection, setActiveSection] = useState<Section>('perfil');

  // Carregar profile
  useEffect(() => {
    if (authProfile) {
      fetchProfile();
    }
  }, [authProfile]);

  async function fetchProfile() {
    try {
      const res = await fetch('/api/auth/sync', { method: 'POST' });
      if (res.ok) {
        const data: ProfileData = await res.json();
        setProfile(data);
        setFullName(data.fullName);
        setUsername(data.username);
        setBio(data.bio ?? '');
        setPhone(data.phone ?? '');
        setDiscoverableByPhone(data.discoverableByPhone);
        setDiscoverableByUsername(data.discoverableByUsername);
        setAvatarPreview(data.avatarUrl);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  }

  // -----------------------------------------------------------------------
  // Salvar perfil
  // -----------------------------------------------------------------------
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoadingProfile(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, username, bio, phone, discoverableByPhone, discoverableByUsername }),
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({ message: data.error || 'Erro ao salvar', type: 'error' });
        return;
      }

      setProfile(data);
      setToast({ message: 'Perfil atualizado com sucesso', type: 'success' });
    } catch {
      setToast({ message: 'Erro ao conectar com o servidor', type: 'error' });
    } finally {
      setLoadingProfile(false);
    }
  }

  // -----------------------------------------------------------------------
  // Upload avatar
  // -----------------------------------------------------------------------
  async function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);

    setLoadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({ message: data.error || 'Erro ao fazer upload', type: 'error' });
        setAvatarPreview(profile?.avatarUrl ?? null);
        return;
      }

      setProfile((prev) => prev ? { ...prev, avatarUrl: data.avatarUrl } : null);
      setAvatarPreview(data.avatarUrl);
      setToast({ message: 'Foto de perfil atualizada', type: 'success' });
    } catch {
      setToast({ message: 'Erro ao fazer upload', type: 'error' });
      setAvatarPreview(profile?.avatarUrl ?? null);
    } finally {
      setLoadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoveAvatar() {
    if (!profile) return;

    setLoadingAvatar(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: null }),
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({ message: 'Erro ao remover foto', type: 'error' });
        return;
      }

      setProfile(data);
      setAvatarPreview(null);
      setToast({ message: 'Foto removida', type: 'success' });
    } catch {
      setToast({ message: 'Erro ao remover foto', type: 'error' });
    } finally {
      setLoadingAvatar(false);
    }
  }

  // -----------------------------------------------------------------------
  // Alterar senha
  // -----------------------------------------------------------------------
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setToast({ message: 'As senhas não conferem', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setToast({ message: 'A nova senha deve ter pelo menos 6 caracteres', type: 'error' });
      return;
    }

    setLoadingPassword(true);

    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({ message: data.error || 'Erro ao alterar senha', type: 'error' });
        return;
      }

      setToast({ message: 'Senha alterada com sucesso', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setToast({ message: 'Erro ao conectar com o servidor', type: 'error' });
    } finally {
      setLoadingPassword(false);
    }
  }

  // -----------------------------------------------------------------------
  // Navegação entre seções
  // -----------------------------------------------------------------------
  const sections: { key: Section; label: string; icon: string }[] = [
    { key: 'perfil', label: 'Perfil', icon: '👤' },
    { key: 'avatar', label: 'Foto', icon: '🖼️' },
    { key: 'contato', label: 'Contato', icon: '📧' },
    { key: 'seguranca', label: 'Segurança', icon: '🔒' },
    { key: 'privacidade', label: 'Privacidade', icon: '🔐' },
  ];

  if (!authUser) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Cabeçalho */}
      <div className="space-y-2 border-b border-border bg-card/50 px-4 py-5 sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais e preferências</p>
      </div>

      {/* Seletor de seção - tabs horizontal */}
      <div className="sticky top-16 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex gap-1 overflow-x-auto px-4 py-3 sm:px-6 sm:gap-2">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 sm:px-4 ${
                activeSection === s.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              }`}
            >
              <span className="text-base">{s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-2xl">

        {/* ---------------------------------------------------------------- */}
        {/* SEÇÃO: PERFIL */}
        {/* ---------------------------------------------------------------- */}
        {activeSection === 'perfil' && (
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Estas informações aparecem para outros usuários
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="flex items-center gap-5">
                  <Avatar
                    src={avatarPreview}
                    fallback={profile?.fullName || 'U'}
                    size="lg"
                    className="h-16 w-16 text-xl"
                  />
                  <div>
                    <p className="font-medium text-foreground">{profile?.fullName}</p>
                    <p className="text-sm text-muted-foreground">@{profile?.username}</p>
                  </div>
                </div>

                <div className="grid gap-4 grid-cols-1 sm:gap-5 sm:grid-cols-2">
                  <FormField
                    label="Nome completo"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="Seu nome"
                  />
                  <FormField
                    label="Nome de usuário"
                    value={username}
                    onChange={setUsername}
                    placeholder="seu_usuario"
                  />
                </div>

                <div>
                  <label htmlFor="bio" className="mb-2 block text-sm font-medium text-foreground">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Fale um pouco sobre você..."
                    rows={3}
                    className="block w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loadingProfile}>
                    {loadingProfile ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* SEÇÃO: AVATAR */}
        {/* ---------------------------------------------------------------- */}
        {activeSection === 'avatar' && (
          <Card>
            <CardHeader>
              <CardTitle>Foto de Perfil</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Sua foto será exibida para outros usuários
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 sm:gap-6 sm:flex-row sm:items-start">
                <div className="relative shrink-0">
                  <Avatar
                    src={avatarPreview}
                    fallback={profile?.fullName || 'U'}
                    size="lg"
                    className="h-28 w-28 text-2xl shadow-lg sm:h-32 sm:w-32 sm:text-3xl"
                  />
                  {loadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 text-center sm:text-left">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <div className="w-full flex flex-col gap-2 sm:w-auto">
                    <Button 
                      type="button" 
                      variant="primary" 
                      onClick={handleAvatarClick} 
                      disabled={loadingAvatar}
                      className="w-full sm:w-auto"
                    >
                      {loadingAvatar ? 'Enviando...' : 'Escolher foto'}
                    </Button>
                    {profile?.avatarUrl && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={handleRemoveAvatar} 
                        disabled={loadingAvatar}
                        className="w-full sm:w-auto"
                      >
                        Remover foto
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center sm:text-left">
                    PNG, JPEG ou WebP. Máximo 5MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* SEÇÃO: CONTATO */}
        {/* ---------------------------------------------------------------- */}
        {activeSection === 'contato' && (
          <Card>
            <CardHeader>
              <CardTitle>Informações de Contato</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Email e telefone associados à sua conta
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                label="Email"
                value={profile?.email || ''}
                onChange={() => {}}
                disabled
              />
              <div className="rounded-lg border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">
                Para alterar seu email, entre em contato com o suporte.
              </div>

              <FormField
                label="Telefone"
                value={phone}
                onChange={setPhone}
                placeholder="(11) 99999-9999"
              />

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveProfile}
                  disabled={loadingProfile}
                >
                  {loadingProfile ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* SEÇÃO: SEGURANÇA */}
        {/* ---------------------------------------------------------------- */}
        {activeSection === 'seguranca' && (
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Sua senha deve ter pelo menos 6 caracteres
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-5">
                <FormField
                  label="Senha atual"
                  type="password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="••••••••"
                />
                <FormField
                  label="Nova senha"
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="••••••••"
                />
                <FormField
                  label="Confirmar nova senha"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="••••••••"
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={loadingPassword}>
                    {loadingPassword ? 'Alterando...' : 'Alterar senha'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* SEÇÃO: PRIVACIDADE */}
        {/* ---------------------------------------------------------------- */}
        {activeSection === 'privacidade' && (
          <Card>
            <CardHeader>
              <CardTitle>Privacidade</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Controle como outros usuários podem te encontrar
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <ToggleSetting
                  label="Descoberta por telefone"
                  description="Permitir que outros usuários te encontrem pelo seu número de telefone"
                  checked={discoverableByPhone}
                  onChange={setDiscoverableByPhone}
                />
                <ToggleSetting
                  label="Descoberta por username"
                  description="Permitir que outros usuários te encontrem pelo seu nome de usuário"
                  checked={discoverableByUsername}
                  onChange={setDiscoverableByUsername}
                />
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveProfile} disabled={loadingProfile}>
                    {loadingProfile ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

        {/* Toast */}
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente Toggle
// ---------------------------------------------------------------------------
function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="space-y-1 sm:space-y-0.5 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-primary' : 'bg-border'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

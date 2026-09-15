'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';

type Mode = 'login' | 'forgot' | 'forgot-sent' | 'reset' | 'reset-done';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginShell><p className="text-center text-sm text-slate-300">Carregando...</p></LoginShell>}>
      <AdminLoginContent />
    </Suspense>
  );
}

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>('login');
  const [resetToken, setResetToken] = useState('');

  // Se a URL trouxer ?token=..., entra direto no modo de criar nova senha
  // e limpa o token da barra de endereço (fica só em memória).
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setMode('reset');
      router.replace('/admin/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LoginShell>
      {mode === 'login' ? <LoginForm onForgotPassword={() => setMode('forgot')} /> : null}
      {mode === 'forgot' ? (
        <ForgotPasswordForm onSent={() => setMode('forgot-sent')} onBackToLogin={() => setMode('login')} />
      ) : null}
      {mode === 'forgot-sent' ? <ForgotPasswordSent onBackToLogin={() => setMode('login')} /> : null}
      {mode === 'reset' ? (
        <ResetPasswordForm
          token={resetToken}
          onDone={() => setMode('reset-done')}
          onRequestNewLink={() => setMode('forgot')}
        />
      ) : null}
      {mode === 'reset-done' ? <ResetPasswordDone onGoToLogin={() => setMode('login')} /> : null}
    </LoginShell>
  );
}

function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md p-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/logo-agenda.jpeg" alt="Logo Agenda" className="mb-4 h-16 w-auto object-contain" />
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Painel Administrativo</p>
        </div>
        {children}
        <div className="mt-6 space-y-2 text-center text-sm text-slate-300">
          <div>
            <Link href="/" className="text-brand-100 hover:underline">Voltar ao início</Link>
          </div>
          <div>
            <Link href="/cadastro" className="text-brand-100 hover:underline">Quero cadastrar minha empresa</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function LoginForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState('admin@empresa-demo.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Não foi possível entrar no painel.');
        setIsSubmitting(false);
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('Não foi possível conectar com o servidor.');
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="mt-1 text-center text-3xl font-bold">Entrar</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="field">
          <span>E-mail</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>

        <label className="field">
          <span>Senha</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>

        <div className="text-right">
          <button type="button" onClick={onForgotPassword} className="text-sm font-medium text-brand-100 hover:underline">
            Esqueci minha senha
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70">
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </>
  );
}

function ForgotPasswordForm({ onSent, onBackToLogin }: { onSent: () => void; onBackToLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Só ocorre para formato de e-mail inválido — nunca revela se a conta existe.
        setError(data.message || 'Informe um e-mail válido.');
        setIsSubmitting(false);
        return;
      }

      onSent();
    } catch {
      setError('Não foi possível conectar com o servidor.');
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="mt-1 text-center text-3xl font-bold">Esqueci minha senha</h1>
      <p className="mt-3 text-center text-sm text-slate-300">
        Informe o e-mail cadastrado e enviaremos um link para redefinir sua senha.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="field">
          <span>E-mail</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" required autoFocus />
        </label>

        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70">
          {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
        </button>
        <button type="button" onClick={onBackToLogin} className="btn-secondary w-full">
          Voltar para o login
        </button>
      </form>
    </>
  );
}

function ForgotPasswordSent({ onBackToLogin }: { onBackToLogin: () => void }) {
  return (
    <>
      <h1 className="mt-1 text-center text-3xl font-bold">Verifique seu e-mail</h1>
      <div className="mt-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
        Se este e-mail estiver cadastrado, você receberá em instantes uma mensagem com um link para criar uma nova senha.
        O link é válido por 30 minutos.
      </div>
      <p className="mt-4 text-center text-sm text-slate-300">
        Não recebeu? Verifique a caixa de spam ou tente novamente em alguns minutos.
      </p>
      <button type="button" onClick={onBackToLogin} className="btn-primary mt-6 w-full">
        Voltar para o login
      </button>
    </>
  );
}

function ResetPasswordForm({
  token,
  onDone,
  onRequestNewLink,
}: {
  token: string;
  onDone: () => void;
  onRequestNewLink: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setTokenInvalid(false);

    if (password.length < 6) {
      setError('A senha deve ter ao menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Não foi possível redefinir a senha.');
        setTokenInvalid(true);
        setIsSubmitting(false);
        return;
      }

      onDone();
    } catch {
      setError('Não foi possível conectar com o servidor.');
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="mt-1 text-center text-3xl font-bold">Criar nova senha</h1>
      <p className="mt-3 text-center text-sm text-slate-300">Escolha uma nova senha para acessar seu painel.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="field">
          <span>Nova senha</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo de 6 caracteres"
            required
          />
        </label>

        <label className="field">
          <span>Confirmar nova senha</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repita a nova senha"
            required
          />
        </label>

        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70">
          {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
        </button>

        {tokenInvalid ? (
          <button type="button" onClick={onRequestNewLink} className="btn-secondary w-full">
            Solicitar novo link
          </button>
        ) : null}
      </form>
    </>
  );
}

function ResetPasswordDone({ onGoToLogin }: { onGoToLogin: () => void }) {
  return (
    <>
      <h1 className="mt-1 text-center text-3xl font-bold">Senha atualizada!</h1>
      <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm text-emerald-100">
        Sua senha foi redefinida com sucesso. Você já pode entrar com a nova senha.
      </div>
      <button type="button" onClick={onGoToLogin} className="btn-primary mt-6 w-full">
        Ir para o login
      </button>
    </>
  );
}

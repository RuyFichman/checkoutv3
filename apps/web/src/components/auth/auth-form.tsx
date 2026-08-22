'use client';

import { ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

interface AuthFormProps {
  mode: AuthMode;
  resetToken?: string;
}

const content = {
  login: {
    eyebrow: 'BEM-VINDO DE VOLTA',
    title: 'Entre no seu painel',
    description: 'Acompanhe sua operação e continue de onde parou.',
    submit: 'Entrar na plataforma',
  },
  register: {
    eyebrow: 'COMECE SUA OPERAÇÃO',
    title: 'Crie seu workspace',
    description: 'Sua conta já nasce isolada e pronta para receber produtos.',
    submit: 'Criar conta gratuita',
  },
  forgot: {
    eyebrow: 'RECUPERAR ACESSO',
    title: 'Redefina sua senha',
    description: 'Informe o e-mail usado no cadastro para gerar um link seguro.',
    submit: 'Gerar link de recuperação',
  },
  reset: {
    eyebrow: 'NOVA SENHA',
    title: 'Proteja sua conta',
    description: 'Crie uma nova senha com pelo menos oito caracteres e um número.',
    submit: 'Salvar nova senha',
  },
} satisfies Record<AuthMode, Record<string, string>>;

function endpointFor(mode: AuthMode) {
  return {
    login: 'login',
    register: 'register',
    forgot: 'forgot-password',
    reset: 'reset-password',
  }[mode];
}

export function AuthForm({ mode, resetToken = '' }: AuthFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [developmentResetLink, setDevelopmentResetLink] = useState('');
  const copy = content[mode];
  const needsPassword = mode === 'login' || mode === 'register' || mode === 'reset';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    setSuccess('');

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries()) as Record<string, FormDataEntryValue>;

    if (mode === 'reset') {
      payload.token = resetToken;
    }

    try {
      const response = await fetch(`/api/backend/auth/${endpointFor(mode)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data =
        response.status === 204 ? {} : ((await response.json()) as Record<string, unknown>);

      if (!response.ok) {
        const message =
          typeof data.message === 'string' ? data.message : 'Não foi possível continuar.';
        setError(message);
        return;
      }

      if (mode === 'login' || mode === 'register') {
        router.push('/app');
        router.refresh();
        return;
      }

      if (mode === 'forgot') {
        setSuccess('Se o e-mail estiver cadastrado, o link ficará disponível por 30 minutos.');
        if (typeof data.resetToken === 'string') {
          setDevelopmentResetLink(`/redefinir-senha?token=${encodeURIComponent(data.resetToken)}`);
        }
        event.currentTarget.reset();
        return;
      }

      setSuccess('Senha redefinida. Agora você já pode entrar novamente.');
      event.currentTarget.reset();
    } catch {
      setError('Não foi possível conectar ao serviço. Tente novamente.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-card__heading">
        <span className="auth-eyebrow">{copy.eyebrow}</span>
        <h1 id="auth-title">{copy.title}</h1>
        <p>{copy.description}</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === 'register' ? (
          <div className="field-grid">
            <label className="form-field">
              <span>Seu nome</span>
              <input
                name="name"
                autoComplete="name"
                placeholder="Como podemos chamar você?"
                minLength={2}
                maxLength={120}
                required
              />
            </label>
            <label className="form-field">
              <span>Nome do negócio</span>
              <input
                name="workspaceName"
                placeholder="Ex.: Ruy Digital"
                minLength={2}
                maxLength={120}
                required
              />
            </label>
          </div>
        ) : null}

        {mode !== 'reset' ? (
          <label className="form-field">
            <span>E-mail</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              required
            />
          </label>
        ) : null}

        {needsPassword ? (
          <div className="form-field">
            <label htmlFor={`password-${mode}`}>{mode === 'reset' ? 'Nova senha' : 'Senha'}</label>
            <span className="password-input">
              <input
                id={`password-${mode}`}
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="Mínimo de 8 caracteres"
                minLength={8}
                maxLength={128}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </div>
        ) : null}

        {mode === 'login' ? (
          <div className="auth-form__options">
            <label className="checkbox-label">
              <input type="checkbox" name="remember" defaultChecked />
              <span>Lembrar de mim</span>
            </label>
            <Link href="/recuperar-senha">Esqueci minha senha</Link>
          </div>
        ) : null}

        {mode === 'reset' && !resetToken ? (
          <div className="form-message form-message--error" role="alert">
            O token de recuperação não foi informado. Gere um novo link.
          </div>
        ) : null}

        {error ? (
          <div className="form-message form-message--error" role="alert">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="form-message form-message--success" role="status">
            <CheckCircle2 size={17} />
            <span>{success}</span>
          </div>
        ) : null}

        {developmentResetLink ? (
          <Link className="development-link" href={developmentResetLink}>
            Abrir link local de recuperação <ArrowRight size={15} />
          </Link>
        ) : null}

        <button
          className="auth-submit"
          type="submit"
          disabled={pending || (mode === 'reset' && !resetToken)}
        >
          {pending ? <LoaderCircle className="spin" size={18} /> : null}
          <span>{pending ? 'Processando...' : copy.submit}</span>
          {!pending ? <ArrowRight size={18} /> : null}
        </button>
      </form>

      <footer className="auth-card__footer">
        {mode === 'login' ? (
          <p>
            Ainda não tem uma conta? <Link href="/cadastro">Crie agora</Link>
          </p>
        ) : null}
        {mode === 'register' ? (
          <p>
            Já possui uma conta? <Link href="/entrar">Entre no painel</Link>
          </p>
        ) : null}
        {mode === 'forgot' || mode === 'reset' ? (
          <p>
            Lembrou sua senha? <Link href="/entrar">Voltar para o login</Link>
          </p>
        ) : null}
      </footer>
    </section>
  );
}

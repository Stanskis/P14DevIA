'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api';
import type { FormFields } from '@/types/types';

const gridBackground = {
  backgroundImage:
    'linear-gradient(#34343c 2px, transparent 2px), linear-gradient(90deg, #34343c 2px, transparent 2px)',
  backgroundSize: '70px 70px',
};

const inputClass =
  'mt-2 w-full rounded-lg bg-slate-300 px-3 py-2 text-body-xs text-slate-dark outline-none placeholder:text-slate-700 focus:ring-2 focus:ring-brand-velvet';

export default function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>();

  const handleNextStep = async () => {
    const isValid = await trigger('email');
    if (isValid) {
      setError(null);
      setStep('password');
    }
  };

  const onSubmit = async (data: FormFields) => {
    setError(null);

    try {
      const response = await authApi.login({
        email: data.email,
        password: data.password,
      });

      if (!response.ok) {
        setStep('email');
        setValue('password', '');
        setError('Email ou mot de passe incorrect');
        return;
      }

      if (response.user) {
        router.replace('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la connexion');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-dark px-4 grid-background">
      <form
        onSubmit={
          step === 'email'
            ? (e) => {
                e.preventDefault();
                handleNextStep();
              }
            : handleSubmit(onSubmit)
        }
        className="w-full max-w-sm rounded-2xl bg-slate-white p-8"
      >
        <h1 className="flex items-center justify-center gap-2 text-heading-s text-brand-velvet">
          NEWSFOUNDRY
        </h1>
        <p className="mx-auto mt-4 max-w-64 text-center text-body-xs text-slate-700">
          Connectez-vous pour accéder à votre assistant d&apos;actualités IA
        </p>

        {step === 'email' ? (
          <div className="mt-6">
            <label htmlFor="email" className="block text-body-s text-slate-dark">
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              autoFocus
              autoComplete="email"
              placeholder="votre.email@exemple.com"
              className={inputClass}
              {...register('email', { required: "L'email est requis" })}
            />
            {errors.email && (
              <p className="mt-1 text-body-xs text-red-600">{errors.email.message}</p>
            )}
          </div>
        ) : (
          <div className="mt-6">
            <input
              type="email"
              autoComplete="username"
              value={getValues('email')}
              readOnly
              hidden
            />
            <label htmlFor="password" className="block text-body-s text-slate-dark">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              className={inputClass}
              {...register('password', { required: 'Le mot de passe est requis' })}
            />
            {errors.password && (
              <p className="mt-1 text-body-xs text-red-600">{errors.password.message}</p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-body-xs text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full cursor-pointer rounded-md bg-slate-dark py-3 text-body-xs text-slate-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Connexion…' : step === 'email' ? 'Suivant' : 'Se connecter'}
        </button>
      </form>
    </main>
  );
}

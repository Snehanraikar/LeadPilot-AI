'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { authService } from '../../../services/auth.service';
import { useAuthStore } from '../../../store/auth.store';
import { Zap, Chrome } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ApiClientError } from '../../../lib/api-client';

const registerSchema = z.object({
  organizationName: z.string().min(2, 'Organization name is too short'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const tokens = await authService.register(data);
      authService.storeTokens(tokens);
      const user = await authService.getMe();
      setUser(user);
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-12 flex-col justify-between border-r border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-text text-lg">LeadPilot AI</span>
        </div>
        <div className="space-y-4">
          <blockquote className="text-2xl font-light text-text leading-relaxed">
            "Close more deals with AI-powered insights that tell you exactly which leads to pursue."
          </blockquote>
          <p className="text-muted text-sm">— Built for modern sales teams</p>
        </div>
        <div className="flex gap-6 text-sm text-muted">
          <span>5 AI Modules</span>
          <span>Real-time Scoring</span>
          <span>RAG-powered Chat</span>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-text">Create your account</h1>
            <p className="text-muted text-sm mt-1">Start closing more deals with LeadPilot AI</p>
          </div>

          <a
            href={`${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '')}/api/auth/google`}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-text hover:bg-card/80 transition-colors"
          >
            <Chrome className="w-4 h-4" />
            Continue with Google
          </a>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Organization name"
              placeholder="Acme Inc."
              error={errors.organizationName?.message}
              {...register('organizationName')}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First name"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <Input
                label="Last name"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Create account
            </Button>
          </form>

          <p className="text-center text-sm text-muted">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

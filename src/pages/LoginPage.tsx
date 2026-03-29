import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Siren, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, name);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Cuenta creada. Revisa tu email para confirmar.');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error('Credenciales incorrectas');
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emergency">
            <Siren className="h-7 w-7 text-emergency-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Central de Bomberos</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">v4.0 — Sistema de Despacho</p>
        </div>

        <form onSubmit={handleSubmit} className="console-panel p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h2>

          {isSignUp && (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Nombre completo</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre Apellido"
                required
                className="bg-muted/50"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operador@central.cl"
              required
              className="bg-muted/50"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Contraseña</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="bg-muted/50"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isSignUp ? (
              <UserPlus className="mr-2 h-4 w-4" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            {isSignUp ? 'Crear Cuenta' : 'Ingresar'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-emergency hover:underline"
            >
              {isSignUp ? 'Inicia sesión' : 'Regístrate'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

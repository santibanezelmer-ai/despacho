import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, LogOut, Mail, ShieldCheck, User2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';

function formatRole(role: string | null) {
  if (!role) return 'Sin rol';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function MobileProfilePage() {
  const { user, signOut } = useAuth();
  const { currentOrg, orgRole } = useOrganization();
  const navigate = useNavigate();

  const displayName = useMemo(() => {
    const name = user?.user_metadata?.full_name as string | undefined;
    if (name?.trim()) return name;
    if (user?.email) return user.email.split('@')[0];
    return 'Usuario';
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-foreground">Mi perfil</h1>
        <p className="text-xs text-muted-foreground">Información de tu sesión móvil operativa</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
            <User2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">Usuario autenticado</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{user?.email ?? 'Sin correo'}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-foreground">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{currentOrg?.organization?.name ?? 'Sin organización activa'}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-foreground">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span>Rol: {formatRole(orgRole)}</span>
          </div>
        </div>
      </section>

      <Button type="button" variant="secondary" className="w-full h-11 gap-2" onClick={handleSignOut}>
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </Button>
    </div>
  );
}
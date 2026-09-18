"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Gamepad2, Lock, Mail, MapPin, Shield, AlertTriangle } from "lucide-react";

interface GeoInfo {
  ip: string;
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  isp?: string;
  proxy?: boolean;
  hosting?: boolean;
  error?: string;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [geo, setGeo] = useState<GeoInfo | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";

  useEffect(() => {
    fetch("/api/admin/geo")
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        setError(data.error || "Credenciales incorrectas");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-border bg-card px-10 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            autoFocus
            required
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="w-full rounded-lg border border-border bg-card px-10 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            required
          />
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-background hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {loading ? "Verificando..." : "Entrar"}
      </button>

      {/* Security info */}
      {geo && !geo.error && (
        <div className="rounded-lg bg-card/50 border border-border p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span className="font-medium">Información de seguridad</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>
              {geo.city}{geo.region ? `, ${geo.region}` : ""}, {geo.country}
            </span>
          </div>
          {geo.isp && (
            <div className="text-xs text-muted-foreground/70">
              ISP: {geo.isp}
            </div>
          )}
          {(geo.proxy || geo.hosting) && (
            <div className="flex items-center gap-2 text-xs text-yellow-400">
              <AlertTriangle className="h-3 w-3" />
              <span>Se detectó red corporativa/VPN</span>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex rounded-full bg-accent/10 p-3 mx-auto">
            <Gamepad2 className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold">GameVault Admin</h1>
          <p className="text-sm text-muted-foreground">
            Ingresa tus credenciales para acceder
          </p>
        </div>

        <Suspense fallback={<div className="text-center text-muted-foreground">Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "gv-cookie-consent";
const CONSENT_EVENT = "gv-cookie-consent-change";

/**
 * GameVault solo usa cookies estrictamente necesarias (sesion de administrador
 * y autenticacion), por lo que esto es un AVISO, no un muro de consentimiento:
 * no hay cookies de perfilado ni de publicidad que las requiera aceptacion.
 * Si se agrega analytics o publicidad, hay que cambiarlo a opt-in.
 */

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CONSENT_EVENT, onChange);
  };
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    // localStorage bloqueado (modo privado): se considera sin decision.
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

export default function CookieBanner() {
  // useSyncExternalStore en vez de useEffect + setState: lee el estado inicial
  // sin provocar renders en cascada y sin desajuste de hidratacion.
  const hasDecision = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function decide(value: "aceptadas" | "esenciales") {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // si no se puede guardar, se oculta igual para no molestar
    }
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }

  if (hasDecision) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <p className="text-sm text-muted-foreground">
            Usamos cookies estrictamente necesarias para que el sitio funcione: la sesión de
            administrador y la autenticación de usuarios. No usamos cookies de perfilado ni
            de publicidad. Ver la{" "}
            <Link href="/privacidad" className="text-accent underline underline-offset-4">
              política de privacidad
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => decide("aceptadas")}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Aceptar
          </button>
          <button
            onClick={() => decide("esenciales")}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Solo esenciales
          </button>
        </div>
      </div>
    </div>
  );
}
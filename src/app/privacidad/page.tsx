import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad - GameVault",
  description:
    "Qué datos recopila GameVault, con qué finalidad y cómo se protegen tus derechos.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Política de Privacidad</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última actualización: octubre de 2026</p>

      <div className="mt-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        En resumen: GameVault es un índice. No alojamos archivos, no vendemos datos y no
        usamos cookies de publicidad.
      </div>

      <Section title="1. Qué somos">
        <p>
          GameVault es un catálogo público que reúne títulos de videojuegos y enlaza a
          fuentes de descarga de terceros. No almacenamos archivos de juegos ni
          retransmitimos contenido. El acceso está restringido geográficamente a México.
        </p>
      </Section>

      <Section title="2. Qué datos recopilamos">
        <p>Solo cuando usas el sitio:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Datos de la sesión de administrador:</strong> si entras al panel de
            administración se crea una cookie <code>admin_token</code> firmada
            criptográficamente, con fecha de expiración de 7 días. Contiene un token, no
            información personal.
          </li>
          <li>
            <strong>Autenticación de usuarios:</strong> si inicias sesión se guardan las
            cookies de sesión de NextAuth y, si te registras, tu correo electrónico.
          </li>
          <li>
            <strong>Calificaciones, comentarios y listas de favoritos:</strong> se guardan
            asociados a tu cuenta para que persistan.
          </li>
          <li>
            <strong>Solicitudes de juegos:</strong> guardamos el título, la descripción
            opcional y el nombre que eliges mostrar.
          </li>
          <li>
            <strong>Registro de administración:</strong> IP, User-Agent y acción realizada,
            únicamente en las rutas de administración, como medida de seguridad.
          </li>
        </ul>
        <p>
          El sitio es público: ver el catálogo, buscar y filtrar no requiere registro ni
          deja rastro en nuestras bases de datos.
        </p>
      </Section>

      <Section title="3. Cookies">
        <p>
          Usamos únicamente cookies estrictamente necesarias para el funcionamiento del
          sitio. No utilizamos cookies de perfilado, de publicidad ni de redes sociales de
          terceros.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-foreground">
                <th className="py-2 pr-4 font-medium">Cookie</th>
                <th className="py-2 pr-4 font-medium">Finalidad</th>
                <th className="py-2 font-medium">Tipo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4 font-mono text-xs">admin_token</td>
                <td className="py-2 pr-4">Mantener la sesión del panel de administración</td>
                <td className="py-2">Necesaria</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4 font-mono text-xs">next-auth.*</td>
                <td className="py-2 pr-4">Mantener la sesión de usuario registrado</td>
                <td className="py-2">Necesaria</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">gv-cookie-consent</td>
                <td className="py-2 pr-4">Recordar que ya viste el aviso de cookies</td>
                <td className="py-2">Necesaria</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Puedes borrar estas cookies desde la configuración de tu navegador. Ten en cuenta
          que al borrarlas se cerrará la sesión.
        </p>
      </Section>

      <Section title="4. Servicios de terceros y enlaces externos">
        <p>
          Los enlaces de descarga apuntan a sitios de terceros (servicios de archivos,
          almacenes de ROM, foros). <strong>No controlamos esos sitios</strong> y no somos
          responsables de su contenido, sus políticas de privacidad ni sus prácticas. Al
          hacer clic sales de GameVault y pasas a estar bajo los términos de ese proveedor.
        </p>
        <p>
          Recomendamos el uso de un bloqueador de anuncios y un antivirus al usar
          enlaces externos.
        </p>
      </Section>

      <Section title="5. Conservación de datos">
        <p>
          Conservamos las calificaciones, comentarios, favoritos y solicitudes mientras
          exista la cuenta. Los registros de administración se conservan para poder
          auditar acciones. Los juegos y sus enlaces se conservan mientras formen parte
          del catálogo.
        </p>
      </Section>

      <Section title="6. Tus derechos (LFPDPPP)">
        <p>
          conforme a la Ley Federal de Protección de Datos Personales en Posesión de los
          Particulares, tienes derecho a acceder a tus datos, corregirlos, pedir su
          eliminación y revocar tu consentimiento. Para ejercerlo, escríbenos desde el
          foro en{" "}
          <Link href="/community" className="text-accent underline underline-offset-4">
            la sección de comunidad
          </Link>
          . Respondemos en un máximo de 20 días hábiles.
        </p>
      </Section>

      <Section title="7. Menores de edad">
        <p>
          El sitio no está dirigido a menores de 18 años. Si eres menor de esa edad y
          accediste al sitio, escríbenos y eliminaremos cualquier dato asociado a tu
          cuenta.
        </p>
      </Section>

      <Section title="8. Cambios a esta política">
        <p>
          Cualquier modificación se publicará en esta misma página con la fecha de
          actualización correspondiente.
        </p>
      </Section>

      <p className="mt-10 text-sm text-muted-foreground">
        Consulta también nuestros{" "}
        <Link href="/terminos" className="text-accent underline underline-offset-4">
          términos y condiciones
        </Link>
        .
      </p>
    </div>
  );
}
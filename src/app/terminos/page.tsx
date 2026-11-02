import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones - GameVault",
  description:
    "Condiciones de uso de GameVault: naturaleza del sitio, enlaces de terceros, limites de responsabilidad y uso aceptable.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Términos y Condiciones</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última actualización: octubre de 2026</p>

      <div className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Aviso importante.</strong> GameVault es un índice
        que enlaza a sitios de terceros. No alojamos ni distribuimos archivos de
        videojuegos. Los títulos y enlaces que aparecen en el catálogo pueden
        corresponder a obras protegidas por derechos de autor.
      </div>

      <Section title="1. Aceptación">
        <p>
          Al acceder a GameVault aceptas estos términos. Si no estás de acuerdo, deja de
          usar el sitio.
        </p>
      </Section>

      <Section title="2. Naturaleza del servicio">
        <p>
          GameVault es un catálogo público de información. Su función es reunir títulos de
          videojuegos y mostrar enlaces hacia fuentes externas de descarga.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>No alojamos archivos.</strong> No almacenamos, subimos ni
            retransmitimos juegos, ROMs ni parches. Solo publicamos direcciones web.
          </li>
          <li>
            <strong>No verificamos ni aprobamos el contenido</strong> de los enlaces.
          </li>
          <li>
            <strong>No estamos afiliados</strong> con editoras, estudios ni con las
            tiendas o plataformas de venta, y tampoco con los sitios de terceros enlazados.
          </li>
        </ul>
      </Section>

      <Section title="3. Enlaces de terceros">
        <p>
          Los enlaces apuntan a servicios externos que no controlamos. Cuando haces clic,
          quedas sujeto a los términos, la política de privacidad y las prácticas de ese
          proveedor. Cuando un enlace deja de funcionar lo retiramos del catálogo, pero no
          respondemos por el contenido, la disponibilidad, la seguridad ni la legalidad de
          lo que haya en esos sitios.
        </p>
        <p>
          Mantenemos un catálogo de enlaces públicos. Consideramos que enlazar a recursos
          que ya son públicos no constituye por sí mismo una infracción, y atendemos
          cualquier solicitud de retiro que recibamos.
        </p>
      </Section>

      <Section title="4. Responsabilidad del usuario">
        <p>Al usar el sitio, el usuario acepta y se hace responsable de:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Respetar las leyes de su país, incluidas las sobre derechos de autor.</li>
          <li>No usar el sitio para distribuir material protegido de forma masiva o comercial.</li>
          <li>Proteger su equipo: los archivos que descargue pueden contener malware.</li>
          <li>No intentar acceder al panel de administración sin autorización.</li>
          <li>No abusar del sistema de solicitudes de juegos ni enviar spam o contenido ilegal.</li>
        </ul>
        <p>
          Recomendamos un bloqueador de anuncios y un antivirus antes de usar cualquier
          enlace externo.
        </p>
      </Section>

      <Section title="5. Restricciones de acceso">
        <p>
          El acceso está restringido por ubicación y el registro de la actividad de
          administración se conserva para detectar abuso. Podemos bloquear IPs o cuentas
          que hagan un uso abusivo del sitio, de forma automática y sin previo aviso.
        </p>
      </Section>

      <Section title="6. Contenido enviado por usuarios">
        <p>
          Las calificaciones, comentarios y solicitudes los envían los usuarios. No los
          revisamos de forma previa y no respondemos por ellos. Podemos eliminar cualquier
          publicación que sea ofensiva, ilegal o que infrinja derechos de terceros.
        </p>
      </Section>

      <Section title="7. Disponibilidad y cambios">
        <p>
          El sitio se ofrece tal cual. Los enlaces pueden caerse, los catálogos cambian y
          podemos modificar o retirar contenido sin previo aviso. No garantizamos
          disponibilidad continua ni la permanencia de ningún enlace.
        </p>
      </Section>

      <Section title="8. Limitación de responsabilidad">
        <p>
          En la máxima medida permitida por la ley, GameVault y sus colaboradores no
          responden por daños derivados del uso del sitio o de los enlaces externos,
          incluyendo pérdida de datos, interrupciones del servicio o problemas de seguridad
          causados por archivos de terceros.
        </p>
      </Section>

      <Section title="9. Propiedad intelectual">
        <p>
          El diseño del sitio, su código y el texto de estas páginas son originales. Los
          títulos, carátulas y marcas de los juegos pertenecen a sus respectivos titulares y
          se usan únicamente de forma informativa para identificar cada título.
        </p>
      </Section>

      <Section title="10. Ley aplicable">
        <p>
          Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier
          controversia se somete a los tribunales competentes de la Ciudad de México,
          renunciando las partes que pudieran impedir litigar fuera de ese país.
        </p>
      </Section>

      <Section title="11. Cambios a los términos">
        <p>
          Podemos modificar estos términos en cualquier momento. La versión vigente siempre
          estará en esta página, con su fecha de actualización.
        </p>
      </Section>

      <p className="mt-10 text-sm text-muted-foreground">
        Consulta también nuestra{" "}
        <Link href="/privacidad" className="text-accent underline underline-offset-4">
          política de privacidad
        </Link>
        .
      </p>
    </div>
  );
}
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import LandingFooter from '@/components/landing/LandingFooter';

const LAST_UPDATE = '4 de septiembre de 2026';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Términos y Condiciones | Operix Dispatch</title>
        <meta
          name="description"
          content="Términos y condiciones de uso de Operix Dispatch, plataforma de despacho en tiempo real para cuerpos de bomberos."
        />
        <link rel="canonical" href="https://operixdispatch.com/terminos" />
      </Helmet>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-10 pb-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-emergency transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <h1 className="mt-8 text-3xl sm:text-4xl font-extrabold tracking-tight">
          Términos y Condiciones
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Última actualización: {LAST_UPDATE}
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. Aceptación</h2>
            <p>
              Estos términos regulan el acceso y uso de Operix Dispatch (en adelante, "la
              Plataforma"), un servicio de software para la gestión y despacho de emergencias
              destinado a cuerpos de bomberos y organizaciones de respuesta. Al registrarse,
              acceder o utilizar la Plataforma, la organización y sus usuarios aceptan estos
              términos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. Descripción del servicio</h2>
            <p>
              La Plataforma permite registrar y despachar emergencias, administrar móviles,
              personal voluntario, equipamiento, mapas operativos e informes. El servicio se
              entrega bajo modalidad de suscripción y se accede a través de navegador web y
              aplicaciones móviles asociadas.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. Cuentas y organizaciones</h2>
            <p>
              Cada organización opera de forma independiente y sus datos están aislados de los de
              otras organizaciones. El administrador de la organización es responsable de crear,
              invitar, autorizar y desactivar a sus usuarios, así como de la veracidad de la
              información registrada. Las credenciales son personales e intransferibles.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">4. Uso aceptable</h2>
            <p>El usuario se compromete a no:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Utilizar la Plataforma para fines ilícitos o no autorizados.</li>
              <li>Compartir credenciales o permitir el acceso a terceros no autorizados.</li>
              <li>
                Intentar vulnerar, copiar, descompilar o interferir el funcionamiento del servicio
                o el acceso de otras organizaciones.
              </li>
              <li>Registrar información falsa o difundir datos operativos sin autorización.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. Datos y confidencialidad</h2>
            <p>
              La información operativa y los datos personales registrados pertenecen a la
              organización que los ingresa. Operix los procesa únicamente para prestar el servicio,
              con controles de acceso por rol y aislamiento por organización. La organización es
              responsable de contar con las autorizaciones necesarias para tratar los datos de su
              personal y de terceros.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. Disponibilidad y soporte</h2>
            <p>
              La infraestructura de la Plataforma opera de forma continua, sin perjuicio de
              interrupciones por mantenimiento, causas de fuerza mayor o fallas de proveedores. El
              soporte técnico se presta según las condiciones del plan contratado. Operix no
              garantiza ausencia total de interrupciones y recomienda a cada organización mantener
              procedimientos alternativos de despacho.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">7. Limitación de responsabilidad</h2>
            <p>
              La Plataforma es una herramienta de apoyo a la gestión operativa. Las decisiones de
              despacho, la conducción de vehículos y las actuaciones en emergencia son de exclusiva
              responsabilidad de la organización y de su personal. En la medida permitida por la
              ley, la responsabilidad de Operix se limita al monto pagado por la organización en
              los últimos doce meses.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">8. Pagos y vigencia</h2>
            <p>
              Las suscripciones se facturan según el plan y la periodicidad acordados. La falta de
              pago puede suspender el acceso. Cualquiera de las partes puede poner término al
              servicio comunicándolo por escrito; la organización podrá solicitar la exportación de
              su información antes del cierre de la cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">9. Propiedad intelectual</h2>
            <p>
              El software, la marca y los materiales de Operix son propiedad de sus titulares. La
              suscripción otorga un derecho de uso limitado, no exclusivo e intransferible, mientras
              se mantenga vigente.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">10. Cambios en los términos</h2>
            <p>
              Estos términos pueden actualizarse. Los cambios relevantes se comunicarán a los
              administradores de cada organización y la fecha de última actualización se publicará
              en esta página.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">11. Contacto</h2>
            <p>
              Consultas sobre estos términos:{' '}
              <a
                href="mailto:contacto@operixdispatch.com"
                className="text-emergency hover:underline"
              >
                contacto@operixdispatch.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

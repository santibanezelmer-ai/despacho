import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import LandingFooter from '@/components/landing/LandingFooter';

const LAST_UPDATE = '2 de octubre de 2026';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg sm:text-xl font-bold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

const B = ({ children }: { children: ReactNode }) => (
  <strong className="text-foreground">{children}</strong>
);

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Política de Privacidad | Operix Dispatch</title>
        <meta
          name="description"
          content="Política de privacidad de Operix Dispatch: qué datos se recopilan, para qué se usan, cómo se protegen y cómo ejercer tus derechos."
        />
        <link rel="canonical" href="https://operixdispatch.com/privacidad" />
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
          Política de Privacidad
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">Última actualización: {LAST_UPDATE}</p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted-foreground">
          <Section title="1. Responsable">
            <p>
              <B>Operix Dispatch</B> (en adelante, "la Plataforma"), incluida su aplicación web y su
              aplicación móvil para Android, es desarrollada y operada por <B>Comercial Hels SpA</B>,
              RUT <B>78.504.548-3</B> ("Operix"). La Plataforma apoya la gestión, coordinación y
              despacho de emergencias de cuerpos de Bomberos y otras organizaciones de respuesta.
            </p>
            <p>
              Cada organización (cuerpo de Bomberos) administra los datos de sus propios usuarios,
              voluntarios, móviles y emergencias. Los datos de cada organización se mantienen
              aislados de las demás.
            </p>
          </Section>

          <Section title="2. Datos que recopilamos">
            <p><B>Cuentas y usuarios</B></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Correo electrónico y contraseña (la contraseña se guarda cifrada por el sistema de autenticación; Operix no la ve).</li>
              <li>Nombre visible y, opcionalmente, foto de perfil.</li>
              <li>Organización a la que perteneces, rol asignado (administrador, operador, oficial, visor o voluntario) y compañía.</li>
              <li>Invitaciones enviadas por correo para unirse a una organización.</li>
            </ul>

            <p><B>Voluntarios y organización</B> (ingresados por la organización)</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nombre, RUT, teléfono, correo, rango, compañía, código, fecha de ingreso, estado, especialidades, capacitaciones y anotaciones de hoja de vida.</li>
              <li>Datos de la organización y compañías: nombre, dirección, comuna, región, teléfono, correo institucional, logo y coordenadas del cuartel.</li>
            </ul>

            <p><B>Emergencias y móviles</B></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Emergencias: folio, clave, dirección, referencia, coordenadas, nombre y teléfono de quien llama, observaciones, preinforme, estados y horarios, móviles y personal asignado, y asistencia confirmada por voluntarios.</li>
              <li>Móviles: código, patente, marca, modelo, año, kilometraje, combustible, documentos, mantenciones, checklists y equipamiento.</li>
              <li>Bitácora de acciones y registro de auditoría de cambios realizados por los usuarios.</li>
            </ul>

            <p><B>Ubicación</B> (ver sección 4)</p>

            <p><B>Notificaciones push</B></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Token de notificación de Firebase Cloud Messaging (FCM) del dispositivo, la plataforma (Android o web) y la fecha de último uso.</li>
              <li>Registro de envío de cada notificación (estado, error si lo hubo y hora de apertura).</li>
            </ul>

            <p><B>Datos técnicos</B></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Cuando ocurre un error en la aplicación, se puede registrar el mensaje de error, la pantalla donde ocurrió, el identificador de usuario y el agente de usuario del navegador (user agent) para diagnóstico.</li>
              <li>Al compartir ubicación mediante enlace, el nivel de batería del dispositivo, si el navegador lo permite.</li>
              <li>Para los dispositivos vinculados a un móvil: nombre del dispositivo, plataforma y fecha de última conexión.</li>
            </ul>

            <p><B>Soporte y contacto</B></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Tickets de soporte: asunto, categoría, descripción, mensajes y correo de contacto.</li>
              <li>Formularios del sitio web: nombre, correo, ciudad, tamaño del cuerpo y mensaje.</li>
            </ul>

            <p>
              No recopilamos datos de pago dentro de la aplicación, ni contactos, fotos, archivos,
              micrófono o cámara del dispositivo, ni identificadores publicitarios.
            </p>
          </Section>

          <Section title="3. Para qué usamos los datos">
            <ul className="list-disc pl-5 space-y-1">
              <li>Permitir el inicio de sesión y controlar el acceso según la organización y el rol.</li>
              <li>Registrar, despachar y dar seguimiento a emergencias y a los móviles asignados.</li>
              <li>Avisar a los voluntarios de nuevas emergencias mediante notificaciones push.</li>
              <li>Mostrar ubicaciones en el mapa operativo y calcular cobertura territorial.</li>
              <li>Generar informes, historial y exportaciones de la organización.</li>
              <li>Responder solicitudes de soporte y contacto.</li>
              <li>Diagnosticar errores y mantener la seguridad del servicio.</li>
            </ul>
            <p>No vendemos datos personales ni los usamos con fines publicitarios.</p>
          </Section>

          <Section title="4. Uso de la ubicación">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <B>Ubicación del usuario en el mapa:</B> la aplicación puede pedir tu ubicación
                actual, solo cuando la usas y solo si das permiso, para centrar el mapa o mostrar tu
                posición. Esta ubicación no se guarda en nuestros servidores.
              </li>
              <li>
                <B>Ubicación compartida por enlace:</B> la central puede enviar un enlace a quien
                reporta una emergencia. Solo si esa persona abre el enlace y acepta compartir, se
                envían sus coordenadas, precisión, velocidad, dirección de desplazamiento y nivel de
                batería mientras la página esté abierta. El enlace vence automáticamente.
              </li>
              <li>
                <B>Ubicación de móviles:</B> los dispositivos vinculados a un móvil de la
                organización envían su posición GPS para mostrarla en el mapa operativo. El
                historial de posiciones se elimina automáticamente después de 7 días.
              </li>
              <li>
                <B>Ubicación de emergencias:</B> la dirección y coordenadas de cada emergencia
                quedan registradas como parte del registro operativo.
              </li>
            </ul>
            <p>Puedes retirar el permiso de ubicación en cualquier momento desde los ajustes de tu dispositivo o navegador.</p>
          </Section>

          <Section title="5. Notificaciones">
            <p>
              La aplicación usa notificaciones push para avisar de emergencias. Al aceptar el
              permiso, el dispositivo genera un token que se guarda asociado a tu usuario y
              organización. Puedes desactivarlas en cualquier momento desde los ajustes del
              dispositivo o navegador; al hacerlo dejarás de recibir alertas de emergencia.
            </p>
          </Section>

          <Section title="6. Servicios de terceros">
            <ul className="list-disc pl-5 space-y-2">
              <li><B>Lovable Cloud (infraestructura basada en Supabase):</B> base de datos, autenticación, almacenamiento de archivos y funciones del servidor.</li>
              <li><B>Google Firebase Cloud Messaging:</B> envío de notificaciones push.</li>
              <li><B>OpenStreetMap:</B> mapas base (teselas) y búsqueda de direcciones (Nominatim). Para esto se envían el texto buscado o las coordenadas del mapa.</li>
              <li><B>Google Maps Geocoding:</B> puede usarse en el servidor para obtener una dirección aproximada a partir de una ubicación compartida por enlace.</li>
              <li><B>Lovable AI:</B> asistente de soporte; procesa el texto del ticket que escribes para sugerir respuestas.</li>
              <li><B>Enlaces externos:</B> los botones para navegar con Google Maps o Waze, y para enviar el enlace de ubicación por WhatsApp, abren esos servicios externos, que aplican sus propias políticas.</li>
            </ul>
            <p>Los datos de rutas y kilometraje provienen de copias locales de fuentes oficiales y no envían tu información a terceros.</p>
          </Section>

          <Section title="7. Almacenamiento y protección">
            <ul className="list-disc pl-5 space-y-1">
              <li>Las comunicaciones se cifran mediante HTTPS.</li>
              <li>El acceso a los datos está limitado por organización y por rol mediante reglas de seguridad en la base de datos.</li>
              <li>Las contraseñas se protegen por el sistema de autenticación y se verifican contra listas de contraseñas filtradas.</li>
              <li>Los cambios relevantes quedan en un registro de auditoría.</li>
              <li>La aplicación puede guardar en el dispositivo una copia temporal de datos operativos y tu sesión para funcionar con conexión limitada.</li>
            </ul>
          </Section>

          <Section title="8. Conservación y eliminación">
            <ul className="list-disc pl-5 space-y-1">
              <li>El historial de posiciones de móviles se elimina automáticamente a los 7 días.</li>
              <li>Los enlaces de ubicación e invitaciones tienen vencimiento automático.</li>
              <li>Los datos de cuentas, voluntarios, emergencias y móviles se conservan mientras la organización mantenga su servicio, ya que forman parte de su registro operativo.</li>
              <li>
                Puedes solicitar la eliminación de tu cuenta y de tus datos personales escribiendo a{' '}
                <a href="mailto:contacto@operixdispatch.com" className="text-emergency hover:underline">contacto@operixdispatch.com</a>{' '}
                desde el correo asociado a tu cuenta. Coordinaremos la solicitud con tu
                organización, que puede necesitar conservar registros operativos de emergencias.
              </li>
            </ul>
          </Section>

          <Section title="9. Tus derechos">
            <p>
              De acuerdo con la legislación chilena de protección de datos personales, puedes
              solicitar acceso, rectificación, eliminación u oposición al tratamiento de tus datos.
              Puedes editar tu nombre y foto desde tu perfil; para otras solicitudes, contacta a
              tu organización o a Operix.
            </p>
          </Section>

          <Section title="10. Menores de edad">
            <p>La Plataforma está destinada a organizaciones de emergencia y a sus integrantes autorizados; no está dirigida a niños.</p>
          </Section>

          <Section title="11. Cambios a esta política">
            <p>Podemos actualizar esta política. Publicaremos la versión vigente en esta página con su fecha de actualización.</p>
          </Section>

          <Section title="12. Contacto">
            <p>
              Comercial Hels SpA — Operix Dispatch<br />
              Correo:{' '}
              <a href="mailto:contacto@operixdispatch.com" className="text-emergency hover:underline">contacto@operixdispatch.com</a>
            </p>
            <p>
              Consulta también nuestros{' '}
              <Link to="/terminos" className="text-emergency hover:underline">Términos y Condiciones</Link>.
            </p>
          </Section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

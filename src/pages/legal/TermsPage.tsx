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
          content="Términos y condiciones de uso de Operix Dispatch, plataforma de apoyo a la gestión y coordinación de emergencias."
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
            <p>
              Estos Términos y Condiciones regulan el acceso y uso de{' '}
              <strong className="text-foreground">Operix Dispatch</strong> (en
              adelante, <strong className="text-foreground">"la Plataforma"</strong>
              ), un servicio de software destinado a apoyar la gestión,
              coordinación y despacho de emergencias de cuerpos de Bomberos y
              otras organizaciones de respuesta.
            </p>
            <p className="mt-4">
              La Plataforma es desarrollada, administrada y operada por{' '}
              <strong className="text-foreground">Comercial Hels SpA</strong>, RUT{' '}
              <strong className="text-foreground">78.504.548-3</strong>, en adelante{' '}
              <strong className="text-foreground">"Operix"</strong>.
            </p>
            <p className="mt-4">
              Al registrarse, contratar, acceder o utilizar la Plataforma, la
              organización y sus usuarios declaran haber leído y aceptar estos
              Términos y Condiciones.
            </p>
            <p className="mt-4">
              Cuando exista un contrato, propuesta comercial, SLA, orden de
              compra o anexo suscrito entre Operix y una organización, las
              condiciones particulares de dichos documentos prevalecerán sobre
              estos Términos en caso de contradicción.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              1. Aceptación y alcance
            </h2>
            <p>
              Estos Términos regulan el acceso y utilización de Operix
              Dispatch, incluyendo sus aplicaciones web, aplicaciones móviles,
              módulos, funcionalidades y servicios asociados.
            </p>
            <p className="mt-2">
              El acceso o utilización de la Plataforma implica la aceptación de
              estos Términos.
            </p>
            <p className="mt-2">
              La organización que contrata o administra la Plataforma será
              responsable de que sus usuarios conozcan y cumplan estas
              condiciones.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              2. Descripción del servicio
            </h2>
            <p>
              Operix Dispatch es una plataforma tecnológica de apoyo a la
              gestión de emergencias que puede permitir, según el plan
              contratado:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Registrar y gestionar emergencias.</li>
              <li>Realizar despachos.</li>
              <li>Administrar móviles y recursos.</li>
              <li>Gestionar personal y voluntarios.</li>
              <li>Administrar equipamiento.</li>
              <li>Utilizar mapas y herramientas de geolocalización.</li>
              <li>Registrar información operacional.</li>
              <li>Generar informes y registros.</li>
              <li>Gestionar comunicaciones y notificaciones.</li>
              <li>Consultar estados operativos.</li>
              <li>Utilizar aplicaciones móviles asociadas.</li>
            </ul>
            <p className="mt-2">
              Las funcionalidades disponibles dependerán del plan,
              configuración y servicios contratados por cada organización.
            </p>
            <p className="mt-4 p-4 rounded-lg bg-emergency/10 border border-emergency/20 text-foreground font-medium">
              Operix Dispatch es una herramienta tecnológica de apoyo y no
              constituye por sí misma un servicio de respuesta de emergencia,
              autoridad operativa ni organismo de despacho oficial.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              3. Cuentas y organizaciones
            </h2>
            <p>
              Cada organización opera de manera independiente dentro de la
              Plataforma.
            </p>
            <p className="mt-2">
              Operix implementa mecanismos destinados a mantener separados los
              datos y accesos entre organizaciones, de acuerdo con la
              arquitectura y controles de seguridad de la Plataforma.
            </p>
            <p className="mt-2">
              El administrador de cada organización será responsable de:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Crear y administrar usuarios.</li>
              <li>Asignar roles y permisos.</li>
              <li>Invitar o autorizar usuarios.</li>
              <li>Desactivar usuarios que ya no deban tener acceso.</li>
              <li>Mantener actualizada la información institucional.</li>
              <li>Administrar adecuadamente las credenciales.</li>
            </ul>
            <p className="mt-2">
              Las credenciales de acceso son personales y no deberán
              compartirse con terceros no autorizados.
            </p>
            <p className="mt-2">
              La organización será responsable de las actividades realizadas
              mediante las cuentas que haya autorizado, salvo que corresponda
              atribuir responsabilidad a Operix conforme a la legislación
              aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              4. Uso aceptable
            </h2>
            <p>
              El Cliente y sus usuarios deberán utilizar la Plataforma
              exclusivamente para fines lícitos, autorizados y relacionados
              con las funciones contratadas.
            </p>
            <p className="mt-2">Queda prohibido:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Utilizar la Plataforma para fines ilícitos o no autorizados.</li>
              <li>Compartir credenciales o permitir el acceso a personas no autorizadas.</li>
              <li>Intentar vulnerar los mecanismos de seguridad.</li>
              <li>Intentar acceder a información de otras organizaciones.</li>
              <li>
                Copiar, descompilar, modificar o realizar ingeniería inversa
                sobre el software, salvo cuando la legislación aplicable
                expresamente lo permita.
              </li>
              <li>Introducir virus, malware o código malicioso.</li>
              <li>Interferir deliberadamente con el funcionamiento de la Plataforma.</li>
              <li>Generar deliberadamente alertas o emergencias falsas.</li>
              <li>Registrar información deliberadamente falsa con fines indebidos.</li>
              <li>Difundir información operacional sin autorización.</li>
              <li>Utilizar información de ubicación para fines no autorizados.</li>
              <li>Utilizar la Plataforma para vulnerar derechos de terceros.</li>
            </ul>
            <p className="mt-2">
              Operix podrá adoptar medidas preventivas, incluida la suspensión
              temporal de una cuenta, cuando exista un riesgo razonable para la
              seguridad, funcionamiento de la Plataforma o terceros.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              5. Datos y confidencialidad
            </h2>
            <p>
              La información operacional incorporada por una organización a la
              Plataforma permanecerá bajo su titularidad o bajo la titularidad
              que legalmente corresponda.
            </p>
            <p className="mt-2">Operix procesará dicha información en la medida necesaria para:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Prestar el servicio.</li>
              <li>Mantener la Plataforma.</li>
              <li>Proporcionar soporte.</li>
              <li>Realizar respaldos.</li>
              <li>Mantener la seguridad.</li>
              <li>Solucionar incidencias.</li>
              <li>Ejecutar las funcionalidades contratadas.</li>
              <li>Cumplir obligaciones legales.</li>
            </ul>
            <p className="mt-2">
              Operix no utilizará la información de una organización para fines
              ajenos a la prestación del servicio, salvo autorización
              correspondiente o cuando exista una obligación legal que lo
              requiera.
            </p>
            <p className="mt-2">
              La organización será responsable de contar con las autorizaciones,
              facultades y bases jurídicas necesarias para incorporar y tratar
              información de su personal, voluntarios, usuarios, terceros y
              demás personas cuyos datos sean registrados en la Plataforma.
            </p>
            <p className="mt-2">
              Las obligaciones específicas sobre tratamiento de datos personales
              se desarrollarán en la{' '}
              <strong className="text-foreground">Política de Privacidad</strong>{' '}
              y, cuando corresponda, en el{' '}
              <strong className="text-foreground">Anexo de Tratamiento de Datos</strong>{' '}
              o contrato respectivo.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              6. Geolocalización y ubicación
            </h2>
            <p>
              Algunas funcionalidades de Operix Dispatch pueden utilizar
              información de ubicación, incluyendo, según corresponda:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Ubicación de móviles.</li>
              <li>Ubicación de dispositivos.</li>
              <li>Ubicación de usuarios o voluntarios.</li>
              <li>Ubicación de incidentes.</li>
              <li>Ubicación proporcionada por solicitantes de emergencia.</li>
              <li>Rutas y desplazamientos.</li>
            </ul>
            <p className="mt-2">
              La información de ubicación será utilizada en la medida necesaria
              para proporcionar las funcionalidades contratadas.
            </p>
            <p className="mt-2">
              La organización será responsable de informar a las personas
              correspondientes y contar con las autorizaciones o bases
              jurídicas necesarias para el tratamiento de dicha información
              cuando corresponda.
            </p>
            <p className="mt-2">
              La información de ubicación puede depender de GPS, dispositivos,
              redes móviles, servicios de mapas u otras tecnologías externas y,
              por lo tanto,{' '}
              <strong className="text-foreground">
                no se garantiza que represente en todo momento una posición
                exacta o ininterrumpida
              </strong>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              7. Disponibilidad y continuidad operacional
            </h2>
            <p>
              Operix realiza esfuerzos técnicos y operacionales razonables para
              mantener la Plataforma disponible y operativa.
            </p>
            <p className="mt-2">
              Sin embargo, pueden producirse interrupciones o degradaciones
              debido a:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Mantenimiento.</li>
              <li>Actualizaciones.</li>
              <li>Fallas de Internet.</li>
              <li>Redes móviles.</li>
              <li>Telecomunicaciones.</li>
              <li>Suministro eléctrico.</li>
              <li>Dispositivos.</li>
              <li>GPS.</li>
              <li>Servicios de terceros.</li>
              <li>Infraestructura tecnológica.</li>
              <li>Ataques informáticos.</li>
              <li>Fuerza mayor.</li>
              <li>Circunstancias fuera del control razonable de Operix.</li>
            </ul>
            <p className="mt-2">
              La disponibilidad de Operix Dispatch no implica disponibilidad
              permanente de Internet, telefonía, redes móviles, GPS, dispositivos
              u otros servicios externos.
            </p>
            <p className="mt-2">
              Debido a la naturaleza crítica de las operaciones de emergencia,{' '}
              <strong className="text-foreground">
                cada organización deberá mantener procedimientos y medios
                alternativos de comunicación y despacho
              </strong>
              , tales como radiocomunicaciones, telefonía, procedimientos
              manuales u otros mecanismos institucionales.
            </p>
            <p className="mt-2">
              Operix Dispatch no deberá considerarse el único mecanismo
              disponible para gestionar una emergencia.
            </p>
            <p className="mt-2">
              Los niveles específicos de disponibilidad, soporte y tiempos de
              respuesta podrán establecerse mediante un{' '}
              <strong className="text-foreground">
                Acuerdo de Nivel de Servicio (SLA)
              </strong>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              8. Soporte técnico
            </h2>
            <p>
              El soporte técnico se prestará de acuerdo con las condiciones del
              plan contratado, contrato o SLA correspondiente.
            </p>
            <p className="mt-2">
              Los canales, horarios, prioridades y tiempos de respuesta podrán
              variar según el servicio contratado.
            </p>
            <p className="mt-2">
              Las incidencias técnicas deberán comunicarse preferentemente a:{' '}
              <a
                href="mailto:soporte@operixdispatch.com"
                className="text-emergency hover:underline"
              >
                soporte@operixdispatch.com
              </a>
            </p>
            <p className="mt-2">
              La disponibilidad de la Plataforma y la disponibilidad del equipo
              de soporte son conceptos independientes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              9. Decisiones y responsabilidad durante emergencias
            </h2>
            <p>
              Operix Dispatch es una{' '}
              <strong className="text-foreground">
                herramienta tecnológica de apoyo operacional
              </strong>
              .
            </p>
            <p className="mt-2">
              Las decisiones de despacho, movilización de recursos, conducción
              de vehículos, asignación de personal, coordinación de equipos y
              actuaciones durante una emergencia corresponden exclusivamente a
              la organización, sus operadores, mandos y personal autorizado.
            </p>
            <p className="mt-2">
              Las funcionalidades de asistencia, sugerencias, algoritmos,
              rutas, geolocalización, alertas o recomendaciones proporcionadas
              por la Plataforma tienen carácter de{' '}
              <strong className="text-foreground">apoyo y referencia</strong> y
              no sustituyen el criterio humano ni los protocolos institucionales.
            </p>
            <p className="mt-2">Operix no garantiza:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Un tiempo determinado de respuesta.</li>
              <li>La llegada de un recurso.</li>
              <li>La disponibilidad de personal o vehículos.</li>
              <li>Un resultado operacional específico.</li>
              <li>Un resultado determinado de una emergencia.</li>
            </ul>
            <p className="mt-2">
              La organización deberá mantener sus protocolos internos de
              emergencia y continuidad operacional.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              10. Limitación de responsabilidad
            </h2>
            <p>
              En la medida permitida por la legislación vigente, Operix no será
              responsable por daños o consecuencias derivados de hechos que no
              sean razonablemente atribuibles a su actuación.
            </p>
            <p className="mt-2">Esto puede incluir, entre otros:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Fallas de Internet o telecomunicaciones.</li>
              <li>Fallas de redes móviles.</li>
              <li>Indisponibilidad de servicios de terceros.</li>
              <li>Fallas de dispositivos.</li>
              <li>Cortes eléctricos.</li>
              <li>Errores o limitaciones de GPS o geolocalización.</li>
              <li>Información incorrecta proporcionada por la organización.</li>
              <li>Uso indebido de la Plataforma.</li>
              <li>Credenciales comprometidas por responsabilidad de la organización.</li>
              <li>Decisiones operacionales adoptadas por la organización o sus usuarios.</li>
              <li>Incumplimiento de protocolos internos.</li>
              <li>Hechos de fuerza mayor.</li>
            </ul>
            <p className="mt-2">
              Cuando resulte jurídicamente válido y aplicable, la responsabilidad
              económica de Operix derivada de la prestación del servicio podrá
              limitarse al monto efectivamente pagado por la organización
              durante los{' '}
              <strong className="text-foreground">
                doce meses anteriores al hecho que origine la reclamación
              </strong>
              , salvo aquellas responsabilidades que legalmente no puedan ser
              limitadas.
            </p>
            <p className="mt-2">
              Nada de lo establecido en estos Términos pretende excluir o
              limitar responsabilidades que la legislación chilena no permita
              excluir o limitar.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              11. Pagos, suspensión y vigencia
            </h2>
            <p>
              Las suscripciones serán facturadas de acuerdo con el plan, período
              y condiciones comerciales acordadas.
            </p>
            <p className="mt-2">
              La falta de pago podrá dar lugar a la suspensión del acceso,
              conforme a las condiciones establecidas en el contrato o
              documento comercial correspondiente.
            </p>
            <p className="mt-2">
              Operix podrá suspender total o parcialmente una cuenta o servicio
              cuando exista:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Incumplimiento grave.</li>
              <li>Uso ilícito.</li>
              <li>Riesgo de seguridad.</li>
              <li>Uso abusivo.</li>
              <li>Acceso no autorizado.</li>
              <li>Riesgo para la infraestructura.</li>
              <li>Requerimiento de autoridad competente.</li>
            </ul>
            <p className="mt-2">
              Cuando sea razonablemente posible, Operix comunicará previamente
              la suspensión.
            </p>
            <p className="mt-2">
              Las condiciones específicas de duración, renovación, cancelación y
              término del servicio podrán establecerse en el contrato
              correspondiente.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              12. Propiedad intelectual
            </h2>
            <p>
              El software, código, arquitectura, interfaces, diseños,
              documentación, marca <strong className="text-foreground">Operix</strong>,
              nombre <strong className="text-foreground">Operix Dispatch</strong>,
              elementos gráficos, metodologías, algoritmos y demás componentes
              propios de la Plataforma pertenecen a sus respectivos titulares.
            </p>
            <p className="mt-2">
              La suscripción no transfiere propiedad sobre dichos elementos.
            </p>
            <p className="mt-2">
              La contratación otorga únicamente un derecho de uso{' '}
              <strong className="text-foreground">
                limitado, no exclusivo, no transferible y condicionado al
                período y condiciones contratadas
              </strong>
              .
            </p>
            <p className="mt-2">
              Salvo autorización expresa o disposición legal aplicable, no está
              permitido copiar, distribuir, modificar, comercializar,
              sublicenciar o explotar los componentes de la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              13. Servicios de terceros
            </h2>
            <p>
              Algunas funcionalidades de la Plataforma pueden depender de
              servicios tecnológicos proporcionados por terceros, tales como:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Infraestructura en la nube.</li>
              <li>Servicios de mapas.</li>
              <li>Geolocalización.</li>
              <li>Almacenamiento.</li>
              <li>Correo electrónico.</li>
              <li>Notificaciones.</li>
              <li>APIs.</li>
              <li>Telecomunicaciones.</li>
              <li>Servicios de autenticación.</li>
            </ul>
            <p className="mt-2">
              La disponibilidad de dichos servicios puede estar sujeta a sus
              propias condiciones, restricciones o interrupciones.
            </p>
            <p className="mt-2">
              Operix procurará utilizar proveedores adecuados, pero no será
              responsable por interrupciones originadas exclusivamente en
              servicios de terceros que se encuentren fuera de su control
              razonable.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              14. Exportación y eliminación de información
            </h2>
            <p>
              Al finalizar el servicio, la organización podrá solicitar la
              exportación de la información que corresponda, conforme a las
              condiciones técnicas y contractuales aplicables.
            </p>
            <p className="mt-2">
              La exportación podrá estar sujeta a formatos, plazos y
              procedimientos definidos por Operix.
            </p>
            <p className="mt-2">
              Una vez finalizada la relación contractual, Operix podrá eliminar
              la información de acuerdo con sus políticas de conservación,
              obligaciones legales y condiciones contractuales.
            </p>
            <p className="mt-2">
              Determinadas copias de respaldo podrán permanecer durante períodos
              limitados de acuerdo con los ciclos técnicos de respaldo y
              eliminación utilizados por Operix.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              15. Cambios en los Términos
            </h2>
            <p>
              Operix podrá actualizar estos Términos cuando resulte necesario
              por razones legales, regulatorias, técnicas, operativas, de
              seguridad o evolución de la Plataforma.
            </p>
            <p className="mt-2">
              La fecha de última actualización será publicada en esta página.
            </p>
            <p className="mt-2">
              Cuando corresponda, los cambios relevantes podrán ser
              comunicados a los administradores de las organizaciones.
            </p>
            <p className="mt-2">
              Las condiciones particulares establecidas mediante contratos, SLA
              u otros documentos suscritos prevalecerán en caso de
              contradicción.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              16. Legislación aplicable
            </h2>
            <p>
              Estos Términos y Condiciones se regirán por las leyes de la{' '}
              <strong className="text-foreground">República de Chile</strong>.
            </p>
            <p className="mt-2">
              Las controversias serán sometidas a los tribunales competentes
              conforme a la legislación chilena, sin perjuicio de los mecanismos
              de solución de controversias que las partes puedan establecer
              contractualmente.
            </p>
            <p className="mt-2">
              Nada de estos Términos afectará los derechos o normas de carácter
              imperativo que resulten aplicables.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              17. Contacto
            </h2>
            <p>Para consultas relacionadas con estos Términos y Condiciones:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>
                <strong className="text-foreground">Contacto general:</strong>{' '}
                <a
                  href="mailto:contacto@operixdispatch.com"
                  className="text-emergency hover:underline"
                >
                  contacto@operixdispatch.com
                </a>
              </li>
              <li>
                <strong className="text-foreground">Ventas:</strong>{' '}
                <a
                  href="mailto:ventas@operixdispatch.com"
                  className="text-emergency hover:underline"
                >
                  ventas@operixdispatch.com
                </a>
              </li>
              <li>
                <strong className="text-foreground">Soporte técnico:</strong>{' '}
                <a
                  href="mailto:soporte@operixdispatch.com"
                  className="text-emergency hover:underline"
                >
                  soporte@operixdispatch.com
                </a>
              </li>
              <li>
                <strong className="text-foreground">Canal de denuncias:</strong>{' '}
                <a
                  href="mailto:denuncias@operixdispatch.com"
                  className="text-emergency hover:underline"
                >
                  denuncias@operixdispatch.com
                </a>
              </li>
            </ul>

            <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50 text-foreground">
              <p className="font-semibold">Identificación</p>
              <p className="mt-1">Operix Dispatch</p>
              <p>Comercial Hels SpA</p>
              <p>
                <strong>RUT:</strong> 78.504.548-3
              </p>
              <p>
                <strong>Domicilio:</strong> Ruta Interlagos 500, Chile
              </p>
              <p>
                <strong>Sitio web:</strong>{' '}
                <a
                  href="https://operixdispatch.com"
                  className="text-emergency hover:underline"
                >
                  operixdispatch.com
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">
              18. Aceptación
            </h2>
            <p>
              Al registrarse, contratar, acceder o utilizar Operix Dispatch, el
              Cliente y sus Usuarios declaran haber leído y comprendido estos
              Términos y Condiciones.
            </p>
            <p className="mt-2">
              Cuando corresponda, la contratación de la Plataforma estará
              adicionalmente sujeta al contrato de suscripción, propuesta
              comercial, SLA, Política de Privacidad, Anexo de Tratamiento de
              Datos y demás documentos aplicables.
            </p>
            <p className="mt-2">
              En caso de contradicción entre estos Términos y una condición
              particular expresamente acordada por escrito entre Operix y el
              Cliente,{' '}
              <strong className="text-foreground">prevalecerá la condición particular</strong>
              .
            </p>
            <div className="mt-6 pt-6 border-t border-border/30 text-foreground">
              <p className="font-bold">OPERIX DISPATCH</p>
              <p className="font-semibold">Comercial Hels SpA</p>
              <p className="mt-2 text-muted-foreground italic">
                Plataforma tecnológica de apoyo a la gestión y coordinación de
                emergencias.
              </p>
            </div>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

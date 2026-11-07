import { useEffect, useState } from 'react';
import { MessageCircle, X, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const WHATSAPP_NUMBER = '56935114306';

export function whatsappLink(text: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

type Topic = { id: string; label: string; answer: string[]; whatsapp: string };

const TOPICS: Topic[] = [
  {
    id: 'trial',
    label: '¿Cómo funciona la prueba gratuita de 15 días?',
    answer: [
      'Ofrecemos 15 días de prueba gratuita con todas las funcionalidades.',
      'Antes coordinamos una reunión breve para conocer tu Cuerpo y dejar configurados cuarteles, móviles y claves, así la prueba refleja tu operación real.',
    ],
    whatsapp: 'Hola, estuve revisando Operix Dispatch y me gustaría coordinar la reunión para activar la prueba gratuita de 15 días para mi Cuerpo de Bomberos.',
  },
  {
    id: 'modules',
    label: '¿Qué incluye Operix Dispatch?',
    answer: [
      'Consola de despacho con claves y tonos, emergencias activas y bitácora, mapa operativo con grifos, sectores y cuadrantes.',
      'Además: app Operix Voluntario para celulares, pantallas de cuartel, guardias por compañía, hoja de vida y carrera ANB, inventario de móviles y reportes.',
    ],
    whatsapp: 'Hola, me gustaría saber más sobre los módulos que incluye Operix Dispatch.',
  },
  {
    id: 'pricing',
    label: '¿Cuáles son los planes y precios?',
    answer: [
      'Tenemos un solo plan con todas las funcionalidades, cotizado según el tamaño de tu institución (compañías, móviles y voluntarios).',
      'Escríbenos y te enviamos una cotización a la medida.',
    ],
    whatsapp: 'Hola, quisiera solicitar una cotización de Operix Dispatch para mi Cuerpo de Bomberos.',
  },
  {
    id: 'compat',
    label: '¿Funciona en nuestras pantallas y celulares?',
    answer: [
      'Sí. La consola funciona en cualquier computador con navegador; las pantallas de cuartel en Smart TV o cualquier pantalla con navegador.',
      'Los voluntarios usan Operix Voluntario en Android e iPhone, con notificaciones de despacho.',
    ],
    whatsapp: 'Hola, tengo una consulta sobre compatibilidad de Operix Dispatch con nuestros equipos.',
  },
  {
    id: 'meeting',
    label: 'Quiero coordinar una reunión',
    answer: ['¡Excelente! Escríbenos por WhatsApp y agendamos una reunión de demostración en el horario que te acomode.'],
    whatsapp: 'Hola, me gustaría coordinar una reunión de demostración de Operix Dispatch.',
  },
];

const GENERAL_MSG = 'Hola, tengo una consulta sobre Operix Dispatch.';

export default function LandingAssistant() {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<Topic | null>(null);
  // En teléfonos se oculta sobre el formulario para no tapar sus campos.
  const [overForm, setOverForm] = useState(false);
  useEffect(() => {
    const check = () => {
      const r = document.getElementById('contacto')?.getBoundingClientRect();
      setOverForm(!!r && r.top < window.innerHeight && r.bottom > 0);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => { window.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, []);

  return (
    <div className={`${overForm && !open ? 'max-sm:hidden ' : ''}fixed right-3 bottom-3 sm:right-4 sm:bottom-6 z-50 flex flex-col items-end gap-3`}>
      {open && (
        <div
          role="dialog"
          aria-label="Asistente Operix"
          className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 bg-emergency px-4 py-3 text-emergency-foreground">
            <div className="flex items-center gap-2">
              {topic && (
                <button aria-label="Volver" onClick={() => setTopic(null)} className="rounded p-1 hover:bg-background/10">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <div>
                <p className="text-sm font-bold leading-tight">Asistente Operix</p>
                <p className="text-xs opacity-90">Respondemos tus dudas</p>
              </div>
            </div>
            <button aria-label="Cerrar asistente" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-background/10">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3 text-sm">
            {!topic ? (
              <>
                <div className="rounded-xl bg-muted px-3 py-2">
                  ¡Hola! 👋 Soy el asistente de Operix Dispatch. ¿En qué te puedo ayudar?
                </div>
                <div className="flex flex-col gap-2">
                  {TOPICS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTopic(t)}
                      className="text-left rounded-xl border border-border px-3 py-2 hover:border-emergency hover:bg-muted transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="ml-auto w-fit max-w-[85%] rounded-xl bg-emergency/15 px-3 py-2">{topic.label}</div>
                {topic.answer.map((p, i) => (
                  <div key={i} className="rounded-xl bg-muted px-3 py-2">{p}</div>
                ))}
                <a href={whatsappLink(topic.whatsapp)} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className="w-full gap-2 bg-emergency text-emergency-foreground hover:bg-emergency/90">
                    <MessageCircle className="h-4 w-4" /> Hablar por WhatsApp
                  </Button>
                </a>
                <button onClick={() => setTopic(null)} className="w-full text-xs text-muted-foreground hover:text-foreground">
                  Ver otras preguntas
                </button>
              </>
            )}
          </div>

          <a
            href={whatsappLink(GENERAL_MSG)}
            target="_blank"
            rel="noopener noreferrer"
            className="block border-t border-border px-4 py-2 text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Escribir directo al WhatsApp +56 9 3511 4306
          </a>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-emergency text-emergency-foreground shadow-xl hover:scale-105 transition-transform"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}

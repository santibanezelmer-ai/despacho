import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    q: '¿Cuánto tarda la implementación?',
    a: 'Operix puede estar operativo en menos de 48 horas. Incluimos configuración guiada, carga de datos iniciales y capacitación para tu equipo de despacho.',
  },
  {
    q: '¿Funciona sin conexión a internet?',
    a: 'La app móvil mantiene la información de la emergencia activa en caché. Para despacho en tiempo real se requiere conexión, pero los datos se sincronizan automáticamente al reconectarse.',
  },
  {
    q: '¿Es necesario instalar software?',
    a: 'No. Operix es 100% web y se accede desde cualquier navegador. La app móvil está disponible para Android e iOS sin configuraciones complejas.',
  },
  {
    q: '¿Cómo se protegen los datos de mi organización?',
    a: 'Cada organización tiene aislamiento total de datos con políticas de seguridad a nivel de fila. Toda la comunicación está cifrada y los accesos se controlan por roles.',
  },
  {
    q: '¿Puedo gestionar múltiples compañías o cuarteles?',
    a: 'Sí. Operix soporta estructura multi-compañía dentro de una misma organización, con vehículos, personal y recursos independientes por cada unidad.',
  },
  {
    q: '¿Incluye capacitación?',
    a: 'Todos los planes incluyen capacitación inicial para operadores y administradores. El plan Institucional añade sesiones de entrenamiento continuo y soporte técnico según condiciones del plan.',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function FAQSection() {
  return (
    <section className="px-4 sm:px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-4xl font-bold">Preguntas Frecuentes</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
            Resolvemos las dudas más comunes sobre la plataforma.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} variants={item}>
                <AccordionItem
                  value={`faq-${i}`}
                  className="border border-border/40 rounded-xl bg-card/60 backdrop-blur-sm px-5 hover:border-emergency/30 transition-colors data-[state=open]:border-emergency/40"
                >
                  <AccordionTrigger className="text-sm sm:text-base font-medium hover:no-underline text-left">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}

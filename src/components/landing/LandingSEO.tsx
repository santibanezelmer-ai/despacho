import { Helmet } from 'react-helmet-async';

const faqItems = [
  { q: '¿Cuánto tarda la implementación?', a: 'Operix puede estar operativo en menos de 48 horas con configuración guiada y capacitación incluida.' },
  { q: '¿Funciona sin conexión a internet?', a: 'La app móvil mantiene datos en caché. Los datos se sincronizan automáticamente al reconectarse.' },
  { q: '¿Es necesario instalar software?', a: 'No. Operix es 100% web. La app móvil está disponible para Android e iOS.' },
  { q: '¿Cómo se protegen los datos?', a: 'Aislamiento total por organización, cifrado end-to-end y control de acceso por roles.' },
  { q: '¿Puedo gestionar múltiples cuarteles?', a: 'Sí. Operix soporta estructura multi-compañía con recursos independientes.' },
  { q: '¿Incluye capacitación?', a: 'Todos los planes incluyen capacitación inicial. El plan Institucional añade entrenamiento continuo.' },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Operix',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'Sistema de despacho en tiempo real para cuerpos de bomberos. Coordina emergencias, vehículos y personal desde una plataforma centralizada.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'CLP', description: 'Planes adaptados al tamaño de cada organización.' },
};

export default function LandingSEO() {
  return (
    <Helmet>
      <title>Operix — Sistema de Despacho en Tiempo Real para Bomberos</title>
      <meta name="description" content="Despacha emergencias en segundos, coordina vehículos y personal en terreno. Plataforma operativa centralizada para cuerpos de bomberos." />
      <link rel="canonical" href="https://despacho.lovable.app/" />

      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://despacho.lovable.app/" />
      <meta property="og:title" content="Operix — Sistema de Despacho en Tiempo Real para Bomberos" />
      <meta property="og:description" content="Despacha emergencias en segundos, coordina vehículos y personal en terreno. Plataforma operativa centralizada para cuerpos de bomberos." />
      <meta property="og:image" content="https://despacho.lovable.app/favicon.png" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Operix — Sistema de Despacho en Tiempo Real para Bomberos" />
      <meta name="twitter:description" content="Despacha emergencias en segundos. Plataforma operativa centralizada para cuerpos de bomberos." />
      <meta name="twitter:image" content="https://despacho.lovable.app/favicon.png" />

      <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
    </Helmet>
  );
}

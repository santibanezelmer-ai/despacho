import { LANDING_FAQS } from './faqData';
import { Helmet } from 'react-helmet-async';

const faqItems = LANDING_FAQS;

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
  publisher: { '@type': 'Organization', name: 'Comercial Hels SpA' },
};

export default function LandingSEO() {
  return (
    <Helmet>
      <title>Operix — Sistema de Despacho en Tiempo Real para Bomberos</title>
      <meta name="description" content="Plataforma de despacho para cuerpos de bomberos: claves por móvil, mapa operativo, personal y fichas PDF. Solicita una demo guiada o una cotización institucional." />
      <link rel="canonical" href="https://operixdispatch.com/" />

      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://operixdispatch.com/" />
      <meta property="og:title" content="Operix — Sistema de Despacho en Tiempo Real para Bomberos" />
      <meta property="og:description" content="Plataforma de despacho para cuerpos de bomberos: claves por móvil, mapa operativo, personal y fichas PDF. Solicita una demo guiada o una cotización institucional." />
      <meta property="og:image" content="https://operixdispatch.com/favicon.png" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Operix — Sistema de Despacho en Tiempo Real para Bomberos" />
      <meta name="twitter:description" content="Despacha emergencias en segundos. Plataforma operativa centralizada para cuerpos de bomberos." />
      <meta name="twitter:image" content="https://operixdispatch.com/favicon.png" />

      <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
    </Helmet>
  );
}

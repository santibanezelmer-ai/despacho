/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu código de verificación</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>OPERIX DISPATCH</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Confirma tu identidad</Heading>
          <Text style={text}>Usa el siguiente código para confirmar la acción:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>
            Este código expira en unos minutos. Si no solicitaste esta acción, ignora el correo.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }
const header = { backgroundColor: '#0F1419', padding: '20px 24px', borderRadius: '8px 8px 0 0' }
const brand = { color: '#ED3131', fontSize: '14px', fontWeight: 800 as const, letterSpacing: '2px', margin: 0 }
const card = { border: '1px solid #E5E7EB', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '28px 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0F1419', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#4B5563', lineHeight: '1.6', margin: '0 0 16px' }
const codeStyle = {
  fontFamily: 'JetBrains Mono, Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#ED3131',
  letterSpacing: '6px',
  backgroundColor: '#F9FAFB',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  padding: '16px 20px',
  textAlign: 'center' as const,
  margin: '0 0 28px',
}
const footer = { fontSize: '12px', color: '#9CA3AF', margin: '28px 0 0', lineHeight: '1.5' }

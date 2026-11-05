/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  code?: string
  organizationName?: string
}

const VolunteerActivationCodeEmail = ({ code, organizationName }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu código de activación de Operix Voluntario</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>OPERIX VOLUNTARIO</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Código de activación</Heading>
          <Text style={text}>
            Ingresa este código para activar tu acceso{organizationName ? <> en <strong>{organizationName}</strong></> : null}:
          </Text>
          <Text style={codeStyle}>{code || '------'}</Text>
          <Text style={note}>El código vence en 10 minutos y solo puede usarse una vez.</Text>
          <Text style={footer}>
            Si no solicitaste este código, ignora este correo. Nadie de tu Cuerpo te pedirá este código.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: VolunteerActivationCodeEmail,
  subject: 'Tu código de activación de Operix Voluntario',
  displayName: 'Código de activación de voluntario',
  previewData: { code: '482913', organizationName: 'Cuerpo de Bomberos' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }
const header = { backgroundColor: '#0F1419', padding: '20px 24px', borderRadius: '8px 8px 0 0' }
const brand = { color: '#ED3131', fontSize: '14px', fontWeight: 800 as const, letterSpacing: '2px', margin: 0 }
const card = { border: '1px solid #E5E7EB', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '28px 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0F1419', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#4B5563', lineHeight: '1.6', margin: '0 0 16px' }
const codeStyle = { fontSize: '32px', fontWeight: 800 as const, letterSpacing: '8px', color: '#0F1419', margin: '0 0 16px' }
const note = { fontSize: '13px', color: '#4B5563', margin: '0' }
const footer = { fontSize: '12px', color: '#9CA3AF', margin: '28px 0 0', lineHeight: '1.5' }

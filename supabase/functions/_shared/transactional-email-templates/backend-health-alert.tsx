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
import type { TemplateEntry } from './registry.ts'

interface BackendHealthAlertProps {
  message?: string
  checkId?: string
  checkedAt?: string
}

const BackendHealthAlertEmail = ({
  message,
  checkId,
  checkedAt,
}: BackendHealthAlertProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>ALERTA: Operix backend no responde</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>OPERIX DISPATCH</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Alerta de disponibilidad</Heading>
          <Text style={text}>La verificación de salud del backend de Operix falló.</Text>
          <Text style={text}>
            <strong>Error:</strong> {message || 'No informado'}
          </Text>
          <Text style={text}>
            <strong>Check ID:</strong> {checkId || 'No informado'}
          </Text>
          <Text style={text}>
            <strong>Hora UTC:</strong> {checkedAt || 'No informada'}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BackendHealthAlertEmail,
  subject: 'ALERTA: Operix backend no responde',
  displayName: 'Alerta de salud del backend',
  previewData: {
    message: 'connection refused',
    checkId: '00000000-0000-0000-0000-000000000000',
    checkedAt: new Date().toISOString(),
  },
  to: 'Contacto@operixdistpach.com',
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }
const header = { backgroundColor: '#0F1419', padding: '20px 24px', borderRadius: '8px 8px 0 0' }
const brand = {
  color: '#ED3131',
  fontSize: '14px',
  fontWeight: 800 as const,
  letterSpacing: '2px',
  margin: 0,
}
const card = {
  border: '1px solid #E5E7EB',
  borderTop: 'none',
  borderRadius: '0 0 8px 8px',
  padding: '28px 24px',
}
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0F1419', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#4B5563', lineHeight: '1.6', margin: '0 0 16px' }

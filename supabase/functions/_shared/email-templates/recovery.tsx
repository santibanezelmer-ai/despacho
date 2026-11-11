/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

export interface RecoveryContext { location?: string | null; network?: string | null; device?: string | null; ip?: string | null; when?: string | null }
interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  context?: RecoveryContext | null
}

export const RecoveryEmail = ({ siteName, confirmationUrl, context }: RecoveryEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Restablece tu contraseña de {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>OPERIX DISPATCH</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Restablece tu contraseña</Heading>
          <Text style={text}>
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en {siteName}.
            Haz clic en el botón para crear una nueva contraseña.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Restablecer contraseña
          </Button>
          {context ? (
            <Section style={box}>
              <Text style={boxTitle}>Detalles de la solicitud</Text>
              {context.when ? <Text style={boxLine}><b>Fecha y hora:</b> {context.when}</Text> : null}
              <Text style={boxLine}><b>Ubicación aproximada:</b> {context.location || 'No disponible'}</Text>
              {context.network ? <Text style={boxLine}><b>Red:</b> {context.network}</Text> : null}
              {context.device ? <Text style={boxLine}><b>Dispositivo:</b> {context.device}</Text> : null}
              {context.ip ? <Text style={boxLine}><b>IP:</b> {context.ip}</Text> : null}
            </Section>
          ) : null}
          <Text style={footer}>
            Si no fuiste tú, no hagas clic en el enlace y avisa a tu oficial de compañía o administrador.
            Si no solicitaste este cambio, ignora este correo. Tu contraseña seguirá igual.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }
const header = { backgroundColor: '#0F1419', padding: '20px 24px', borderRadius: '8px 8px 0 0' }
const brand = { color: '#ED3131', fontSize: '14px', fontWeight: 800 as const, letterSpacing: '2px', margin: 0 }
const card = { border: '1px solid #E5E7EB', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '28px 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0F1419', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#4B5563', lineHeight: '1.6', margin: '0 0 24px' }
const button = {
  backgroundColor: '#ED3131',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600 as const,
  borderRadius: '8px',
  padding: '12px 22px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#9CA3AF', margin: '28px 0 0', lineHeight: '1.5' }
const box = { backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px 16px', margin: '24px 0 0' }
const boxTitle = { fontSize: '13px', fontWeight: 700 as const, color: '#0F1419', margin: '0 0 8px' }
const boxLine = { fontSize: '13px', color: '#4B5563', margin: '2px 0' }

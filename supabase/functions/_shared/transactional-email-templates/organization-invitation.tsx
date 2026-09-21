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
import type { TemplateEntry } from './registry.ts'

interface OrganizationInvitationProps {
  organizationName?: string
  roleLabel?: string
  inviteUrl?: string
  expiresAt?: string
}

const OrganizationInvitationEmail = ({
  organizationName,
  roleLabel,
  inviteUrl,
  expiresAt,
}: OrganizationInvitationProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Invitación para unirte a {organizationName || 'tu organización'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>OPERIX DISPATCH</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Te han invitado</Heading>
          <Text style={text}>
            Has sido invitado a unirte a <strong>{organizationName || 'la organización'}</strong>
            {roleLabel ? (
              <>
                {' '}como <strong>{roleLabel}</strong>
              </>
            ) : null}
            . Acepta la invitación para crear tu cuenta y comenzar a operar.
          </Text>
          {inviteUrl ? (
            <Button style={button} href={inviteUrl}>
              Aceptar invitación
            </Button>
          ) : null}
          {expiresAt ? (
            <Text style={note}>Este enlace expira el {expiresAt}.</Text>
          ) : null}
          <Text style={footer}>
            Si no esperabas esta invitación, puedes ignorar este correo.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrganizationInvitationEmail,
  subject: (data: Record<string, any>) =>
    `Invitación a ${data?.organizationName || 'Operix Dispatch'}`,
  displayName: 'Invitación a la organización',
  previewData: {
    organizationName: 'Cuerpo de Bomberos',
    roleLabel: 'Voluntario',
    inviteUrl: 'https://operixdispatch.com/invite/ejemplo',
    expiresAt: '30-09-2026',
  },
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
const text = { fontSize: '14px', color: '#4B5563', lineHeight: '1.6', margin: '0 0 24px' }
const note = { fontSize: '13px', color: '#4B5563', margin: '20px 0 0' }
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

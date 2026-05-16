/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Confirma tu correo para acceder a {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>OPERIX DISPATCH</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Confirma tu cuenta</Heading>
          <Text style={text}>
            Gracias por registrarte en{' '}
            <Link href={siteUrl} style={link}>
              <strong>{siteName}</strong>
            </Link>
            . Para activar tu acceso al sistema de despacho, confirma tu correo (
            <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>
            ).
          </Text>
          <Button style={button} href={confirmationUrl}>
            Confirmar correo
          </Button>
          <Text style={footer}>
            Si no creaste esta cuenta, puedes ignorar este mensaje de forma segura.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }
const header = {
  backgroundColor: '#0F1419',
  padding: '20px 24px',
  borderRadius: '8px 8px 0 0',
}
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
const link = { color: '#ED3131', textDecoration: 'underline' }
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

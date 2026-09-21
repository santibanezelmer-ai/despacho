import type { ComponentType } from 'npm:react@18.3.1'
import { template as backendHealthAlertTemplate } from './backend-health-alert.tsx'
import { template as organizationInvitationTemplate } from './organization-invitation.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'backend-health-alert': backendHealthAlertTemplate,
  'organization-invitation': organizationInvitationTemplate,
}

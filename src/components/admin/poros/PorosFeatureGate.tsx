'use client'

import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Power } from 'lucide-react'
import { getPorosFeature } from './poros-features'

interface PorosFeatureGateProps {
  featureKey: string
  enabled: boolean
  saving?: boolean
  onToggle: (key: string, value: boolean) => void
  children: ReactNode
}

/**
 * Wraps a Poros management screen with its on/off switch, so admins can
 * turn a feature on right where they use it instead of hunting in Settings.
 *
 * - Off: shows what the feature does and a "Turn on" button.
 * - On:  shows a slim status bar with the switch, then the screen itself.
 */
export function PorosFeatureGate({ featureKey, enabled, saving, onToggle, children }: PorosFeatureGateProps) {
  const feature = getPorosFeature(featureKey)
  const Icon = feature.icon

  if (!enabled) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 flex flex-col items-center text-center gap-4">
          <div className={`p-3 rounded-full ${feature.color}`}>
            <Icon className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-semibold text-navy">{feature.label} is off</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
          <Button onClick={() => onToggle(featureKey, true)} disabled={saving}>
            <Power className="w-4 h-4 mr-2" />
            Turn on {feature.label}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${feature.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-navy">{feature.label}</span>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">On</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          Enabled
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => onToggle(featureKey, checked)}
            disabled={saving}
          />
        </label>
      </div>
      {children}
    </div>
  )
}

interface SectionIntroProps {
  title: string
  description: string
  children?: ReactNode
}

/** Short heading + plain-language explanation at the top of a work area. */
export function PorosSectionIntro({ title, description, children }: SectionIntroProps) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-navy">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

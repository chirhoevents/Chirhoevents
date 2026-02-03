'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Trash2,
  Loader2,
  Edit,
  Info,
  Link as LinkIcon,
  Phone,
  ExternalLink,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/lib/toast'

interface InfoItem {
  id: string
  title: string
  content: string
  type: string
  url: string | null
  isActive: boolean
  order: number
}

interface PorosInfoProps {
  eventId: string
}

const ITEM_TYPES = [
  { value: 'info', label: 'Information' },
  { value: 'link', label: 'Link / Resource' },
  { value: 'contact', label: 'Contact Info' },
]

export function PorosInfo({ eventId }: PorosInfoProps) {
  const [items, setItems] = useState<InfoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InfoItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formType, setFormType] = useState('info')
  const [formUrl, setFormUrl] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  useEffect(() => {
    loadItems()
  }, [eventId])

  async function loadItems() {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/info-items`)
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Failed to load info items:', error)
      toast.error('Failed to load info items')
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingItem(null)
    setFormTitle('')
    setFormContent('')
    setFormType('info')
    setFormUrl('')
    setFormIsActive(true)
    setDialogOpen(true)
  }

  function openEditDialog(item: InfoItem) {
    setEditingItem(item)
    setFormTitle(item.title)
    setFormContent(item.content)
    setFormType(item.type)
    setFormUrl(item.url || '')
    setFormIsActive(item.isActive)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!formTitle || !formContent) {
      toast.error('Title and content are required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: formTitle,
        content: formContent,
        type: formType,
        url: formUrl || null,
        isActive: formIsActive,
      }

      let response
      if (editingItem) {
        response = await fetch(`/api/admin/events/${eventId}/poros/info-items/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        response = await fetch(`/api/admin/events/${eventId}/poros/info-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to save')
      }

      toast.success(editingItem ? 'Info item updated' : 'Info item created')
      setDialogOpen(false)
      loadItems()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save info item')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(item: InfoItem) {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/info-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      })

      if (!response.ok) throw new Error('Failed to update')

      setItems(prev =>
        prev.map(i => i.id === item.id ? { ...i, isActive: !i.isActive } : i)
      )
      toast.success(item.isActive ? 'Info item deactivated' : 'Info item activated')
    } catch {
      toast.error('Failed to update info item')
    }
  }

  async function handleDelete() {
    if (!deletingId) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/info-items/${deletingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast.success('Info item deleted')
      setDeleteDialogOpen(false)
      setDeletingId(null)
      loadItems()
    } catch {
      toast.error('Failed to delete info item')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(id: string) {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'link': return <LinkIcon className="w-4 h-4 text-blue-500" />
      case 'contact': return <Phone className="w-4 h-4 text-green-500" />
      default: return <Info className="w-4 h-4 text-purple-500" />
    }
  }

  function getTypeBadgeVariant(type: string) {
    switch (type) {
      case 'link': return 'bg-blue-100 text-blue-700'
      case 'contact': return 'bg-green-100 text-green-700'
      default: return 'bg-purple-100 text-purple-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Info Items
              </CardTitle>
              <CardDescription>
                Manage information items displayed on the public portal Info section
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Info Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Info className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No info items added yet</p>
              <p className="text-sm mt-1">Add information, links, or contact details for participants</p>
              <Button onClick={openCreateDialog} variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add First Info Item
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <div
                  key={item.id}
                  className={`flex items-start justify-between p-4 rounded-lg border ${
                    item.isActive
                      ? 'bg-white border-gray-200'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5">{getTypeIcon(item.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{item.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeBadgeVariant(item.type)}`}>
                          {item.type}
                        </span>
                        {!item.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {item.url.length > 50 ? item.url.substring(0, 50) + '...' : item.url}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Switch
                      checked={item.isActive}
                      onCheckedChange={() => toggleActive(item)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(item)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => confirmDelete(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Info Item' : 'Add Info Item'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update this information item'
                : 'Add information that will be shown on the public portal'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Emergency Contact, Wi-Fi Info, Parking"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Content</Label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Enter the information content..."
                className="mt-1"
                rows={4}
              />
            </div>

            <div>
              <Label>URL (optional)</Label>
              <Input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Info Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this info item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

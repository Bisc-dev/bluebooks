import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function CreateGroupDialog({ open, onOpenChange, onSubmit, isPending }) {
  const [form, setForm] = useState({ name: '', description: '', is_private: false, photo_url: '' });

  const handle = () => {
    if (!form.name) return;
    onSubmit(form);
    setForm({ name: '', description: '', is_private: false, photo_url: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-white/10 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Criar Grupo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nome do grupo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-xl" />
          <Textarea placeholder="Descrição (opcional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="rounded-xl" rows={2} />
          <Input placeholder="URL da foto do grupo (opcional)" value={form.photo_url} onChange={e => setForm({ ...form, photo_url: e.target.value })} className="rounded-xl" />
          <div className="flex items-center gap-2">
            <Switch checked={form.is_private} onCheckedChange={v => setForm({ ...form, is_private: v })} />
            <Label className="text-sm">Grupo privado</Label>
          </div>
          <Button onClick={handle} disabled={!form.name || isPending} className="w-full bg-primary rounded-xl">
            {isPending ? 'Criando...' : 'Criar Grupo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

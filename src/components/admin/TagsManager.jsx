import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Tag, Pencil, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ProfileTags from '@/components/profile/ProfileTags';

const PRESET_COLORS = ['#2054BC','#9B4DCA','#E05B50','#E09A2A','#16A34A','#0891B2','#D4507A','#7C3AED'];

const PRESET_TAGS = ['Leitor VIP','Crítico Literário','Administrador','Autor','Recomendador','Membro Ativo','Criador de Blogs'];

export default function TagsManager() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#2054BC');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return data;
    },
  });

  const updateTagsMutation = useMutation({
    mutationFn: async ({ userId, tags }) => {
      const { error } = await supabase
        .from('users')
        .update({ profile_tags: tags })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const applyTags = (tags) => {
    if (!selectedUser) return;
    updateTagsMutation.mutate({ userId: selectedUser.id, tags });
    setSelectedUser(u => ({ ...u, profile_tags: tags }));
  };

  const addTag = () => {
    if (!newLabel.trim() || !selectedUser) return;
    const tags = [...(selectedUser.profile_tags || []), { label: newLabel.trim(), color: newColor }];
    applyTags(tags);
    setNewLabel('');
  };

  const removeTag = (idx) => {
    const tags = (selectedUser.profile_tags || []).filter((_, i) => i !== idx);
    applyTags(tags);
    setEditingIdx(null);
  };

  const startEdit = (idx) => {
    const tag = selectedUser.profile_tags[idx];
    setEditingIdx(idx);
    setEditLabel(tag.label);
    setEditColor(tag.color);
  };

  const saveEdit = () => {
    const tags = (selectedUser.profile_tags || []).map((t, i) =>
      i === editingIdx ? { label: editLabel.trim(), color: editColor } : t
    );
    applyTags(tags);
    setEditingIdx(null);
  };

  const addPreset = (label) => {
    if (!selectedUser) return;
    if ((selectedUser.profile_tags || []).some(t => t.label === label)) return;
    const tags = [...(selectedUser.profile_tags || []), { label, color: newColor }];
    applyTags(tags);
  };

  return (
    <div className="space-y-5 mt-4">
      {/* User selector */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Selecione um usuário para gerenciar tags:</p>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {users.map(u => (
            <button
              key={u.id}
              onClick={() => { setSelectedUser(u); setEditingIdx(null); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedUser?.id === u.id ? 'border-primary bg-primary/5' : 'border-border/30 bg-card/60 hover:bg-card'}`}
            >
              <div className="w-9 h-9 rounded-full bg-primary/20 overflow-hidden flex-shrink-0">
                {u.avatar_url
                  ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center font-bold text-primary text-sm">{(u.full_name || 'U')[0]}</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.username || u.full_name}</p>
                <ProfileTags tags={u.profile_tags || []} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tag editor */}
      {selectedUser && (
        <div className="bg-card/80 border border-border/50 rounded-2xl p-4 space-y-4">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" /> Tags de {selectedUser.username || selectedUser.full_name}
          </p>

          {/* Preset suggestions */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Sugestões rápidas:</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map(label => (
                <button
                  key={label}
                  onClick={() => addPreset(label)}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-border/50 hover:border-primary hover:text-primary transition-colors bg-card/60"
                >
                  + {label}
                </button>
              ))}
            </div>
          </div>

          {/* Current tags list */}
          <div className="space-y-2">
            {(selectedUser.profile_tags || []).length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma tag ainda.</p>
            )}
            {(selectedUser.profile_tags || []).map((tag, i) => (
              <div key={i}>
                {editingIdx === i ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      className="rounded-xl flex-1 min-w-0 h-8 text-xs"
                      onKeyDown={e => e.key === 'Enter' && saveEdit()}
                    />
                    <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border border-border" />
                    <div className="flex gap-1">
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => setEditColor(c)}
                          className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 ${editColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <Button size="sm" onClick={saveEdit} className="h-8 px-2 rounded-lg bg-primary"><Check className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingIdx(null)} className="h-8 px-2 rounded-lg"><X className="w-3.5 h-3.5" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="flex-1 px-3 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: tag.color, boxShadow: `0 0 8px ${tag.color}55` }}
                    >
                      {tag.label}
                    </span>
                    <button onClick={() => startEdit(i)} className="text-muted-foreground hover:text-primary transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeTag(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add new tag */}
          <div className="border-t border-border/30 pt-3 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Nova tag personalizada:</p>
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="Nome da tag (ex: Leitor VIP)"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                className="rounded-xl flex-1 min-w-0 text-sm"
              />
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer border border-border" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setNewColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${newColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <Button onClick={addTag} disabled={!newLabel.trim() || updateTagsMutation.isPending} className="rounded-xl gap-2 w-full bg-primary">
              <Plus className="w-4 h-4" /> Adicionar Tag
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

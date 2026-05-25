import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image, Type, Upload, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

const GRADIENTS = [
  'from-primary to-violet-600',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-indigo-500 to-purple-600',
];

async function uploadFile(file) {
  const ext = file.name.split('.').pop();
  const path = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from('uploads').upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(data.path);
  return publicUrl;
}

export default function AddStatusModal({ currentUser, onClose, onSuccess }) {
  const [mode, setMode] = useState('image');
  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [gradient, setGradient] = useState(GRADIENTS[0]);
  const [mediaUrl, setMediaUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || uploading) return;
    setUploading(true);
    const url = await uploadFile(file);
    setMediaUrl(url);
    setUploading(false);
  };

  const canPost = mode === 'image' ? !!mediaUrl : !!text.trim();

  const post = async () => {
    if (!canPost || posting) return;
    setPosting(true);
    const expires_at = Date.now() + 24 * 60 * 60 * 1000;
    const { error } = await supabase.from('statuses').insert({
      author_email: currentUser.email,
      author_name: currentUser.full_name || currentUser.username || '',
      author_avatar: currentUser.avatar_url || '',
      author_username: currentUser.username || '',
      media_url: mode === 'image' ? mediaUrl : '',
      media_type: mode === 'image' ? 'image' : 'text',
      text_content: text,
      text_color: textColor,
      bg_gradient: gradient,
      views: [],
      expires_at,
      created_date: new Date().toISOString(),
    });
    if (!error) onSuccess();
    setPosting(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="w-full max-w-sm bg-card rounded-t-3xl sm:rounded-2xl overflow-hidden border border-border/30"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/20">
            <h3 className="font-heading font-bold">Novo Status</h3>
            <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 p-3 pb-0">
            {[{ id: 'image', icon: Image, label: 'Imagem/GIF' }, { id: 'text', icon: Type, label: 'Texto' }].map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${mode === m.id ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
              >
                <m.icon className="w-3.5 h-3.5" /> {m.label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-4">
            {mode === 'image' ? (
              <>
                <input ref={fileRef} type="file" accept="image/*,.gif" className="hidden" onChange={handleFile} />
                <div
                  onClick={() => !uploading && fileRef.current?.click()}
                  className="relative h-48 rounded-2xl border-2 border-dashed border-border/50 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden bg-muted/30"
                >
                  {mediaUrl ? (
                    <img src={mediaUrl} alt="" className="absolute inset-0 w-full h-full object-contain" />
                  ) : uploading ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-xs">Enviando...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="w-8 h-8" />
                      <span className="text-xs">Clique para enviar imagem ou GIF</span>
                    </div>
                  )}
                </div>
                {mediaUrl && (
                  <button onClick={() => setMediaUrl('')} className="text-xs text-destructive hover:underline">Remover imagem</button>
                )}
              </>
            ) : (
              <>
                <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${gradient} p-6 min-h-[160px] flex items-center justify-center`}>
                  <Textarea
                    placeholder="O que está pensando?"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    maxLength={300}
                    className="bg-transparent border-none text-center text-lg font-bold resize-none outline-none focus-visible:ring-0 placeholder:text-white/50 shadow-none min-h-[100px]"
                    style={{ color: textColor }}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {GRADIENTS.map(g => (
                    <button
                      key={g}
                      onClick={() => setGradient(g)}
                      className={`w-7 h-7 rounded-full bg-gradient-to-br ${g} transition-transform ${gradient === g ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
                    />
                  ))}
                </div>
              </>
            )}

            {mode === 'image' && (
              <Textarea
                placeholder="Legenda (opcional)"
                value={text}
                onChange={e => setText(e.target.value)}
                maxLength={200}
                className="rounded-xl resize-none text-sm"
                rows={2}
              />
            )}

            <Button
              onClick={post}
              disabled={!canPost || posting || uploading}
              className="w-full bg-primary rounded-xl gap-2"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {posting ? 'Publicando...' : 'Publicar Status'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

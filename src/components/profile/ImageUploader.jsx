import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCEPTED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

async function uploadFile(file) {
  const ext = file.name.split('.').pop();
  const path = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from('uploads').upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(data.path);
  return publicUrl;
}

export default function ImageUploader({ onUpload, className, children, label, compact }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      alert('Formato não suportado. Use PNG, JPG, WEBP ou GIF.');
      return;
    }
    setUploading(true);
    setDone(false);
    const url = await uploadFile(file);
    setUploading(false);
    setDone(true);
    onUpload(url);
    setTimeout(() => setDone(false), 2000);
  };

  const onInputChange = (e) => {
    handleFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (!uploading) inputRef.current?.click();
  };

  if (compact) {
    return (
      <div className={cn('relative cursor-pointer', className)} onClick={handleClick}>
        {uploading ? (
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        ) : done ? (
          <CheckCircle2 className="w-5 h-5 text-green-400" />
        ) : (
          label || <Upload className="w-5 h-5 text-white" />
        )}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" className="hidden" onChange={onInputChange} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative cursor-pointer group border-2 border-dashed border-border/50 rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:border-primary/60 hover:bg-primary/5 transition-all duration-200',
        className
      )}
      onClick={handleClick}
    >
      {children}

      {uploading ? (
        <>
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Enviando...</p>
        </>
      ) : done ? (
        <>
          <CheckCircle2 className="w-8 h-8 text-green-500" />
          <p className="text-sm text-green-500 font-medium">Enviado!</p>
        </>
      ) : (
        <>
          <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground/80">{label || 'Clique para enviar'}</p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP, GIF (animados suportados)</p>
          </div>
        </>
      )}

      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" className="hidden" onChange={onInputChange} />
    </div>
  );
}

import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Save, Image, Hash, Bold, Italic, List, AlignLeft, Minus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

async function uploadFile(file) {
  const ext = file.name.split('.').pop();
  const path = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from('uploads').upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(data.path);
  return publicUrl;
}

export default function BlogEditor({ post, onSave, onCancel, isLoading }) {
  const [title, setTitle] = useState(post?.title || '');
  const [coverUrl, setCoverUrl] = useState(post?.cover_url || '');
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState(post?.hashtags || []);
  const [uploadingCover, setUploadingCover] = useState(false);
  const editorRef = useRef(null);
  const coverInputRef = useRef(null);
  const [editorInitialized, setEditorInitialized] = useState(false);

  const initEditor = (el) => {
    if (el && !editorInitialized) {
      editorRef.current = el;
      if (post?.content) {
        el.innerHTML = post.content;
      }
      setEditorInitialized(true);
    }
  };

  const exec = (cmd, value = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const insertDivider = () => {
    exec('insertHTML', '<hr style="border:none;border-top:1px solid #444;margin:16px 0;"><br>');
  };

  const insertImage = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = await uploadFile(file);
    exec('insertHTML', `<img src="${url}" style="max-width:100%;border-radius:12px;margin:8px 0;" /><br>`);
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace('#', '');
    if (tag && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
      setHashtagInput('');
    }
  };

  const removeHashtag = (tag) => setHashtags(hashtags.filter(t => t !== tag));

  const handleSave = (isDraft = false) => {
    if (!title.trim()) return;
    const content = editorRef.current?.innerHTML || '';
    onSave({ title, content, cover_url: coverUrl, hashtags, is_draft: isDraft });
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    const url = await uploadFile(file);
    setCoverUrl(url);
    setUploadingCover(false);
    e.target.value = '';
  };

  const toolbarBtns = [
    { label: <Bold className="w-4 h-4" />, title: 'Negrito', action: () => exec('bold') },
    { label: <Italic className="w-4 h-4" />, title: 'Itálico', action: () => exec('italic') },
    { label: <List className="w-4 h-4" />, title: 'Lista', action: () => exec('insertUnorderedList') },
    { label: <AlignLeft className="w-4 h-4" />, title: 'Lista numerada', action: () => exec('insertOrderedList') },
    { label: <Minus className="w-4 h-4" />, title: 'Divisor', action: insertDivider },
  ];

  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-bold">{post ? 'Editar Blog' : 'Novo Blog'}</h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Title */}
      <Input
        placeholder="Título do blog..."
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="text-lg font-heading bg-background/50 border-border/50 rounded-xl"
      />

      {/* Cover */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5 text-xs"
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
          >
            <Image className="w-3.5 h-3.5" />
            {uploadingCover ? 'Enviando...' : 'Capa do blog'}
          </Button>
          {coverUrl && (
            <button onClick={() => setCoverUrl('')} className="text-muted-foreground hover:text-destructive">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <input ref={coverInputRef} type="file" accept="image/*,image/gif" className="hidden" onChange={handleCoverUpload} />
        </div>
        {coverUrl && (
          <img src={coverUrl} alt="Capa" className="w-full h-44 object-cover rounded-xl" />
        )}
      </div>

      {/* Editor */}
      <div className="rounded-xl border border-border/50 overflow-hidden bg-background/50">
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border/30 bg-muted/30 flex-wrap">
          {['H1', 'H2', 'H3'].map((h, i) => (
            <button
              key={h}
              title={`Título ${i + 1}`}
              onMouseDown={e => { e.preventDefault(); exec('formatBlock', h); }}
              className="px-2 py-1 text-xs font-bold rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              {h}
            </button>
          ))}
          <div className="w-px h-4 bg-border/50 mx-1" />
          {toolbarBtns.map((btn, i) => (
            <button
              key={i}
              title={btn.title}
              onMouseDown={e => { e.preventDefault(); btn.action(); }}
              className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              {btn.label}
            </button>
          ))}
          <div className="w-px h-4 bg-border/50 mx-1" />
          <label title="Inserir imagem" className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground cursor-pointer">
            <Image className="w-4 h-4" />
            <input type="file" accept="image/*,image/gif" className="hidden" onChange={e => { insertImage(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>

        {/* Contenteditable area */}
        <div
          ref={initEditor}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Escreva seu blog aqui... Use a barra acima para formatar o texto, adicionar imagens e muito mais!"
          className="min-h-[220px] p-4 text-sm leading-relaxed outline-none focus:outline-none prose prose-sm dark:prose-invert max-w-none blog-editor-content"
          style={{ wordBreak: 'break-word' }}
          onKeyDown={e => {
            if (e.key === 'Tab') { e.preventDefault(); exec('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;'); }
          }}
        />
      </div>

      {/* Hashtags */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input
            placeholder="Adicionar hashtag..."
            value={hashtagInput}
            onChange={e => setHashtagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
            className="bg-background/50 border-border/50 rounded-xl flex-1"
          />
          <Button variant="outline" size="sm" onClick={addHashtag} className="rounded-xl flex-shrink-0">Adicionar</Button>
        </div>
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {hashtags.map(tag => (
              <span
                key={tag}
                onClick={() => removeHashtag(tag)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-xs rounded-full cursor-pointer hover:bg-primary/20"
              >
                #{tag} <X className="w-3 h-3" />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => handleSave(true)} disabled={isLoading} className="rounded-xl">
          Salvar Rascunho
        </Button>
        <Button onClick={() => handleSave(false)} disabled={isLoading || !title.trim()} className="bg-primary hover:bg-primary/90 rounded-xl gap-2">
          <Save className="w-4 h-4" /> Publicar
        </Button>
      </div>
    </div>
  );
}

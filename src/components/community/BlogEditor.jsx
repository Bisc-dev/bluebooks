import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Save, Image, Hash, Bold, Italic, List, AlignLeft, Minus, ImagePlus, Loader2 } from 'lucide-react';
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const editorRef = useRef(null);
  const coverInputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const [editorInitialized, setEditorInitialized] = useState(false);

  const initEditor = (el) => {
    if (el && !editorInitialized) {
      editorRef.current = el;
      if (post?.content) el.innerHTML = post.content;
      setEditorInitialized(true);
    }
  };

  // Called on editor blur — this is the reliable moment to capture cursor on mobile
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreOrFallbackToEnd = () => {
    const sel = window.getSelection();
    if (!sel || !editorRef.current) return;
    sel.removeAllRanges();
    if (savedRangeRef.current) {
      try {
        sel.addRange(savedRangeRef.current);
        return;
      } catch {
        // range may be detached after DOM mutations — fall through to end
      }
    }
    // Fallback: place cursor at end of editor
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    sel.addRange(range);
  };

  const exec = (cmd, value = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const insertDivider = () => {
    exec('insertHTML', '<hr style="border:none;border-top:1px solid #444;margin:16px 0;"><br>');
  };

  const insertImageAtCursor = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploadingImage(true);

    const placeholderId = `imgload-${Date.now()}`;
    editorRef.current?.focus();
    restoreOrFallbackToEnd();
    exec(
      'insertHTML',
      `<div id="${placeholderId}" contenteditable="false" style="background:rgba(100,100,255,0.08);border:2px dashed rgba(100,100,255,0.3);border-radius:12px;padding:20px 16px;text-align:center;margin:10px 0;color:rgba(150,150,255,0.8);font-size:13px;user-select:none;">📤 Enviando imagem...</div><br>`
    );
    // Clear saved range so a subsequent insert doesn't re-use the now-stale position
    savedRangeRef.current = null;

    try {
      const url = await uploadFile(file);
      const placeholder = editorRef.current?.querySelector(`#${placeholderId}`);
      if (placeholder) {
        placeholder.outerHTML = `<img src="${url}" style="max-width:100%;border-radius:12px;margin:10px 0;display:block;" />`;
      }
    } catch {
      const placeholder = editorRef.current?.querySelector(`#${placeholderId}`);
      if (placeholder) placeholder.outerHTML = `<span style="color:#f87171;font-size:12px;">Falha ao enviar imagem.</span>`;
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        // On paste, the selection is still alive in the editor — save it now
        saveSelection();
        const file = item.getAsFile();
        if (file) await insertImageAtCursor(file);
        return;
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    saveSelection();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    for (const file of files) await insertImageAtCursor(file);
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
      <div
        className={`relative rounded-xl border overflow-hidden bg-background/50 transition-all ${isDragging ? 'border-primary border-2' : 'border-border/50'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Upload loading overlay */}
        {uploadingImage && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/75 backdrop-blur-sm rounded-xl">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">Inserindo imagem...</p>
            <p className="text-xs text-muted-foreground">Aguarde um momento</p>
          </div>
        )}

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
          {/* Image button — selection is saved via onBlur on the editor before this fires */}
          <label
            title="Inserir imagem no texto"
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer
              ${uploadingImage
                ? 'opacity-50 pointer-events-none text-muted-foreground'
                : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
          >
            <ImagePlus className="w-4 h-4" />
            Inserir imagem
            <input
              type="file"
              accept="image/*,image/gif"
              className="hidden"
              onChange={e => { insertImageAtCursor(e.target.files?.[0]); e.target.value = ''; }}
            />
          </label>
        </div>

        {/* Drop overlay */}
        {isDragging && (
          <div className="flex items-center justify-center gap-2 py-6 bg-primary/5 text-primary text-sm font-medium border-b border-primary/20">
            <ImagePlus className="w-5 h-5" />
            Solte a imagem aqui para inserir no texto
          </div>
        )}

        {/* Contenteditable area — onBlur saves cursor so toolbar buttons can restore it */}
        <div
          ref={initEditor}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Escreva seu blog aqui... Cole imagens com Ctrl+V ou arraste para inserir no meio do texto!"
          className="min-h-[260px] p-4 text-sm leading-relaxed outline-none focus:outline-none prose prose-sm dark:prose-invert max-w-none blog-editor-content"
          style={{ wordBreak: 'break-word' }}
          onBlur={saveSelection}
          onKeyDown={e => {
            if (e.key === 'Tab') { e.preventDefault(); exec('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;'); }
          }}
          onPaste={handlePaste}
        />

        {/* Bottom hint */}
        <div className="px-4 pb-3 pt-1 flex items-center gap-1.5 text-xs text-muted-foreground/40">
          <ImagePlus className="w-3 h-3" />
          Cole imagens (Ctrl+V) ou arraste e solte para inserir no texto
        </div>
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

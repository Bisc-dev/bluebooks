import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Check, X, BookOpen, Eye, Camera, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import BookCard from '@/components/library/BookCard';
import ReputationBar from '@/components/profile/ReputationBar';
import ProfileTags from '@/components/profile/ProfileTags';
import ProfileViewsPanel from '@/components/profile/ProfileViewsPanel';
import ImageUploader from '@/components/profile/ImageUploader';

async function uploadFile(file) {
  const ext = file.name.split('.').pop();
  const path = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from('uploads').upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(data.path);
  return publicUrl;
}

export default function Profile() {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [showViews, setShowViews] = useState(false);

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['me', authUser?.email],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*').eq('email', authUser.email).single();
      return data;
    },
    enabled: !!authUser?.email,
  });

  const { data: books = [] } = useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: profileViews = [] } = useQuery({
    queryKey: ['profile-views', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_views')
        .select('*')
        .eq('profile_owner_email', user.email)
        .order('created_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from('users').update(data).eq('email', authUser.email);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', authUser?.email] });
      setEditing(false);
    },
  });

  const handleEdit = () => {
    setForm({
      username: user?.username || '',
      bio: user?.bio || '',
      avatar_url: user?.avatar_url || '',
      banner_url: user?.banner_url || '',
    });
    setEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const handleCancel = () => {
    setEditing(false);
    setForm({});
  };

  const handleAvatarUpload = async (file) => {
    const url = await uploadFile(file);
    if (editing) {
      setForm(f => ({ ...f, avatar_url: url }));
    } else {
      updateMutation.mutate({ avatar_url: url });
    }
  };

  const handleBannerUpload = async (file) => {
    const url = await uploadFile(file);
    if (editing) {
      setForm(f => ({ ...f, banner_url: url }));
    } else {
      updateMutation.mutate({ banner_url: url });
    }
  };

  if (loadingUser || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-40 bg-muted rounded-2xl mb-4" />
          <div className="flex gap-4">
            <div className="w-24 h-24 bg-muted rounded-full" />
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-6 w-48 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayAvatar = editing ? form.avatar_url : user.avatar_url;
  const displayBanner = editing ? form.banner_url : user.banner_url;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Banner + Avatar */}
      <div className="relative">
        {/* Banner */}
        <div className="relative h-40 md:h-56 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/30 via-primary/10 to-accent group">
          {displayBanner && (
            <img src={displayBanner} alt="banner" className="w-full h-full object-cover" />
          )}
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <div className="flex flex-col items-center gap-1 text-white">
              <Camera className="w-6 h-6" />
              <span className="text-xs font-medium">Alterar banner</span>
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleBannerUpload(f); e.target.value = ''; }}
            />
          </label>
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-12 left-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-4 border-background overflow-hidden bg-primary/20 shadow-xl">
              {displayAvatar ? (
                <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-primary text-3xl">
                  {(user.username || user.full_name || user.email || '?')[0].toUpperCase()}
                </div>
              )}
            </div>
            <label className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-5 h-5 text-white" />
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ''; }}
              />
            </label>
          </div>
        </div>

        {/* Edit button */}
        <div className="absolute bottom-3 right-3 flex gap-2">
          {editing ? (
            <>
              <Button size="sm" variant="outline" onClick={handleCancel} className="gap-1 rounded-xl bg-background/80 backdrop-blur-sm">
                <X className="w-3.5 h-3.5" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="gap-1 rounded-xl shadow-lg shadow-primary/25">
                <Check className="w-3.5 h-3.5" /> Salvar
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={handleEdit} className="gap-1 rounded-xl bg-background/80 backdrop-blur-sm">
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </Button>
          )}
        </div>
      </div>

      {/* Admin button */}
      {user.role === 'admin' && (
        <div className="flex justify-end -mt-5">
          <Link to="/admin">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl border-primary/40 text-primary hover:bg-primary/10">
              <Shield className="w-4 h-4" />
              Painel Admin
            </Button>
          </Link>
        </div>
      )}

      {/* Profile info */}
      <div className={`${user.role === 'admin' ? 'pt-4' : 'pt-14'} space-y-5`}>
        <div className="space-y-3">
          {editing ? (
            <div className="space-y-3 max-w-md">
              <Input
                placeholder="Nome de usuário"
                value={form.username || ''}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="bg-card/80 border-border/50 rounded-xl"
              />
              <Textarea
                placeholder="Bio"
                value={form.bio || ''}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                className="bg-card/80 border-border/50 rounded-xl resize-none"
                rows={3}
              />
            </div>
          ) : (
            <>
              <div>
                <h1 className="font-heading text-2xl md:text-3xl font-bold">
                  {user.username || user.full_name || 'Usuário'}
                </h1>
                {user.full_name && user.username && (
                  <p className="text-sm text-muted-foreground">{user.full_name}</p>
                )}
              </div>
              {user.bio && (
                <p className="text-muted-foreground text-sm max-w-lg leading-relaxed">{user.bio}</p>
              )}
              <ProfileTags tags={user.profile_tags || []} />
            </>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            <span>{books.length} livros na biblioteca</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowViews(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>{profileViews.length} visualizações do perfil</span>
          </motion.button>
        </div>

        {/* Reputation */}
        <ReputationBar xp={user.xp || user.reputation || 0} />
      </div>

      {/* Books section */}
      {books.length > 0 && (
        <section>
          <h2 className="font-heading text-xl font-bold mb-5">Livraria</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {books.slice(0, 16).map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {/* Profile views panel */}
      <AnimatePresence>
        {showViews && (
          <ProfileViewsPanel userEmail={user.email} onClose={() => setShowViews(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

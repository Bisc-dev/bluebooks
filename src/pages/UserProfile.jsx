import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Heart, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProfileTags from '@/components/profile/ProfileTags';

function SkeletonProfile() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-32 rounded-2xl bg-muted/60" />
      <div className="flex items-end gap-4 px-4 -mt-10">
        <div className="w-16 h-16 rounded-full bg-muted" />
        <div className="flex-1 space-y-2 pb-2">
          <div className="h-4 w-32 bg-muted rounded-full" />
          <div className="h-3 w-24 bg-muted/60 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function ProfileModal({ onClose, children }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="w-full max-w-md bg-card rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function UserProfile({ userEmail, onClose, onStartChat }) {
  const { user: authUser } = useAuth();

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['me', authUser?.email],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*').eq('email', authUser.email).single();
      return data;
    },
    enabled: !!authUser?.email,
  });

  const profileUser = allUsers.find(u => u.email === userEmail);

  const displayUser = profileUser || {
    email: userEmail,
    full_name: userEmail?.split('@')[0] || 'Usuário',
  };

  const { data: posts = [] } = useQuery({
    queryKey: ['user-posts', userEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('is_draft', false)
        .eq('created_by', userEmail)
        .order('created_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!userEmail,
  });

  useEffect(() => {
    if (!userEmail || !currentUser?.email || currentUser.email === userEmail) return;

    supabase
      .from('profile_views')
      .select('*')
      .eq('profile_owner_email', userEmail)
      .eq('viewer_email', currentUser.email)
      .order('created_date', { ascending: false })
      .limit(1)
      .then(({ data: recent }) => {
        if (recent?.length > 0) {
          const last = new Date(recent[0].created_date);
          if (Date.now() - last.getTime() < 10 * 60 * 1000) return;
        }

        const now = new Date().toISOString();
        supabase.from('profile_views').insert({
          profile_owner_email: userEmail,
          viewer_email: currentUser.email,
          viewer_name: currentUser.username || currentUser.full_name || '',
          viewer_avatar: currentUser.avatar_url || '',
          viewer_username: currentUser.username || '',
          created_date: now,
        });

        supabase.from('notifications').insert({
          recipient_email: userEmail,
          sender_email: currentUser.email,
          sender_name: currentUser.username || currentUser.full_name || 'Alguém',
          sender_avatar: currentUser.avatar_url || '',
          type: 'profile_view',
          message: `${currentUser.username || currentUser.full_name || 'Alguém'} visitou seu perfil`,
          link: '/perfil',
          created_date: now,
        });
      });
  }, [userEmail, currentUser?.email]);

  if (loadingUsers) {
    return (
      <ProfileModal onClose={onClose}>
        <div className="p-6"><SkeletonProfile /></div>
      </ProfileModal>
    );
  }

  const isOwnProfile = currentUser?.email === userEmail;

  return (
    <ProfileModal onClose={onClose}>
      {/* Banner */}
      <div className="relative flex-shrink-0">
        <div className="h-28 overflow-hidden">
          {displayUser.banner_url
            ? <img src={displayUser.banner_url} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
          }
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Avatar */}
        <div className="absolute -bottom-8 left-5">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/20 shadow-lg" style={{ border: '3px solid hsl(var(--card))' }}>
            {displayUser.avatar_url
              ? <img src={displayUser.avatar_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary">
                  {(displayUser.username || displayUser.full_name || 'U')[0].toUpperCase()}
                </div>
            }
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pt-12 px-5 pb-5 space-y-4">
        <div>
          <h2 className="font-heading text-xl font-bold">
            {displayUser.username || displayUser.full_name || userEmail?.split('@')[0]}
          </h2>
          {displayUser.username && displayUser.full_name && displayUser.username !== displayUser.full_name && (
            <p className="text-sm text-muted-foreground">{displayUser.full_name}</p>
          )}
          <ProfileTags tags={displayUser.profile_tags || displayUser.tags || []} />
          {displayUser.bio && <p className="text-sm text-muted-foreground mt-2">{displayUser.bio}</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <BookOpen className="w-3.5 h-3.5" />, label: 'Posts', value: posts.length },
            { icon: <Heart className="w-3.5 h-3.5" />, label: 'Livros lidos', value: displayUser.books_read || 0 },
            { icon: <Eye className="w-3.5 h-3.5" />, label: 'Visualizações', value: displayUser.view_count || displayUser.profile_visits || 0 },
          ].map(s => (
            <div key={s.label} className="bg-muted/40 rounded-xl p-3 text-center">
              <div className="flex justify-center text-primary mb-1">{s.icon}</div>
              <p className="text-base font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent posts */}
        {posts.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-heading text-sm font-bold text-muted-foreground uppercase tracking-wide">Posts recentes</h3>
            {posts.slice(0, 3).map(post => (
              <Link
                key={post.id}
                to={`/comunidade/${post.id}`}
                onClick={onClose}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/40 transition-colors"
              >
                {post.cover_url && (
                  <img src={post.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{post.title}</p>
                  <p className="text-xs text-muted-foreground">{post.likes || 0} curtidas</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {isOwnProfile ? (
          <Link to="/perfil" onClick={onClose}>
            <div className="w-full text-center py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
              Ver meu perfil completo
            </div>
          </Link>
        ) : onStartChat && (
          <button
            onClick={() => { onStartChat(userEmail); onClose(); }}
            className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Iniciar Conversa
          </button>
        )}
      </div>
    </ProfileModal>
  );
}

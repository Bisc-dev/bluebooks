import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, FileText, Users, UserPlus, UserCheck, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BookCard from '@/components/library/BookCard';
import ReputationBar from '@/components/profile/ReputationBar';
import ProfileTags from '@/components/profile/ProfileTags';
import BlogPostCard from '@/components/community/BlogPostCard';
import UserProfile from '@/pages/UserProfile';

export default function MemberProfile() {
  const { email: encodedEmail } = useParams();
  const memberEmail = decodeURIComponent(encodedEmail);
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [viewingUser, setViewingUser] = useState(null);

  const isOwnProfile = authUser?.email === memberEmail;

  const { data: member, isLoading } = useQuery({
    queryKey: ['member', memberEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', memberEmail)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!memberEmail,
  });

  const { data: currentUser } = useQuery({
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

  const { data: memberPosts = [] } = useQuery({
    queryKey: ['user-posts', memberEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('created_by', memberEmail)
        .eq('is_draft', false)
        .order('created_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!memberEmail,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['followers', memberEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follows')
        .select('follower_email')
        .eq('following_email', memberEmail);
      if (error) throw error;
      if (!data?.length) return [];
      const emails = data.map(f => f.follower_email);
      const { data: users } = await supabase
        .from('users')
        .select('email, username, full_name, avatar_url')
        .in('email', emails);
      return users || [];
    },
    enabled: !!memberEmail,
  });

  const { data: following = [] } = useQuery({
    queryKey: ['following', memberEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follows')
        .select('following_email')
        .eq('follower_email', memberEmail);
      if (error) throw error;
      if (!data?.length) return [];
      const emails = data.map(f => f.following_email);
      const { data: users } = await supabase
        .from('users')
        .select('email, username, full_name, avatar_url')
        .in('email', emails);
      return users || [];
    },
    enabled: !!memberEmail,
  });

  const { data: followStatus } = useQuery({
    queryKey: ['follow-status', authUser?.email, memberEmail],
    queryFn: async () => {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_email', authUser.email)
        .eq('following_email', memberEmail)
        .maybeSingle();
      return data;
    },
    enabled: !!authUser?.email && !!memberEmail && authUser.email !== memberEmail,
  });

  const isFollowing = !!followStatus;

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_email', authUser.email)
          .eq('following_email', memberEmail);
        if (error) throw error;
      } else {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from('follows')
          .insert({ follower_email: authUser.email, following_email: memberEmail, created_date: now });
        if (error) throw error;
        await supabase.from('notifications').insert({
          recipient_email: memberEmail,
          sender_email: authUser.email,
          sender_name: currentUser?.username || currentUser?.full_name || 'Alguém',
          sender_avatar: currentUser?.avatar_url || '',
          type: 'follow',
          message: `${currentUser?.username || currentUser?.full_name || 'Alguém'} começou a te seguir`,
          link: `/membro/${encodeURIComponent(authUser.email)}`,
          created_date: now,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-status', authUser?.email, memberEmail] });
      queryClient.invalidateQueries({ queryKey: ['followers', memberEmail] });
      queryClient.invalidateQueries({ queryKey: ['following', authUser?.email] });
    },
  });

  if (isLoading || !member) {
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

  const likedBooks = books.filter(b => (b.liked_by || []).includes(memberEmail));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      {/* Banner + Avatar */}
      <div className="relative">
        <div className="h-40 md:h-56 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/30 via-primary/10 to-accent">
          {member.banner_url && (
            <img src={member.banner_url} alt="banner" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="absolute -bottom-12 left-6">
          <div className="w-24 h-24 rounded-full border-4 border-background overflow-hidden bg-primary/20 shadow-xl">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-primary text-3xl">
                {(member.username || member.full_name || member.email || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {!isOwnProfile && (
          <div className="absolute bottom-3 right-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              className={`gap-1.5 rounded-xl ${isFollowing ? 'bg-background/80 backdrop-blur-sm' : 'bg-primary text-white border-primary hover:bg-primary/90'}`}
            >
              {isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              {isFollowing ? 'Seguindo' : 'Seguir'}
            </Button>
            <Link to="/chats">
              <Button size="sm" variant="outline" className="gap-1.5 rounded-xl bg-background/80 backdrop-blur-sm">
                <MessageCircle className="w-3.5 h-3.5" /> Mensagem
              </Button>
            </Link>
          </div>
        )}

        {isOwnProfile && (
          <div className="absolute bottom-3 right-3">
            <Link to="/perfil">
              <Button size="sm" variant="outline" className="gap-1.5 rounded-xl bg-background/80 backdrop-blur-sm">
                Editar perfil
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Profile info */}
      <div className="pt-14 space-y-5">
        <div className="space-y-2">
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            {member.username || member.full_name || 'Usuário'}
          </h1>
          {member.username && member.full_name && member.username !== member.full_name && (
            <p className="text-muted-foreground text-sm">{member.full_name}</p>
          )}
          {member.bio && (
            <p className="text-muted-foreground text-sm max-w-lg leading-relaxed">{member.bio}</p>
          )}
          <ProfileTags tags={member.profile_tags || []} />
        </div>

        {/* Stats */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            <span>{likedBooks.length} livros curtidos</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>{memberPosts.length} postagens</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{followers.length} seguidores</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{following.length} seguindo</span>
          </div>
        </div>

        <ReputationBar xp={member.xp || member.reputation || 0} />
      </div>

      {/* Liked books */}
      {likedBooks.length > 0 && (
        <section>
          <h2 className="font-heading text-xl font-bold mb-5">Livros curtidos</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {likedBooks.slice(0, 16).map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {/* Posts */}
      {memberPosts.length > 0 && (
        <section>
          <h2 className="font-heading text-xl font-bold mb-5">Postagens</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memberPosts.map(post => (
              <BlogPostCard key={post.id} post={post} canEdit={false} onEdit={() => {}} onDelete={() => {}} user={currentUser} />
            ))}
          </div>
        </section>
      )}

      {/* Followers */}
      {followers.length > 0 && (
        <section>
          <h2 className="font-heading text-xl font-bold mb-4">Seguidores ({followers.length})</h2>
          <div className="flex flex-wrap gap-2">
            {followers.map(u => (
              <button
                key={u.email}
                onClick={() => setViewingUser(u.email)}
                className="flex items-center gap-2 bg-card/60 border border-border/30 rounded-xl px-3 py-2 hover:bg-accent/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex-shrink-0">
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">{(u.username || u.full_name || 'U')[0].toUpperCase()}</div>
                  }
                </div>
                <span className="text-sm font-medium">{u.username || u.full_name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Following */}
      {following.length > 0 && (
        <section>
          <h2 className="font-heading text-xl font-bold mb-4">Seguindo ({following.length})</h2>
          <div className="flex flex-wrap gap-2">
            {following.map(u => (
              <button
                key={u.email}
                onClick={() => setViewingUser(u.email)}
                className="flex items-center gap-2 bg-card/60 border border-border/30 rounded-xl px-3 py-2 hover:bg-accent/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex-shrink-0">
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">{(u.username || u.full_name || 'U')[0].toUpperCase()}</div>
                  }
                </div>
                <span className="text-sm font-medium">{u.username || u.full_name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>
        {viewingUser && <UserProfile userEmail={viewingUser} onClose={() => setViewingUser(null)} onStartChat={undefined} />}
      </AnimatePresence>
    </div>
  );
}

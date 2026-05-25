import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { timeAgo } from '@/lib/timeUtils';
import UserProfile from '@/pages/UserProfile';

export default function BlogPostCard({ post, canEdit, onEdit, onDelete, user }) {
  const [viewingUser, setViewingUser] = useState(null);
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: async () => {
      const likedBy = post.liked_by || [];
      const isLiked = likedBy.includes(user?.email);
      const newLikedBy = isLiked
        ? likedBy.filter(e => e !== user?.email)
        : [...likedBy, user?.email];
      const { error } = await supabase
        .from('blog_posts')
        .update({ liked_by: newLikedBy, likes: newLikedBy.length })
        .eq('id', post.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog-posts'] }),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const postAuthor = allUsers.find(u => u.id === post.created_by_id || u.email === post.created_by);
  const authorAvatar = postAuthor?.avatar_url || post.author_avatar || '';
  const authorName = postAuthor?.username || postAuthor?.full_name || post.author_name || 'Anônimo';

  const isLiked = (post.liked_by || []).includes(user?.email);
  const preview = post.content?.replace(/<[^>]*>/g, '').slice(0, 150);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
      >
        {post.cover_url && (
          <Link to={`/comunidade/${post.id}`}>
            <img src={post.cover_url} alt="" className="w-full h-48 object-cover hover:scale-[1.02] transition-transform duration-500" />
          </Link>
        )}

        <div className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={() => postAuthor?.email && setViewingUser(postAuthor.email)} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-primary/20 overflow-hidden flex-shrink-0 ring-1 ring-border/30">
                {authorAvatar
                  ? <img src={authorAvatar} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">{authorName[0]}</div>
                }
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate hover:text-primary transition-colors">{authorName}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(post.created_date)}</p>
              </div>
            </button>
            {canEdit && (
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <Link to={`/comunidade/${post.id}`}>
            <h3 className="font-heading text-lg font-bold hover:text-primary transition-colors cursor-pointer">{post.title}</h3>
          </Link>

          {preview && <p className="text-sm text-muted-foreground line-clamp-2">{preview}...</p>}

          {post.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.hashtags.map(tag => (
                <span key={tag} className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">#{tag}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 pt-2 border-t border-border/30">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => likeMutation.mutate()}
              className={`flex items-center gap-1.5 text-sm transition-colors ${isLiked ? 'text-pink-500' : 'text-muted-foreground hover:text-pink-500'}`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-pink-500' : ''}`} />
              {post.likes || 0}
            </motion.button>
            <Link to={`/comunidade/${post.id}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="w-4 h-4" />
              Comentar
            </Link>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {viewingUser && <UserProfile userEmail={viewingUser} onClose={() => setViewingUser(null)} />}
      </AnimatePresence>
    </>
  );
}

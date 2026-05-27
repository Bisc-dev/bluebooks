import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, Send, Trash2, Pencil, Check, X, CornerDownRight, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { timeAgo } from '@/lib/timeUtils';
import UserProfile from './UserProfile';

function CommentItem({
  comment, isReply,
  editingCommentId, editingCommentText, setEditingCommentId, setEditingCommentText,
  replyingTo, setReplyingTo,
  currentUser, allUsers,
  onDelete, onUpdate, onViewUser,
}) {
  const u = allUsers.find(u => u.email === comment.created_by);
  const author = {
    name: u?.username || u?.full_name || comment.author_name || 'Anônimo',
    avatar: u?.avatar_url || comment.author_avatar || '',
    email: u?.email || comment.created_by || '',
  };

  const canEdit = currentUser?.email === comment.created_by;
  const isEditing = editingCommentId === comment.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border border-border/30 rounded-xl p-4 ${isReply ? 'bg-card/40' : 'bg-card/60'}`}
    >
      <div className="flex items-start gap-3">
        <button onClick={() => onViewUser(author.email)} className="flex-shrink-0">
          <div className="w-7 h-7 rounded-full bg-primary/20 overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all">
            {author.avatar
              ? <img src={author.avatar} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-primary">{author.name[0]}</div>
            }
          </div>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => onViewUser(author.email)} className="text-sm font-medium hover:text-primary transition-colors">{author.name}</button>
              <span className="text-xs text-muted-foreground">{timeAgo(comment.created_date)}</span>
              {comment.edited && <span className="text-[10px] text-muted-foreground/60 italic">editado</span>}
            </div>
            {canEdit && !isEditing && (
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.content); }}
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => confirm('Excluir este comentário?') && onDelete(comment.id)}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="flex gap-2 mt-2">
              <Input
                value={editingCommentText}
                onChange={e => setEditingCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setEditingCommentId(null)}
                className="rounded-lg text-sm flex-1"
                autoFocus
              />
              <button onClick={() => onUpdate({ id: comment.id, content: editingCommentText })} className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditingCommentId(null)} className="p-1.5 rounded-lg bg-muted hover:bg-muted/80">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
          )}

          {!isReply && !isEditing && (
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <CornerDownRight className="w-3 h-3" />
              {replyingTo === comment.id ? 'Cancelar' : 'Responder'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function BlogDetail() {
  const postId = window.location.pathname.split('/').pop();
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [viewingUser, setViewingUser] = useState(null);
  const [showNotifyConfirm, setShowNotifyConfirm] = useState(false);
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ['me', authUser?.email],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*').eq('email', authUser.email).single();
      return data;
    },
    enabled: !!authUser?.email,
  });

  const { data: post } = useQuery({
    queryKey: ['blog-post', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });

  const { data: allUsers = [] } = useQuery({
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
    staleTime: 60_000,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_date', { ascending: true })
        .limit(300);
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });

  const topLevelComments = comments.filter(c => !c.parent_id);
  const getReplies = (commentId) => comments.filter(c => c.parent_id === commentId);

  const postAuthor = allUsers.find(u => u.email === post?.created_by);
  const authorAvatar = postAuthor?.avatar_url || post?.author_avatar || '';
  const authorName = postAuthor?.username || postAuthor?.full_name || post?.author_name || 'Anônimo';

  const addComment = useMutation({
    mutationFn: async (content) => {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        content,
        author_name: user?.username || user?.full_name || 'Anônimo',
        author_avatar: user?.avatar_url || '',
        created_by: user?.email,
        created_date: new Date().toISOString(),
      });
      if (error) throw error;

      if (post?.created_by && post.created_by !== user?.email) {
        await supabase.from('notifications').insert({
          recipient_email: post.created_by,
          sender_email: user?.email,
          sender_name: user?.username || user?.full_name || 'Alguém',
          sender_avatar: user?.avatar_url || '',
          type: 'comment',
          message: `${user?.username || user?.full_name || 'Alguém'} comentou no seu blog "${post.title}"`,
          link: `/comunidade/${postId}`,
          ref_id: postId,
          created_date: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['comment-count', postId] });
      setCommentText('');
    },
  });

  const addReply = useMutation({
    mutationFn: async ({ content, parentId }) => {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        parent_id: parentId,
        content,
        author_name: user?.username || user?.full_name || 'Anônimo',
        author_avatar: user?.avatar_url || '',
        created_by: user?.email,
        created_date: new Date().toISOString(),
      });
      if (error) throw error;

      const parentComment = comments.find(c => c.id === parentId);
      if (parentComment?.created_by && parentComment.created_by !== user?.email) {
        await supabase.from('notifications').insert({
          recipient_email: parentComment.created_by,
          sender_email: user?.email,
          sender_name: user?.username || user?.full_name || 'Alguém',
          sender_avatar: user?.avatar_url || '',
          type: 'reply',
          message: `${user?.username || user?.full_name || 'Alguém'} respondeu ao seu comentário`,
          link: `/comunidade/${postId}`,
          ref_id: postId,
          created_date: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['comment-count', postId] });
      setReplyingTo(null);
      setReplyText('');
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['comment-count', postId] });
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, content }) => {
      const { error } = await supabase.from('comments').update({ content, edited: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      setEditingCommentId(null);
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!post) return;
      const likedBy = post.liked_by || [];
      const isLiked = likedBy.includes(user?.email);
      const newLikedBy = isLiked ? likedBy.filter(e => e !== user?.email) : [...likedBy, user?.email];

      const { error } = await supabase
        .from('blog_posts')
        .update({ liked_by: newLikedBy, likes: newLikedBy.length })
        .eq('id', post.id);
      if (error) throw error;

      const alreadyRewarded = (post.xp_rewarded_likes || []).includes(user?.email);
      if (!isLiked && !alreadyRewarded && user?.email) {
        await supabase.rpc('add_xp', { user_email: user.email, amount: 10 });
        await supabase
          .from('blog_posts')
          .update({ xp_rewarded_likes: [...(post.xp_rewarded_likes || []), user.email] })
          .eq('id', post.id);
      }

      if (!isLiked && post.created_by && post.created_by !== user?.email) {
        await supabase.from('notifications').insert({
          recipient_email: post.created_by,
          sender_email: user?.email,
          sender_name: user?.username || user?.full_name || 'Alguém',
          sender_avatar: user?.avatar_url || '',
          type: 'like',
          message: `${user?.username || user?.full_name || 'Alguém'} curtiu seu blog "${post.title}"`,
          link: `/comunidade/${postId}`,
          ref_id: postId,
          created_date: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog-post', postId] }),
  });

  const notifyAllMutation = useMutation({
    mutationFn: async () => {
      const { data: users, error } = await supabase.from('users').select('email');
      if (error) throw error;
      const now = new Date().toISOString();
      const notifications = users.map(u => ({
        recipient_email: u.email,
        sender_email: authUser.email,
        sender_name: user?.username || user?.full_name || 'Admin',
        sender_avatar: user?.avatar_url || '',
        type: 'admin_broadcast',
        message: `Nova postagem disponível: "${post.title}"`,
        link: `/comunidade/${postId}`,
        ref_id: postId,
        created_date: now,
      }));
      const { error: notifError } = await supabase.from('notifications').insert(notifications);
      if (notifError) throw notifError;
    },
    onSuccess: () => {
      setShowNotifyConfirm(false);
      toast({ title: 'Notificação enviada para todos os usuários!' });
    },
    onError: () => toast({ title: 'Erro ao enviar notificação', variant: 'destructive' }),
  });

  const commentItemProps = {
    editingCommentId, editingCommentText, setEditingCommentId, setEditingCommentText,
    replyingTo, setReplyingTo,
    currentUser: user, allUsers,
    onDelete: (id) => deleteComment.mutate(id),
    onUpdate: (args) => updateComment.mutate(args),
    onViewUser: setViewingUser,
  };

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded-lg" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  const isLiked = (post.liked_by || []).includes(user?.email);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <Link to="/comunidade" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar à Comunidade
      </Link>

      {post.cover_url && (
        <img src={post.cover_url} alt="" className="w-full h-64 object-cover rounded-2xl" />
      )}

      <div className="space-y-4">
        <h1 className="font-heading text-3xl font-bold">{post.title}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <button onClick={() => postAuthor?.email && setViewingUser(postAuthor.email)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-primary/20 overflow-hidden">
              {authorAvatar
                ? <img src={authorAvatar} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">{authorName[0]}</div>
              }
            </div>
            <span className="font-medium text-foreground/80 hover:text-primary transition-colors">{authorName}</span>
          </button>
          <span>•</span>
          <span>{timeAgo(post.created_date)}</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => likeMutation.mutate()}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isLiked ? 'text-pink-500' : 'text-muted-foreground hover:text-pink-500'}`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-pink-500' : ''}`} />
            {post.likes || 0} curtida{(post.likes || 0) !== 1 ? 's' : ''}
          </motion.button>

          {user?.role === 'admin' && (
            <button
              onClick={() => setShowNotifyConfirm(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <Bell className="w-4 h-4" /> Notificar usuários
            </button>
          )}
        </div>
      </div>

      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      <section className="space-y-5 pt-6 border-t border-border/50">
        <h3 className="font-heading text-lg font-bold">Comentários ({comments.length})</h3>

        {/* New comment input */}
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 overflow-hidden flex-shrink-0">
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">{(user?.full_name || 'U')[0]}</div>
            }
          </div>
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Escreva um comentário..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && commentText.trim() && addComment.mutate(commentText)}
              className="bg-card/80 border-border/50 rounded-xl"
            />
            <Button
              onClick={() => commentText.trim() && addComment.mutate(commentText)}
              disabled={addComment.isPending || !commentText.trim()}
              className="bg-primary hover:bg-primary/90 rounded-xl"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Comments list */}
        <div className="space-y-4">
          {topLevelComments.map(comment => {
            const replies = getReplies(comment.id);
            return (
              <div key={comment.id} className="space-y-2">
                <CommentItem comment={comment} isReply={false} {...commentItemProps} />

                {/* Replies */}
                {replies.length > 0 && (
                  <div className="ml-10 space-y-2">
                    {replies.map(reply => (
                      <CommentItem key={reply.id} comment={reply} isReply={true} {...commentItemProps} />
                    ))}
                  </div>
                )}

                {/* Reply input */}
                {replyingTo === comment.id && (
                  <div className="ml-10 flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/20 overflow-hidden flex-shrink-0 mt-1">
                      {user?.avatar_url
                        ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-primary">{(user?.full_name || 'U')[0]}</div>
                      }
                    </div>
                    <Input
                      placeholder="Escreva uma resposta..."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && replyText.trim()) addReply.mutate({ content: replyText, parentId: comment.id });
                        if (e.key === 'Escape') { setReplyingTo(null); setReplyText(''); }
                      }}
                      className="bg-card/80 border-border/50 rounded-xl text-sm flex-1"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => replyText.trim() && addReply.mutate({ content: replyText, parentId: comment.id })}
                      disabled={addReply.isPending || !replyText.trim()}
                      className="bg-primary hover:bg-primary/90 rounded-xl"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setReplyingTo(null); setReplyText(''); }} className="rounded-xl">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <AnimatePresence>
        {viewingUser && <UserProfile userEmail={viewingUser} onClose={() => setViewingUser(null)} />}
      </AnimatePresence>

      <Dialog open={showNotifyConfirm} onOpenChange={setShowNotifyConfirm}>
        <DialogContent className="rounded-2xl border-white/10 bg-card/95 backdrop-blur-xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" /> Disparar Notificação
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isso vai enviar uma notificação para <strong className="text-foreground">todos os usuários</strong> sobre a postagem <strong className="text-foreground">"{post?.title}"</strong>. Deseja continuar?
          </p>
          <div className="flex gap-3 justify-end mt-1">
            <Button variant="outline" onClick={() => setShowNotifyConfirm(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={() => notifyAllMutation.mutate()} disabled={notifyAllMutation.isPending} className="bg-primary rounded-xl gap-2">
              <Bell className="w-4 h-4" />
              {notifyAllMutation.isPending ? 'Enviando...' : 'Disparar agora'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

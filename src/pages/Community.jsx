import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BlogEditor from '@/components/community/BlogEditor.jsx';
import BlogPostCard from '@/components/community/BlogPostCard';

export default function Community() {
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  const { data: user } = useQuery({
    queryKey: ['me', authUser?.email],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*').eq('email', authUser.email).single();
      return data;
    },
    enabled: !!authUser?.email,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('is_draft', false)
        .order('created_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from('blog_posts').insert({
        ...data,
        author_name: user?.username || user?.full_name || 'Anônimo',
        author_avatar: user?.avatar_url || '',
        likes: 0,
        liked_by: [],
        created_by: user?.email,
        created_date: new Date().toISOString(),
      });
      if (error) throw error;
      if (!data.is_draft && user?.email) {
        await supabase.rpc('add_xp', { user_email: user.email, amount: 60 });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      setShowEditor(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from('blog_posts').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      setShowEditor(false);
      setEditingPost(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog-posts'] }),
  });

  const handleSave = (data) => {
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setShowEditor(true);
  };

  const handleDelete = (post) => {
    if (confirm('Tem certeza que deseja excluir este post?')) {
      deleteMutation.mutate(post.id);
    }
  };

  const canEdit = (post) => {
    return user?.email === post.created_by || user?.role === 'admin';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Comunidade</h1>
          <p className="text-sm text-muted-foreground mt-1">Compartilhe suas ideias e descubra novos blogs</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => { setEditingPost(null); setShowEditor(true); }}
            className="bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25 gap-2"
          >
            <Plus className="w-4 h-4" /> Criar Blog
          </Button>
        </motion.div>
      </div>

      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <BlogEditor
              post={editingPost}
              onSave={handleSave}
              onCancel={() => { setShowEditor(false); setEditingPost(null); }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-6">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-muted rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map(post => (
            <BlogPostCard
              key={post.id}
              post={post}
              canEdit={canEdit(post)}
              onEdit={() => handleEdit(post)}
              onDelete={() => handleDelete(post)}
              user={user}
            />
          ))}
        </div>
      )}
    </div>
  );
}

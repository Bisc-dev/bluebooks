import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import { Heart, Eye, ArrowLeft, FileText, BookOpen, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import BookCard from '@/components/library/BookCard';

export default function BookDetail() {
  const bookId = window.location.pathname.split('/').pop();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [showNotifyConfirm, setShowNotifyConfirm] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me', authUser?.email],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*').eq('email', authUser.email).single();
      return data;
    },
    enabled: !!authUser?.email,
  });

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', bookId],
    queryFn: async () => {
      const { data, error } = await supabase.from('books').select('*').eq('id', bookId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookId,
  });

  const { data: allBooks = [] } = useQuery({
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

  // Increment view count on load
  useEffect(() => {
    if (book) {
      supabase.from('books').update({ views: (book.views || 0) + 1 }).eq('id', book.id);
    }
  }, [book?.id]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const likedBy = book.liked_by || [];
      const isLiked = likedBy.includes(authUser?.email);
      const newLikedBy = isLiked
        ? likedBy.filter(e => e !== authUser?.email)
        : [...likedBy, authUser?.email];
      const { error } = await supabase
        .from('books')
        .update({ liked_by: newLikedBy, likes: newLikedBy.length })
        .eq('id', book.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['book', bookId] }),
  });

  const notifyAllMutation = useMutation({
    mutationFn: async () => {
      const { data: users, error } = await supabase
        .from('users')
        .select('email');
      if (error) throw error;
      const now = new Date().toISOString();
      const notifications = users.map(u => ({
        recipient_email: u.email,
        sender_email: authUser.email,
        sender_name: user?.username || user?.full_name || 'Admin',
        sender_avatar: user?.avatar_url || '',
        type: 'admin_broadcast',
        message: `Novo livro disponível: "${book.title}"`,
        link: `/livraria/${bookId}`,
        ref_id: bookId,
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

  if (isLoading || !book) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 bg-muted rounded-lg" />
          <div className="flex gap-8">
            <div className="w-64 aspect-[2/3] bg-muted rounded-2xl" />
            <div className="flex-1 space-y-4">
              <div className="h-10 w-3/4 bg-muted rounded-lg" />
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-2/3 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isLiked = (book.liked_by || []).includes(authUser?.email);
  const suggestions = allBooks.filter(b => b.genre === book.genre && b.id !== book.id).slice(0, 4);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      <Link to="/livraria" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar à Livraria
      </Link>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Cover */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full md:w-72 flex-shrink-0"
        >
          <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-primary/10">
            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
          </div>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 space-y-5"
        >
          <div>
            <span className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-full font-medium">
              {book.genre}
            </span>
            <h1 className="font-heading text-3xl md:text-4xl font-bold mt-3">{book.title}</h1>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> {book.views || 0} visualizações
            </span>
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4" /> {book.likes || 0} curtidas
            </span>
          </div>

          {book.description && (
            <p className="text-muted-foreground leading-relaxed">{book.description}</p>
          )}

          {/* Like button */}
          <div className="flex flex-wrap gap-3 pt-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => likeMutation.mutate()}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
                isLiked
                  ? 'bg-pink-500/10 text-pink-500 border border-pink-500/30'
                  : 'bg-card border border-border/50 text-muted-foreground hover:text-pink-500 hover:border-pink-500/30'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-pink-500' : ''}`} />
              {isLiked ? 'Curtido' : 'Curtir'}
            </motion.button>

            {user?.role === 'admin' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowNotifyConfirm(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-card border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all duration-300"
              >
                <Bell className="w-4 h-4" /> Notificar usuários
              </motion.button>
            )}
          </div>

          {/* Read buttons */}
          <div className="flex flex-wrap gap-3 pt-4">
            {book.pdf_link ? (
              <a href={book.pdf_link} target="_blank" rel="noopener noreferrer">
                <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 rounded-xl gap-2">
                  <FileText className="w-4 h-4" /> Ler em PDF
                </Button>
              </a>
            ) : (
              <Button disabled className="opacity-40 rounded-xl gap-2">
                <FileText className="w-4 h-4" /> Versão PDF indisponível
              </Button>
            )}

            {book.epub_link ? (
              <a href={book.epub_link} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="rounded-xl gap-2 border-primary/30 text-primary hover:bg-primary/10">
                  <BookOpen className="w-4 h-4" /> Ler em EPUB
                </Button>
              </a>
            ) : (
              <Button variant="outline" disabled className="opacity-40 rounded-xl gap-2">
                <BookOpen className="w-4 h-4" /> Versão EPUB indisponível
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <section>
          <h2 className="font-heading text-xl font-bold mb-5">Livros do mesmo gênero</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {suggestions.map(b => (
              <BookCard key={b.id} book={b} compact />
            ))}
          </div>
        </section>
      )}
      <Dialog open={showNotifyConfirm} onOpenChange={setShowNotifyConfirm}>
        <DialogContent className="rounded-2xl border-white/10 bg-card/95 backdrop-blur-xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" /> Disparar Notificação
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isso vai enviar uma notificação para <strong className="text-foreground">todos os usuários</strong> sobre o livro <strong className="text-foreground">"{book?.title}"</strong>. Deseja continuar?
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

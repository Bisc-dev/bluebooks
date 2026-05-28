import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Users, TrendingUp, Heart, Eye, ArrowRight, Sparkles, Download, Share } from 'lucide-react';
import BookCard from '@/components/library/BookCard';

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

export default function Dashboard() {
  const [installPrompt, setInstallPrompt] = useState(
    () => window.__installPrompt || null
  );
  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches
  );
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (isInstalled) return;
    // Pick up the prompt if it arrives after mount
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    // Also pick up one captured before mount
    if (window.__installPrompt) setInstallPrompt(window.__installPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isInstalled]);

  const handleInstall = async () => {
    if (isIOS) { setShowIOSHint(h => !h); return; }
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') { setInstallPrompt(null); setIsInstalled(true); }
  };

  const showInstallButton = !isInstalled && (installPrompt || isIOS);
  const { data: books = [] } = useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('views', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['blog-posts-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('is_draft', false)
        .order('created_date', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const featured = [...books].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3);
  const popular = [...books].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 6);
  const totalViews = books.reduce((sum, b) => sum + (b.views || 0), 0);
  const totalLikes = books.reduce((sum, b) => sum + (b.likes || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-accent p-8 md:p-12 border border-primary/10"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">Bem-vindo(a) à BlueBooks</span>
          </div>
          <h1 className="font-heading text-3xl md:text-5xl font-bold mb-3 pb-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Seu refúgio literário
          </h1>
          <p className="text-muted-foreground max-w-lg text-sm md:text-base">
            Descubra novos mundos, conecte-se com leitores e mergulhe em histórias incríveis.
          </p>
          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <Link to="/livraria">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              >
                Explorar Livraria
              </motion.button>
            </Link>
            {showInstallButton && (
              <div className="flex flex-col gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleInstall}
                  className="flex items-center gap-2 px-6 py-2.5 bg-card border border-primary/30 text-foreground rounded-xl font-medium text-sm hover:bg-card/80 hover:border-primary/60 transition-all"
                >
                  {isIOS ? <Share className="w-4 h-4 text-primary" /> : <Download className="w-4 h-4 text-primary" />}
                  {isIOS ? 'Adicionar à Tela Inicial' : 'Instalar App'}
                </motion.button>
                {showIOSHint && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-muted-foreground bg-card border border-border/50 rounded-xl px-4 py-3 space-y-1 max-w-xs"
                  >
                    <p className="font-medium text-foreground mb-1.5">Como instalar no iPhone/iPad:</p>
                    <p>1. Toque em <strong>Compartilhar</strong> <span className="font-mono">⎙</span> na barra do Safari</p>
                    <p>2. Role e toque em <strong>"Adicionar à Tela Inicial"</strong></p>
                    <p>3. Confirme tocando em <strong>"Adicionar"</strong></p>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: 'Livros', value: books.length, color: 'from-blue-500 to-blue-600' },
          { icon: Eye, label: 'Visualizações', value: totalViews, color: 'from-purple-500 to-purple-600' },
          { icon: Heart, label: 'Curtidas', value: totalLikes, color: 'from-pink-500 to-pink-600' },
          { icon: Users, label: 'Comunidade', value: `${posts.length} posts`, color: 'from-emerald-500 to-emerald-600' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 shadow-lg`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Featured Books */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-heading text-xl font-bold">Livros em Destaque</h2>
            </div>
            <Link to="/livraria" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {featured.map((book, index) => (
              <BookCard key={book.id} book={book} rank={index + 1} showRank />
            ))}
          </div>
        </section>
      )}

      {/* Popular Books */}
      {popular.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              <h2 className="font-heading text-xl font-bold">Populares</h2>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {popular.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

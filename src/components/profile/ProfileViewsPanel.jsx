import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, X, Clock, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return '';
  }
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-muted/60 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-muted/60 rounded-full w-32" />
        <div className="h-2.5 bg-muted/40 rounded-full w-24" />
      </div>
      <div className="h-2.5 bg-muted/40 rounded-full w-16" />
    </div>
  );
}

export default function ProfileViewsPanel({ userEmail, onClose }) {
  const [visibleCount, setVisibleCount] = useState(10);

  const { data: views = [], isLoading } = useQuery({
    queryKey: ['profile-views', userEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_views')
        .select('*')
        .eq('profile_owner_email', userEmail)
        .order('created_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!userEmail,
    refetchInterval: 30_000,
  });

  const displayed = views.slice(0, visibleCount);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="w-full max-w-sm bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-bold text-sm">Visualizações do Perfil</h3>
            {views.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {views.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div>
              {Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : views.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Eye className="w-10 h-10 opacity-20" />
              <p className="text-sm">Nenhuma visualização ainda</p>
              <p className="text-xs opacity-60">Quando alguém visitar seu perfil, aparecerá aqui</p>
            </div>
          ) : (
            <div>
              {displayed.map((view, i) => (
                <motion.div
                  key={view.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors border-b border-border/20 last:border-0"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/20 flex-shrink-0 ring-1 ring-border/30">
                    {view.viewer_avatar ? (
                      <img src={view.viewer_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-primary text-sm">
                        {(view.viewer_name || view.viewer_email || '?')[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {view.viewer_username || view.viewer_name || view.viewer_email}
                    </p>
                    {view.viewer_username && view.viewer_name && (
                      <p className="text-xs text-muted-foreground truncate">{view.viewer_name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{timeAgo(view.created_date)}</span>
                  </div>
                </motion.div>
              ))}

              {visibleCount < views.length && (
                <button
                  onClick={() => setVisibleCount(c => c + 10)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-xs text-primary hover:bg-primary/5 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  Ver mais ({views.length - visibleCount} restantes)
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MessageCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

export default function NewChatModal({ currentUser, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('users')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (!error) setUsers(data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const normalize = (str) =>
    (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const q = normalize(search.trim());
  const filtered = users.filter(u => {
    if (u.email === currentUser?.email) return false;
    if (!q) return true;
    return (
      normalize(u.full_name).includes(q) ||
      normalize(u.username).includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <AnimatePresence>
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
          className="w-full max-w-sm bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <h3 className="font-heading font-bold text-sm">Nova Conversa</h3>
              {!loading && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {filtered.length} usuário{filtered.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-border/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Buscar por nome ou username..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* User list */}
          <div className="overflow-y-auto max-h-80">
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Carregando usuários...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">
                  {search ? `Nenhum resultado para "${search}"` : 'Nenhum usuário encontrado'}
                </p>
              </div>
            ) : (
              filtered.map(u => (
                <motion.button
                  key={u.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { onSelect(u); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-primary/20 flex-shrink-0">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-primary text-sm">
                        {(u.full_name || u.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${u.is_online ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.username || u.full_name || u.email}</p>
                    {u.username && u.full_name && (
                      <p className="text-xs text-muted-foreground truncate">{u.full_name}</p>
                    )}
                    <p className={`text-xs ${u.is_online ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {u.is_online ? '● Online' : '○ Offline'}
                    </p>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

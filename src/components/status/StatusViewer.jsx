import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Eye, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { timeAgo } from '@/lib/timeUtils';

const DURATION = 5000;

export default function StatusViewer({ userEmail, statuses, currentUser, onClose, onAddOwn }) {
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);
  const isMe = userEmail === currentUser?.email;

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const owner = allUsers.find(u => u.email === userEmail);
  const current = statuses[idx];

  // Mark as viewed
  useEffect(() => {
    if (!current || isMe) return;
    const views = current.views || [];
    if (!views.includes(currentUser?.email)) {
      supabase
        .from('statuses')
        .update({ views: [...views, currentUser.email] })
        .eq('id', current.id);
    }
  }, [current?.id, isMe]);

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    setProgress(0);
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / DURATION) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(intervalRef.current);
        next();
      }
    }, 50);
    return () => clearInterval(intervalRef.current);
  }, [idx, paused]);

  const next = () => {
    if (idx < statuses.length - 1) { setIdx(i => i + 1); }
    else onClose();
  };
  const prev = () => { if (idx > 0) setIdx(i => i - 1); };

  const bg = current?.media_url ? 'bg-black' : `bg-gradient-to-br ${current?.bg_gradient || 'from-primary/80 to-violet-700/80'}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className={`relative w-full max-w-sm h-full max-h-[100dvh] md:max-h-[90vh] md:rounded-2xl overflow-hidden ${bg} flex items-center justify-center`}>

          {current?.media_url && (
            <img
              src={current.media_url}
              alt=""
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
            />
          )}

          {current?.text_content && (
            <div className="relative z-10 text-center px-8">
              <p className="text-lg font-bold leading-relaxed drop-shadow-lg" style={{ color: current.text_color || '#fff' }}>
                {current.text_content}
              </p>
            </div>
          )}

          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-3">
            {statuses.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-none rounded-full"
                  style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/40">
                {owner?.avatar_url
                  ? <img src={owner.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-primary flex items-center justify-center text-xs font-bold text-white">{(owner?.full_name || '?')[0]}</div>
                }
              </div>
              <div>
                <p className="text-xs font-bold text-white drop-shadow">{owner?.username || owner?.full_name}</p>
                <p className="text-[10px] text-white/70">{timeAgo(current?.created_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isMe && (
                <div className="flex items-center gap-1 text-white/70 text-[10px]">
                  <Eye className="w-3 h-3" />
                  <span>{(current?.views || []).length}</span>
                </div>
              )}
              <button onClick={onClose} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation zones */}
          <button className="absolute left-0 top-0 w-1/3 h-full z-10" onClick={(e) => { e.stopPropagation(); prev(); }} />
          <button className="absolute right-0 top-0 w-1/3 h-full z-10" onClick={(e) => { e.stopPropagation(); next(); }} />

          {idx > 0 && (
            <ChevronLeft className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 text-white/50 z-20 pointer-events-none" />
          )}
          {idx < statuses.length - 1 && (
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-white/50 z-20 pointer-events-none" />
          )}

          {isMe && (
            <button
              onClick={onAddOwn}
              className="absolute bottom-6 right-4 z-20 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-3 py-2 rounded-full border border-white/30"
            >
              <Plus className="w-3.5 h-3.5" /> Novo status
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, MessageCircle, Users, Search } from 'lucide-react';

export default function FloatingChatButton({ onNewChat, onNewGroup, onSearch }) {
  const [open, setOpen] = useState(false);

  const actions = [
    { icon: MessageCircle, label: 'Nova conversa', color: 'bg-primary', action: onNewChat },
    { icon: Users, label: 'Criar grupo', color: 'bg-violet-500', action: onNewGroup },
    { icon: Search, label: 'Pesquisar', color: 'bg-cyan-500', action: onSearch },
  ];

  return (
    <div className="fixed bottom-24 right-5 md:bottom-8 md:right-8 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && actions.map((a, i) => (
          <motion.div
            key={a.label}
            initial={{ opacity: 0, x: 20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.8 }}
            transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 28 }}
            className="flex items-center gap-2 group"
          >
            <span className="text-xs font-medium bg-black/80 text-white px-2.5 py-1 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {a.label}
            </span>
            <button
              onClick={() => { a.action?.(); setOpen(false); }}
              className={`w-11 h-11 rounded-full ${a.color} text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform`}
            >
              <a.icon className="w-5 h-5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/40 hover:shadow-primary/60 transition-shadow"
        style={{ boxShadow: open ? '0 0 0 4px hsl(var(--primary)/30%)' : undefined }}
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ type: 'spring', stiffness: 350, damping: 25 }}>
          <Plus className="w-6 h-6" />
        </motion.div>
      </motion.button>
    </div>
  );
}

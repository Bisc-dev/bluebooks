import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import UserProfile from '@/pages/UserProfile';

export default function FollowListModal({ open, onClose, title, users }) {
  const [viewingUser, setViewingUser] = useState(null);

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="rounded-2xl border-white/10 bg-card/95 backdrop-blur-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading">{title} ({users.length})</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário ainda.</p>
            ) : (
              users.map(u => (
                <button
                  key={u.email}
                  onClick={() => setViewingUser(u.email)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/20 flex-shrink-0 ring-1 ring-border/30">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary">{(u.username || u.full_name || 'U')[0].toUpperCase()}</div>
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.username || u.full_name}</p>
                    {u.username && u.full_name && u.username !== u.full_name && (
                      <p className="text-xs text-muted-foreground">{u.full_name}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {viewingUser && (
          <UserProfile userEmail={viewingUser} onClose={() => setViewingUser(null)} onStartChat={undefined} />
        )}
      </AnimatePresence>
    </>
  );
}

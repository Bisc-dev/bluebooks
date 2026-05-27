import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Heart, MessageCircle, Eye, User, CheckCheck, Loader2, BellRing, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { timeAgo } from '@/lib/timeUtils';

const typeIcon = {
  like: <Heart className="w-3.5 h-3.5 text-pink-500" />,
  comment: <MessageCircle className="w-3.5 h-3.5 text-primary" />,
  reply: <MessageCircle className="w-3.5 h-3.5 text-blue-400" />,
  message: <MessageCircle className="w-3.5 h-3.5 text-green-500" />,
  profile_view: <Eye className="w-3.5 h-3.5 text-purple-400" />,
  follow: <User className="w-3.5 h-3.5 text-yellow-500" />,
};

export default function NotificationBell({ user }) {
  const [open, setOpen] = useState(false);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.email) return;
    if (Notification.permission === 'default') {
      const dismissed = localStorage.getItem('notif_banner_dismissed');
      if (!dismissed) setShowPermissionBanner(true);
    }
  }, [user?.email]);

  const handleEnableNotifications = async () => {
    const permission = await Notification.requestPermission();
    setShowPermissionBanner(false);
    localStorage.setItem('notif_banner_dismissed', '1');
    if (permission === 'granted') {
      new Notification('BlueBooks', { body: 'Notificações ativadas com sucesso!', icon: '/bluebooks-icon.jpeg' });
    }
  };

  const handleDismissBanner = () => {
    setShowPermissionBanner(false);
    localStorage.setItem('notif_banner_dismissed', '1');
  };

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_email', user.email)
        .order('created_date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
    refetchInterval: 15_000,
  });

  // Request notification permission once
  useEffect(() => {
    if (!user?.email) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user?.email]);

  // Real-time
  useEffect(() => {
    if (!user?.email) return;
    const channel = supabase
      .channel(`notifications-${user.email}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_email=eq.${user.email}`,
      }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['notifications', user.email] });

        if (Notification.permission === 'granted' && payload.new?.message) {
          const notif = payload.new;
          new Notification('BlueBooks', {
            body: notif.message,
            icon: '/bluebooks-icon.jpeg',
            tag: notif.id,
          });
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.email, queryClient]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !n.is_read).length;

  const markRead = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] }),
  });

  const handleClick = (notif) => {
    if (!notif.is_read) markRead.mutate(notif.id);
    if (notif.link) navigate(notif.link);
    setOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {showPermissionBanner && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-[4.5rem] left-3 right-3 md:left-auto md:right-4 md:w-80 z-[200] bg-card border border-primary/30 rounded-2xl shadow-xl p-4 flex gap-3"
          >
            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Ativar notificações?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Receba alertas de curtidas, comentários e seguidores diretamente no seu celular.</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleEnableNotifications}
                  className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  Ativar
                </button>
                <button
                  onClick={handleDismissBanner}
                  className="flex-1 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:bg-accent transition-colors"
                >
                  Agora não
                </button>
              </div>
            </div>
            <button onClick={handleDismissBanner} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    <div className="relative" ref={panelRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
      >
        <motion.div
          animate={unread > 0 ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
          transition={{ duration: 0.5, repeat: unread > 0 ? Infinity : 0, repeatDelay: 4 }}
        >
          <Bell className="w-5 h-5" />
        </motion.div>
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none px-1"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-x-3 top-[4.5rem] md:absolute md:inset-x-auto md:right-0 md:top-12 md:w-80 bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden z-[100]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="font-heading font-bold text-sm">Notificações</span>
                {unread > 0 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{unread} nova{unread !== 1 ? 's' : ''}</span>}
              </div>
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar todas
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs">Carregando...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
                  <Bell className="w-8 h-8 opacity-20" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map((notif, i) => (
                  <motion.button
                    key={notif.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleClick(notif)}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-accent/40 transition-colors text-left border-b border-border/20 last:border-0 ${!notif.is_read ? 'bg-primary/5' : ''}`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-primary/20">
                        {notif.sender_avatar
                          ? <img src={notif.sender_avatar} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">{(notif.sender_name || '?')[0].toUpperCase()}</div>
                        }
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-card flex items-center justify-center">
                        {typeIcon[notif.type]}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${!notif.is_read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{timeAgo(notif.created_date)}</p>
                    </div>

                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}

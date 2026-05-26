import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { BookOpen, MessageCircle, Users, Tv, User, LayoutDashboard, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import ThemeToggle from './ThemeToggle';
import AnimatedBackground from './AnimatedBackground';
import NotificationBell from '@/components/notifications/NotificationBell';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Painel', mobileLabel: 'Painel' },
  { path: '/livraria', icon: BookOpen, label: 'Livraria', mobileLabel: 'Livraria' },
  { path: '/comunidade', icon: Users, label: 'Comunidade', mobileLabel: 'Comunidade' },
  { path: '/chats', icon: MessageCircle, label: 'Chats', mobileLabel: 'Chats' },
  { path: '/assistir', icon: Tv, label: 'CineBlue', mobileLabel: 'CineBlue' },
  { path: '/perfil', icon: User, label: 'Perfil', mobileLabel: 'Perfil' },
];

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  usePushNotifications(user?.email);

  useEffect(() => {
    const email = user?.email;
    if (!email) return;

    const setOnline = (val) =>
      supabase.from('users').update({ is_online: val }).eq('email', email);

    setOnline(true);
    const interval = setInterval(() => setOnline(true), 30_000);

    const handleVisibility = () => {
      if (document.hidden) setOnline(false);
      else setOnline(true);
    };
    const handleUnload = () => setOnline(false);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      setOnline(false);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user?.email]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AnimatedBackground />

      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              BlueBooks
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <NotificationBell user={user} />
            <ThemeToggle />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowLogoutDialog(true)}
              title="Sair"
              className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-16 pb-20 md:pb-4 min-h-screen">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 backdrop-blur-xl bg-background/80">
        <div className="flex items-stretch justify-around py-1 px-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className="flex-1 min-w-0">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-all duration-300 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-[9px] font-medium leading-tight text-center w-full truncate px-0.5">
                    {item.mobileLabel}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-tab"
                      className="absolute -top-0.5 w-8 h-0.5 rounded-full bg-primary"
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sair da conta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja sair? Você precisará fazer login novamente para acessar o BlueBooks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => logout(true)}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

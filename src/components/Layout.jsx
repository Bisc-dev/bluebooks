import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { BookOpen, Users, Tv, User, LayoutDashboard, LogOut, Download, Smartphone, Bell, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
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
  { path: '/assistir', icon: Tv, label: 'CineBlue', mobileLabel: 'CineBlue' },
  { path: '/perfil', icon: User, label: 'Perfil', mobileLabel: 'Perfil' },
];

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(() => window.__installPrompt || null);
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  usePushNotifications(user?.email);

  // Capture prompt if it fires after mount
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); window.__installPrompt = e; };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Show install modal once after login, if app is not installed
  useEffect(() => {
    if (!user?.email || isInstalled) return;
    const shown = localStorage.getItem('install_modal_shown');
    if (shown) return;
    const timer = setTimeout(() => setShowInstallModal(true), 2000);
    return () => clearTimeout(timer);
  }, [user?.email]);

  const handleInstallNow = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        window.__installPrompt = null;
        setShowInstallModal(false);
        localStorage.setItem('install_modal_shown', '1');
      }
      return;
    }
    // No native prompt — show manual instructions
    setShowInstallInstructions(true);
  };

  const handleDismissInstall = () => {
    setShowInstallModal(false);
    setShowInstallInstructions(false);
    localStorage.setItem('install_modal_shown', '1');
  };

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
                    <div className="relative">
                      <item.icon className="w-4 h-4" />
                    </div>
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
                  <div className="relative">
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                  </div>
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
      {/* Install app modal */}
      <AnimatePresence>
        {showInstallModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleDismissInstall}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="w-full max-w-sm bg-card rounded-2xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-6 text-center border-b border-border/30">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
                  <BookOpen className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="font-heading text-xl font-bold">Instale o BlueBooks</h2>
                <p className="text-sm text-muted-foreground mt-1">Tenha a melhor experiência de leitura</p>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { icon: Smartphone, text: 'Acesso rápido direto pela tela inicial' },
                  { icon: Bell, text: 'Notificações de curtidas, comentários e seguidores' },
                  { icon: Zap, text: 'Mais rápido e fluido, sem barra do navegador' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5 flex flex-col gap-2">
                <AnimatePresence mode="wait">
                  {showInstallInstructions ? (
                    <motion.div
                      key="instructions"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm text-muted-foreground overflow-hidden"
                    >
                      {isIOS ? (
                        <>
                          <p className="font-medium text-foreground text-xs uppercase tracking-wide mb-2">Como instalar no iPhone/iPad</p>
                          <p>1. Toque em <strong className="text-foreground">Compartilhar</strong> <span className="font-mono">⎙</span> na barra do Safari</p>
                          <p>2. Role e toque em <strong className="text-foreground">"Adicionar à Tela Inicial"</strong></p>
                          <p>3. Confirme tocando em <strong className="text-foreground">"Adicionar"</strong></p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-foreground text-xs uppercase tracking-wide mb-2">Como instalar no Android</p>
                          <p>1. Toque nos <strong className="text-foreground">três pontos ⋮</strong> no canto superior do Chrome</p>
                          <p>2. Selecione <strong className="text-foreground">"Adicionar à tela inicial"</strong></p>
                          <p>3. Confirme tocando em <strong className="text-foreground">"Adicionar"</strong></p>
                        </>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div key="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Button onClick={handleInstallNow} className="w-full rounded-xl gap-2 bg-primary">
                        <Download className="w-4 h-4" /> Instalar agora
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button variant="ghost" onClick={handleDismissInstall} className="w-full rounded-xl text-muted-foreground">
                  Talvez depois
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Download, ArrowRight, Sparkles, Users, Bell } from 'lucide-react';

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;

export default function Landing() {
  const [installPrompt, setInstallPrompt] = useState(() => window.__installPrompt || null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); window.__installPrompt = e; };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      return;
    }
    setShowInstructions(true);
  };

  const features = [
    { icon: BookOpen, text: 'Acesse centenas de livros gratuitamente' },
    { icon: Users,    text: 'Conecte-se com outros leitores' },
    { icon: Bell,     text: 'Receba notificações de novidades' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden px-6">

      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-2xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm flex flex-col items-center text-center gap-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-2xl shadow-primary/40"
          >
            <BookOpen className="w-12 h-12 text-white" />
          </motion.div>

          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-heading text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
            >
              BlueBooks
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground text-sm mt-1"
            >
              Sua biblioteca virtual
            </motion.p>
          </div>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full space-y-3"
        >
          {features.map(({ icon: Icon, text }, i) => (
            <motion.div
              key={text}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + i * 0.08 }}
              className="flex items-center gap-3 bg-card/60 border border-border/40 backdrop-blur-sm rounded-2xl px-4 py-3"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-left">{text}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="w-full flex flex-col gap-3"
        >
          {isStandalone ? (
            // App already installed — just show login
            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-base shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              Entrar na sua conta
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <>
              <button
                onClick={handleInstall}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-base shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                <Download className="w-5 h-5" />
                Baixar o aplicativo
              </button>

              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-card/60 border border-border/50 text-muted-foreground rounded-2xl font-medium text-sm hover:text-foreground hover:border-border active:scale-[0.98] transition-all backdrop-blur-sm"
              >
                Continuar pelo navegador
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </motion.div>

        {/* Manual install instructions */}
        <AnimatePresence>
          {showInstructions && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="w-full bg-card border border-border/50 rounded-2xl p-4 text-left overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold">
                  {isIOS ? 'Como instalar no iPhone/iPad' : 'Como instalar no Android'}
                </p>
              </div>
              {isIOS ? (
                <ol className="space-y-1.5 text-sm text-muted-foreground list-none">
                  <li>1. Toque em <strong className="text-foreground">Compartilhar ⎙</strong> na barra do Safari</li>
                  <li>2. Role e toque em <strong className="text-foreground">"Adicionar à Tela Inicial"</strong></li>
                  <li>3. Confirme tocando em <strong className="text-foreground">"Adicionar"</strong></li>
                </ol>
              ) : (
                <ol className="space-y-1.5 text-sm text-muted-foreground list-none">
                  <li>1. Toque nos <strong className="text-foreground">três pontos ⋮</strong> do Chrome</li>
                  <li>2. Selecione <strong className="text-foreground">"Adicionar à tela inicial"</strong></li>
                  <li>3. Confirme tocando em <strong className="text-foreground">"Adicionar"</strong></li>
                </ol>
              )}
              <button
                onClick={() => setShowInstructions(false)}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Fechar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

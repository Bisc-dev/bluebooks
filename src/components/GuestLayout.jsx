import { Link } from 'react-router-dom';
import { BookOpen, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnimatedBackground from './AnimatedBackground';

export default function GuestLayout({ children }) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AnimatedBackground />
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              BlueBooks
            </span>
          </div>
          <Link to="/login">
            <Button size="sm" className="gap-2 rounded-xl">
              <LogIn className="w-4 h-4" /> Entrar
            </Button>
          </Link>
        </div>
      </header>
      <main className="relative z-10 pt-16 pb-8">
        {children}
      </main>
    </div>
  );
}

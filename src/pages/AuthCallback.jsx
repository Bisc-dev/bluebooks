import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { BookOpen, CheckCircle, XCircle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handle = async () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.slice(1));

      const tokenHash = params.get('token_hash');
      const type = params.get('type') || hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const errorDesc = params.get('error_description') || hashParams.get('error_description');

      if (errorDesc) {
        setStatus('error');
        setMessage(decodeURIComponent(errorDesc));
        return;
      }

      try {
        if (tokenHash && type) {
          // PKCE flow — exchange token_hash for session
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        } else if (accessToken) {
          // Implicit flow — set session directly from hash
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
        } else {
          // OAuth PKCE redirect — Supabase client auto-exchanges the ?code in the URL
          // asynchronously; wait for it to settle instead of calling getSession() too early
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error('Tempo limite de autenticação. Tente fazer login novamente.')),
              15000
            );

            supabase.auth.getSession().then(({ data: { session }, error }) => {
              if (error) { clearTimeout(timeout); reject(error); return; }
              if (session) { clearTimeout(timeout); resolve(); return; }

              const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
                if (event === 'SIGNED_IN' && sess) {
                  clearTimeout(timeout);
                  subscription.unsubscribe();
                  resolve();
                }
              });
            });
          });
        }

        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 1500);
      } catch (err) {
        setStatus('error');
        setMessage(err.message || 'Não foi possível confirmar sua conta.');
      }
    };

    handle();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 px-6">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-lg shadow-primary/30">
        <BookOpen className="w-7 h-7 text-white" />
      </div>

      {status === 'loading' && (
        <>
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Confirmando sua conta...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle className="w-10 h-10 text-green-500" />
          <div className="text-center">
            <p className="font-heading font-bold text-lg">Conta confirmada!</p>
            <p className="text-sm text-muted-foreground mt-1">Redirecionando para o app...</p>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle className="w-10 h-10 text-destructive" />
          <div className="text-center space-y-2">
            <p className="font-heading font-bold text-lg">Algo deu errado</p>
            <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Ir para o login
            </button>
          </div>
        </>
      )}
    </div>
  );
}

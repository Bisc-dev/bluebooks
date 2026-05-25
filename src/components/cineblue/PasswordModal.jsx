import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function PasswordModal({ room, onConfirm, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (password === room.room_password) {
      onConfirm();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-heading font-bold">Sala Privada</p>
            <p className="text-xs text-muted-foreground">{room.name}</p>
          </div>
        </div>
        <Input
          type="password"
          placeholder="Digite a senha da sala"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className={`rounded-xl ${error ? 'border-destructive' : ''}`}
        />
        {error && <p className="text-xs text-destructive">Senha incorreta. Tente novamente.</p>}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1 rounded-xl">Cancelar</Button>
          <Button onClick={handleSubmit} className="flex-1 bg-primary rounded-xl">Entrar</Button>
        </div>
      </div>
    </div>
  );
}

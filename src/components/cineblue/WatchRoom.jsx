import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Crown, Users, Maximize2, Minimize2, Settings,
  RefreshCw, LogOut, CheckCircle2, Trash2, Edit3, Lock, Unlock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RoomChat from './RoomChat';

function getYoutubeId(url) {
  const match = url?.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]+)/);
  return match?.[1] || null;
}

function getEmbedUrl(url, source) {
  if (!url) return '';
  if (source === 'youtube') {
    const vid = getYoutubeId(url);
    if (vid) return `https://www.youtube-nocookie.com/embed/${vid}?enablejsapi=1&autoplay=1&controls=1&rel=0&modestbranding=1&origin=${window.location.origin}`;
  }
  if (source === 'googledrive') {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return url;
}

export default function WatchRoom({ initialRoom, user, onLeave, onViewProfile }) {
  const queryClient = useQueryClient();
  const [fullscreen, setFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [syncIndicator, setSyncIndicator] = useState(false);
  const [editForm, setEditForm] = useState({
    name: initialRoom.name || '',
    description: initialRoom.description || '',
    video_url: initialRoom.video_url || '',
    video_source: initialRoom.video_source || 'youtube',
    is_private: initialRoom.is_private || false,
    room_password: initialRoom.room_password || '',
  });
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const lastSyncApplied = useRef(0);
  const isHost = user?.email === initialRoom?.host_email;
  const currentTimeRef = useRef(0);

  const { data: room } = useQuery({
    queryKey: ['watch-room', initialRoom.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('watch_rooms')
        .select('*')
        .eq('id', initialRoom.id)
        .single();
      if (error) throw error;
      return data;
    },
    initialData: initialRoom,
    refetchInterval: 2000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`watch-room-${initialRoom.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'watch_rooms',
        filter: `id=eq.${initialRoom.id}`,
      }, (payload) => {
        queryClient.setQueryData(['watch-room', initialRoom.id], payload.new);
        if (!payload.new?.is_active) onLeave();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'watch_rooms',
        filter: `id=eq.${initialRoom.id}`,
      }, () => {
        onLeave();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [initialRoom.id, queryClient, onLeave]);

  // Sync: guests follow host state
  useEffect(() => {
    if (!room || isHost) return;
    const syncAt = room.last_sync_at || 0;
    if (syncAt <= lastSyncApplied.current) return;
    lastSyncApplied.current = syncAt;

    setSyncIndicator(true);
    setTimeout(() => setSyncIndicator(false), 2000);

    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    const target = iframe.contentWindow;
    const seekTime = room.current_time + ((Date.now() - syncAt) / 1000);

    if (room.is_playing) {
      target.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [seekTime, true] }), '*');
      target.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
    } else {
      target.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [room.current_time, true] }), '*');
      target.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
    }
  }, [room?.last_sync_at, room?.is_playing, room?.current_time, isHost]);

  const updateRoom = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from('watch_rooms').update(data).eq('id', room.id);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['watch-room', room.id], old => ({ ...old, ...data }));
    },
  });

  // Host: track video position via YouTube iframe events + auto-sync every 15s
  useEffect(() => {
    if (!isHost) return;
    const mutate = updateRoom.mutate;
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.event === 'infoDelivery' && typeof data?.info?.currentTime === 'number') {
          currentTimeRef.current = data.info.currentTime;
        }
        if (data?.event === 'onStateChange' && (data.info === 1 || data.info === 2)) {
          mutate({
            current_time: currentTimeRef.current,
            last_sync_at: Date.now(),
            is_playing: data.info === 1,
          });
        }
      } catch {}
    };
    window.addEventListener('message', handleMessage);
    const interval = setInterval(() => {
      mutate({ current_time: currentTimeRef.current, last_sync_at: Date.now() });
    }, 15000);
    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, [isHost, updateRoom.mutate]);

  const handleLeave = () => {
    onLeave();
  };

  const toggleFullscreen = () => {
    if (!fullscreen) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
    setFullscreen(f => !f);
  };

  const hostSync = (extra = {}) => {
    updateRoom.mutate({ last_sync_at: Date.now(), current_time: currentTimeRef.current, ...extra });
  };

  const saveRoomSettings = () => {
    const videoChanged = editForm.video_url !== room.video_url || editForm.video_source !== room.video_source;
    updateRoom.mutate({
      name: editForm.name,
      description: editForm.description,
      video_url: editForm.video_url,
      video_source: editForm.video_source,
      is_private: editForm.is_private,
      room_password: editForm.room_password,
      ...(videoChanged ? { is_playing: true, current_time: 0, last_sync_at: Date.now() } : {}),
    });
    setShowSettings(false);
  };

  const deleteRoom = async () => {
    await supabase.from('watch_rooms').update({ is_active: false }).eq('id', room.id);
    await supabase.from('watch_rooms').delete().eq('id', room.id);
    queryClient.invalidateQueries({ queryKey: ['watch-rooms'] });
    onLeave();
  };

  const participants = room?.participants || [];
  const participantUsers = allUsers.filter(u => participants.includes(u.email));
  const embedUrl = getEmbedUrl(room?.video_url, room?.video_source);

  return (
    <div ref={containerRef} className="flex flex-col lg:flex-row h-[calc(100vh-5rem)] bg-background rounded-2xl overflow-hidden border border-border/30 shadow-2xl">

      {/* Video side */}
      <div className="flex-1 flex flex-col min-w-0 bg-black">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-black/80 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={handleLeave} className="text-white/60 hover:text-white transition-colors flex-shrink-0">
              <LogOut className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="text-white font-heading font-bold text-sm truncate">{room?.name}</p>
              <div className="flex items-center gap-2 text-white/50 text-[10px]">
                <Crown className="w-3 h-3 text-yellow-400" />
                <span>{room?.host_name}</span>
                <Users className="w-3 h-3" />
                <span>{participants.length}</span>
                {room?.is_private && <Lock className="w-3 h-3" />}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {syncIndicator && (
              <div className="flex items-center gap-1 text-green-400 text-[10px]">
                <CheckCircle2 className="w-3 h-3" />
                <span>Sincronizado</span>
              </div>
            )}
            {!isHost && (
              <div className="flex items-center gap-1 text-white/40 text-[10px]">
                <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
                <span>Ao vivo</span>
              </div>
            )}
            {isHost && (
              <button onClick={() => setShowSettings(true)} className="text-white/60 hover:text-white transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button onClick={toggleFullscreen} className="text-white/60 hover:text-white transition-colors">
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Player */}
        <div className="flex-1 relative bg-black">
          <iframe
            ref={iframeRef}
            key={room?.video_url}
            src={embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            style={{ border: 'none' }}
            onLoad={() => {
              if (!isHost && room) {
                setTimeout(() => {
                  const iframe = iframeRef.current;
                  if (!iframe?.contentWindow) return;
                  const seekTime = room.current_time + ((Date.now() - (room.last_sync_at || 0)) / 1000);
                  iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [Math.max(0, seekTime), true] }), '*');
                  if (room.is_playing) {
                    iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
                  }
                }, 2000);
              }
            }}
          />

          {isHost && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/10">
              <span className="text-[10px] text-yellow-400 font-medium flex items-center gap-1">
                <Crown className="w-3 h-3" /> Você é o host
              </span>
              <button
                onClick={() => hostSync({ is_playing: true })}
                className="text-xs text-white/70 hover:text-white bg-white/10 px-2 py-1 rounded-lg transition-colors"
              >
                Sincronizar todos
              </button>
            </div>
          )}
        </div>

        {/* Participants bar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-black/80 border-t border-white/10 flex-shrink-0 overflow-x-auto">
          {participantUsers.map(u => (
            <button
              key={u.id}
              className="relative flex-shrink-0 group"
              onClick={() => onViewProfile && onViewProfile(u.email)}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 group-hover:border-primary transition-colors">
                {u.avatar_url
                  ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-primary/30 flex items-center justify-center text-xs font-bold text-white">{(u.username || u.full_name || '?')[0]}</div>
                }
              </div>
              {u.email === room?.host_email && (
                <Crown className="w-3 h-3 text-yellow-400 absolute -top-1.5 left-1/2 -translate-x-1/2" />
              )}
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-white/60 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                {u.username || u.full_name}
              </span>
            </button>
          ))}
          {participants.filter(e => !allUsers.find(u => u.email === e)).map(email => (
            <div key={email} className="w-8 h-8 rounded-full bg-muted/30 border-2 border-white/20 flex items-center justify-center text-xs text-white/50 flex-shrink-0">?</div>
          ))}
        </div>
      </div>

      {/* Chat side */}
      <div className="w-full lg:w-72 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-border/20 flex flex-col max-h-60 lg:max-h-full">
        <div className="px-3 py-2 border-b border-border/20 flex-shrink-0 flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">Chat da sala</p>
          <span className="text-[10px] text-muted-foreground/60">{participants.length} online</span>
        </div>
        <div className="flex-1 min-h-0">
          <RoomChat room={room} user={user} />
        </div>
      </div>

      {/* Host settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="rounded-2xl max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Settings className="w-4 h-4" /> Configurações da Sala
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Edit3 className="w-3 h-3" /> Editar Sala
              </p>
              <Input placeholder="Nome da sala" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl" />
              <Textarea placeholder="Descrição (opcional)" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl" rows={2} />
              <Select value={editForm.video_source} onValueChange={v => setEditForm(f => ({ ...f, video_source: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="googledrive">Google Drive</SelectItem>
                  <SelectItem value="direct">Link Direto</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="URL do vídeo" value={editForm.video_url} onChange={e => setEditForm(f => ({ ...f, video_url: e.target.value }))} className="rounded-xl" />
              <div className="flex items-center gap-2">
                <Switch checked={editForm.is_private} onCheckedChange={v => setEditForm(f => ({ ...f, is_private: v }))} />
                <Label className="flex items-center gap-1.5">
                  {editForm.is_private ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  Sala privada
                </Label>
              </div>
              {editForm.is_private && (
                <Input type="password" placeholder="Senha da sala" value={editForm.room_password} onChange={e => setEditForm(f => ({ ...f, room_password: e.target.value }))} className="rounded-xl" />
              )}
              <Button onClick={saveRoomSettings} disabled={!editForm.name || !editForm.video_url || updateRoom.isPending} className="w-full bg-primary rounded-xl gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {updateRoom.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>

            <div className="border-t border-border/30 pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sincronização</p>
              <Button variant="outline" onClick={() => hostSync({ is_playing: true })} disabled={updateRoom.isPending} className="w-full rounded-xl gap-2">
                <RefreshCw className="w-4 h-4" /> Sincronizar todos os participantes
              </Button>
            </div>

            <div className="border-t border-red-500/20 pt-3">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">Zona de Perigo</p>
              <Button variant="destructive" onClick={() => { setShowSettings(false); setShowDeleteConfirm(true); }} className="w-full rounded-xl gap-2">
                <Trash2 className="w-4 h-4" /> Encerrar e Excluir Sala
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Encerrar Sala
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja encerrar e excluir a sala <strong className="text-foreground">"{room?.name}"</strong>?
              Todos os participantes serão desconectados e a sala não poderá ser recuperada.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl">Cancelar</Button>
              <Button variant="destructive" onClick={deleteRoom} className="flex-1 rounded-xl gap-2">
                <Trash2 className="w-4 h-4" /> Excluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Send, X, Image, Reply, Users, ArrowLeft, Smile } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { shortTime } from '@/lib/timeUtils';

const toBrasiliaDay = (dateStr) =>
  new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

const formatConvStart = (dateStr) => {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  return `${date} às ${time}`;
};

const formatDaySep = (dateStr) => {
  const msgDay = toBrasiliaDay(dateStr);
  const today = toBrasiliaDay(new Date().toISOString());
  const yesterday = toBrasiliaDay(new Date(Date.now() - 86400000).toISOString());
  if (msgDay === today) return 'Hoje';
  if (msgDay === yesterday) return 'Ontem';
  const label = new Date(dateStr).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const GIF_SUGGESTIONS = [
  'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
  'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
  'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
  'https://media.giphy.com/media/xT9IgG50Lg7russbD6/giphy.gif',
];

export default function ChatWindow({ conv, user, onClose, onViewProfile, onlineEmails = new Set() }) {
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showGifs, setShowGifs] = useState(false);
  const [imgUrl, setImgUrl] = useState('');
  const [showImgInput, setShowImgInput] = useState(false);
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  const isGroup = conv.type === 'group';
  const groupId = isGroup ? conv.data.id : null;
  const dmConvId = !isGroup ? [user?.email, conv.data.email].sort().join('_') : null;
  const wallpaper = user?.chat_wallpaper;
  const bubbleColor = user?.chat_bubble_color || '#2054BC';

  const { data: rawMessages = [] } = useQuery({
    queryKey: isGroup ? ['chat-messages', groupId] : ['dm-messages', dmConvId],
    queryFn: async () => {
      if (isGroup) {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('group_id', groupId)
          .order('created_date', { ascending: true })
          .limit(150);
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('direct_messages')
          .select('*')
          .eq('conversation_id', dmConvId)
          .order('created_date', { ascending: true })
          .limit(150);
        if (error) throw error;
        return data;
      }
    },
    enabled: !!(groupId || dmConvId),
    refetchInterval: 2500,
  });

  const messages = rawMessages.filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async (payload) => {
      if (isGroup) {
        const { error } = await supabase.from('chat_messages').insert({ group_id: groupId, ...payload });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('direct_messages').insert({ conversation_id: dmConvId, ...payload });
        if (error) throw error;
      }
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: isGroup ? ['chat-messages', groupId] : ['dm-messages', dmConvId] });
      setText('');
      setReplyTo(null);
      setShowGifs(false);
      setImgUrl('');
      setShowImgInput(false);

      // Send push notification to recipient (DM only)
      if (!isGroup && conv.data?.email) {
        const notifBody = payload.message_type === 'text'
          ? (payload.content || '').slice(0, 100)
          : payload.message_type === 'gif' ? '🎞️ Enviou um GIF' : '📷 Enviou uma imagem';
        supabase.functions.invoke('send-push', {
          body: {
            recipientEmail: conv.data.email,
            title: payload.sender_name || 'BlueBooks',
            body: notifBody,
            url: '/chats',
          },
        });
      }
    },
  });

  const sendMsg = (overrides = {}) => {
    const base = {
      content: overrides.content || text,
      sender_name: user?.username || user?.full_name || 'Anônimo',
      sender_avatar: user?.avatar_url || '',
      message_type: overrides.message_type || 'text',
      reply_to_id: replyTo?.id || '',
      reply_preview: replyTo ? replyTo.content?.slice(0, 60) : '',
      created_by: user?.email || '',
      created_date: new Date().toISOString(),
    };
    if (overrides.image_url) base.image_url = overrides.image_url;
    if (base.content || base.image_url) sendMutation.mutate(base);
  };

  const title = isGroup ? conv.data.name : (conv.data.username || conv.data.full_name);
  const isPartnerOnline = !isGroup && onlineEmails.has(conv.data?.email);
  const subtitle = isGroup ? `${(conv.data.members || []).length} membros` : (isPartnerOnline ? 'Online' : 'Offline');
  const avatar = isGroup ? conv.data.photo_url : conv.data.avatar_url;

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Wallpaper */}
      {wallpaper && (
        <div className="absolute inset-0 z-0">
          <img src={wallpaper} alt="" className="w-full h-full object-cover opacity-15" />
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 p-3 border-b border-white/10 bg-background/60 backdrop-blur-sm flex items-center gap-3">
        <button onClick={onClose} className="md:hidden text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => !isGroup && onViewProfile && onViewProfile(conv.data.email)}
          className={`w-9 h-9 rounded-full bg-primary/20 overflow-hidden flex-shrink-0 ${!isGroup ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all' : ''}`}
        >
          {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : (
            <div className="w-full h-full flex items-center justify-center">
              {isGroup ? <Users className="w-4 h-4 text-primary" /> : (
                <span className="text-sm font-bold text-primary">{(title || 'U')[0]}</span>
              )}
            </div>
          )}
        </button>
        <div className="flex-1">
          <button
            onClick={() => !isGroup && onViewProfile && onViewProfile(conv.data.email)}
            className={`text-sm font-semibold leading-tight block ${!isGroup ? 'hover:text-primary transition-colors' : ''}`}
          >
            {title}
          </button>
          <p className={`text-[10px] ${isPartnerOnline ? 'text-green-400' : 'text-muted-foreground'}`}>{subtitle}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground/50 py-12">
            {isGroup ? 'Nenhuma mensagem ainda.' : 'Seja o primeiro a enviar uma mensagem!'}
          </p>
        )}
        {messages.flatMap((msg, i) => {
          const isMe = msg.created_by === user?.email;
          const isFirst = i === 0;
          const prevMsg = messages[i - 1];
          const sameDay = prevMsg && toBrasiliaDay(msg.created_date) === toBrasiliaDay(prevMsg.created_date);

          const separator = isFirst ? (
            <div key={`sep-${msg.id}`} className="flex items-center gap-2 py-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] text-muted-foreground/50 font-medium whitespace-nowrap">
                Conversa iniciada em {formatConvStart(msg.created_date)}
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          ) : !sameDay ? (
            <div key={`sep-${msg.id}`} className="flex items-center gap-2 py-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] text-muted-foreground/50 font-medium whitespace-nowrap">
                {formatDaySep(msg.created_date)}
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          ) : null;

          const messageEl = (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {!isMe && (
                <button
                  onClick={() => onViewProfile && msg.created_by && onViewProfile(msg.created_by)}
                  className="w-7 h-7 rounded-full bg-primary/20 overflow-hidden flex-shrink-0 mb-1 hover:ring-2 hover:ring-primary/40 transition-all"
                >
                  {msg.sender_avatar ? <img src={msg.sender_avatar} alt="" className="w-full h-full object-cover" /> : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-primary">
                      {(msg.sender_name || 'A')[0]}
                    </div>
                  )}
                </button>
              )}

              <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {!isMe && <p className="text-[10px] text-muted-foreground ml-1">{msg.sender_name}</p>}

                {msg.reply_preview && (
                  <div className={`text-[10px] px-2 py-1 rounded-lg border-l-2 border-primary/60 bg-black/20 text-muted-foreground line-clamp-1 ${isMe ? 'self-end' : 'self-start'}`}>
                    ↩ {msg.reply_preview}
                  </div>
                )}

                <div
                  className={`group relative px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isMe ? 'rounded-br-sm text-white' : 'rounded-bl-sm bg-white/10 backdrop-blur-sm'
                  }`}
                  style={isMe ? { backgroundColor: bubbleColor } : {}}
                >
                  {msg.image_url && (
                    <img src={msg.image_url} alt={msg.message_type === 'gif' ? 'GIF' : 'Imagem'} className="max-w-[200px] rounded-xl mb-1 block" />
                  )}
                  {msg.content && msg.message_type !== 'gif' && msg.message_type !== 'image' && <span>{msg.content}</span>}

                  <button
                    onClick={() => setReplyTo(msg)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-background/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <Reply className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-[9px] text-muted-foreground/60 px-1">
                  {shortTime(msg.created_date)}
                </p>
              </div>

              {isMe && (
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mb-1">
                  {user?.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : (
                    <div className="w-full h-full bg-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">
                      {(user?.full_name || 'U')[0]}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );

          return separator ? [separator, messageEl] : [messageEl];
        })}
        <div ref={bottomRef} />
      </div>

      {/* GIF picker */}
      <AnimatePresence>
        {showGifs && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="relative z-10 mx-3 mb-2 p-3 bg-card/90 backdrop-blur-sm border border-white/10 rounded-2xl"
          >
            <p className="text-xs text-muted-foreground mb-2">GIFs rápidos</p>
            <div className="grid grid-cols-4 gap-2">
              {GIF_SUGGESTIONS.map((gif, i) => (
                <img key={i} src={gif} alt="gif" className="rounded-lg cursor-pointer hover:ring-2 hover:ring-primary transition-all aspect-square object-cover"
                  onClick={() => sendMsg({ content: '🎞️ GIF', image_url: gif, message_type: 'gif' })}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image URL input */}
      <AnimatePresence>
        {showImgInput && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 mx-3 mb-2 flex gap-2"
          >
            <Input value={imgUrl} onChange={e => setImgUrl(e.target.value)} placeholder="URL da imagem..." className="rounded-xl text-xs bg-black/30 border-white/10" />
            <Button size="sm" className="rounded-xl bg-primary" disabled={!imgUrl || sendMutation.isPending}
              onClick={() => { if (imgUrl && !sendMutation.isPending) sendMsg({ content: '📷 Imagem', image_url: imgUrl, message_type: 'image' }); }}>
              {sendMutation.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply indicator */}
      {replyTo && (
        <div className="relative z-10 mx-3 mb-1 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2">
          <Reply className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <p className="text-[11px] text-muted-foreground flex-1 truncate">↩ {replyTo.content?.slice(0, 60)}</p>
          <button onClick={() => setReplyTo(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Input bar */}
      <div className="relative z-10 p-3 border-t border-white/10 bg-background/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowGifs(!showGifs); setShowImgInput(false); }} className="text-muted-foreground hover:text-foreground transition-colors">
            <Smile className="w-5 h-5" />
          </button>
          <button onClick={() => { setShowImgInput(!showImgInput); setShowGifs(false); }} className="text-muted-foreground hover:text-foreground transition-colors">
            <Image className="w-5 h-5" />
          </button>
          <Input
            placeholder="Mensagem..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && text.trim() && !sendMutation.isPending && sendMsg()}
            className="flex-1 bg-black/20 border-white/10 rounded-2xl text-sm"
            disabled={sendMutation.isPending}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => text.trim() && sendMsg()}
            disabled={sendMutation.isPending}
            className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
            style={{ backgroundColor: bubbleColor }}
          >
            <Send className="w-4 h-4 text-white" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

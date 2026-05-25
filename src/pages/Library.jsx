import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import BookCard from '@/components/library/BookCard';

const genres = [
  'Todos', 'Romance', 'Dark Romance', 'Fantasia', 'Fantasia Sombria',
  'Ficção', 'Ficção Científica', 'Drama', 'Suspense', 'Terror', 'Horror Psicológico',
  'Mistério', 'Investigação', 'Ação', 'Aventura', 'Distopia', 'Sobrenatural',
  'Mitologia', 'Histórico', 'Contemporâneo', 'Slice of Life', 'LGBTQIA+',
  'Comédia', 'Comédia Romântica', 'Escolar', 'Vida Universitária', 'Poesia',
  'Filosofia', 'Autoajuda', 'Desenvolvimento Pessoal', 'Espiritualidade',
  'Crimes', 'Biografia', 'Mangá', 'Manhwa', 'Quadrinhos', 'HQ', 'Webtoon',
  'Light Novel', 'Horror Cósmico', 'Outros'
];

export default function Library() {
  const [search, setSearch] = useState('');
  const [activeGenre, setActiveGenre] = useState('Todos');

  const { data: books = [], isLoading } = useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const filtered = books.filter(b => {
    const matchSearch = !search || b.title?.toLowerCase().includes(search.toLowerCase());
    const matchGenre = activeGenre === 'Todos' || b.genre === activeGenre;
    return matchSearch && matchGenre;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">Livraria</h1>
        <p className="text-muted-foreground text-sm">Explore nossa coleção de livros</p>
      </div>

      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar livros..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-card/80 border-border/50 rounded-xl"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {genres.map(genre => (
            <motion.button
              key={genre}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveGenre(genre)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                activeGenre === genre
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                  : 'bg-card/80 text-muted-foreground hover:text-foreground border border-border/50 hover:border-primary/40'
              }`}
            >
              {genre}
            </motion.button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {Array(16).fill(0).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum livro encontrado</p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3"
        >
          <AnimatePresence>
            {filtered.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

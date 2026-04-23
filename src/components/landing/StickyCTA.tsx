import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function StickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-50 sm:hidden pointer-events-none"
        >
          <div className="p-3 bg-background/80 backdrop-blur-xl border-t border-border/40 pointer-events-auto">
            <Link to="/register" className="block">
              <Button
                size="lg"
                className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90 gap-2 font-bold shadow-[0_0_30px_hsl(0_85%_55%/0.35)] h-12"
              >
                Solicitar Acceso <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useState } from 'react';
import { Share2, MessageCircle, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { shareScorecard, shareToPlatform, generateShareText } from '@/utils/scorecardShare';

export default function ScorecardShareButton({ scorecard, stands = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [shared, setShared] = useState(false);

  const handleNativeShare = async () => {
    const result = await shareScorecard(scorecard, stands);
    if (result.success) {
      setShared(true);
      setTimeout(() => setShared(false), 2000);
      setIsOpen(false);
    }
  };

  const handlePlatformShare = (platform) => {
    const text = generateShareText(scorecard, stands);
    const title = `My Clay Shooting Score: ${scorecard.hit_percentage}%`;
    shareToPlatform(platform, text, title);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={handleNativeShare}
        onLongPress={() => setIsOpen(!isOpen)}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
          shared
            ? 'bg-emerald-500 text-white'
            : 'bg-background hover:bg-secondary border border-primary/30 text-primary'
        }`}
      >
        <Share2 className="w-3.5 h-3.5" />
        {shared ? 'Shared!' : 'Share'}
      </motion.button>

      {/* Share Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-20"
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-xl shadow-lg z-30 overflow-hidden"
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePlatformShare('whatsapp')}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-secondary transition-colors text-sm font-medium whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 text-green-500" />
                WhatsApp
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePlatformShare('email')}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-secondary transition-colors border-t border-border text-sm font-medium whitespace-nowrap"
              >
                <Mail className="w-4 h-4 text-blue-500" />
                Email
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
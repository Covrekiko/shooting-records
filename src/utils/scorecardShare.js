/**
 * Generate shareable text from scorecard stats
 */
export function generateShareText(scorecard, stands = []) {
  const lines = [
    '🎯 Clay Shooting Scorecard',
    `Score: ${scorecard.total_hits}/${scorecard.total_valid_scored_clays}`,
    `Hit Rate: ${scorecard.hit_percentage}%`,
    `Stands: ${scorecard.total_stands}`,
    `Dead: ${scorecard.total_hits} | Lost: ${scorecard.total_misses} | No Bird: ${scorecard.total_no_birds || 0}`,
    `Cartridges: ${scorecard.total_cartridges_used}`,
  ];

  if (stands.length > 0 && stands.length <= 5) {
    lines.push('');
    lines.push('Stand Breakdown:');
    stands.forEach(stand => {
      const valid = (stand.hits || 0) + (stand.misses || 0);
      const pct = valid > 0 ? Math.round(((stand.hits || 0) / valid) * 100) : 0;
      lines.push(`Stand ${stand.stand_number}: ${stand.hits || 0}/${valid} (${pct}%)`);
    });
  }

  return lines.join('\n');
}

/**
 * Share scorecard results to external platforms
 */
export async function shareScorecard(scorecard, stands = []) {
  const shareText = generateShareText(scorecard, stands);
  const shareTitle = `My Clay Shooting Score: ${scorecard.hit_percentage}%`;

  // Try native Web Share API first (mobile-friendly)
  if (navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
      });
      return { success: true, method: 'native' };
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
      return { success: false, method: 'native', error: err };
    }
  }

  // Fallback: Show share options
  return { success: false, method: 'fallback', options: generateShareLinks(shareText, shareTitle) };
}

/**
 * Generate direct share links for WhatsApp and Email
 */
export function generateShareLinks(text, title) {
  const encodedText = encodeURIComponent(text);
  const encodedTitle = encodeURIComponent(title);

  return {
    whatsapp: `https://wa.me/?text=${encodedText}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedText}`,
    text: text,
  };
}

/**
 * Share to specific platform
 */
export function shareToPlatform(platform, text, title) {
  const links = generateShareLinks(text, title);

  switch (platform) {
    case 'whatsapp':
      window.open(links.whatsapp, '_blank');
      break;
    case 'email':
      window.open(links.email);
      break;
    default:
      break;
  }
}
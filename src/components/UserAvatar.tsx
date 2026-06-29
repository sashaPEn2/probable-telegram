import React from 'react';
import { CustomUser } from '../types';

interface UserAvatarProps {
  user?: Partial<CustomUser> | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-emerald-600 to-teal-700',
  'from-purple-600 to-pink-700',
  'from-amber-500 to-rose-600',
  'from-cyan-500 to-blue-600',
  'from-fuchsia-600 to-violet-800',
];

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'md', className = '' }) => {
  if (!user) {
    return (
      <div className={`rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 font-bold ${getSizeClasses('sm')} ${className}`}>
        ?
      </div>
    );
  }

  const { first_name = '', last_name = '', avatar_url = '', record_book_id = '' } = user;
  const initials = `${first_name[0] || ''}${last_name[0] || ''}`.toUpperCase() || '?';

  // Deterministic gradient selection
  const seed = record_book_id || `${last_name}${first_name}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradientIndex = Math.abs(hash) % GRADIENTS.length;
  const gradient = GRADIENTS[gradientIndex];

  function getSizeClasses(sizeStr: string) {
    switch (sizeStr) {
      case 'xs': return 'w-6 h-6 text-[10px] rounded-lg';
      case 'sm': return 'w-8 h-8 text-xs rounded-xl';
      case 'md': return 'w-10 h-10 text-sm rounded-xl';
      case 'lg': return 'w-12 h-12 text-base rounded-2xl';
      case 'xl': return 'w-16 h-16 text-lg rounded-2xl';
      case '2xl': return 'w-20 sm:w-24 h-20 sm:h-24 text-xl sm:text-2xl rounded-3xl';
      default: return 'w-10 h-10 text-sm rounded-xl';
    }
  }

  const sizeClasses = getSizeClasses(size);

  // If we have an avatar URL
  if (avatar_url) {
    // Check if it's inline raw SVG
    if (avatar_url.trim().startsWith('<svg')) {
      return (
        <div 
          className={`flex-shrink-0 flex items-center justify-center overflow-hidden ${sizeClasses} ${className}`}
          dangerouslySetInnerHTML={{ __html: avatar_url }}
        />
      );
    }

    // Standard URL or base64 Data URI
    return (
      <img
        referrerPolicy="no-referrer"
        src={avatar_url}
        alt={`${first_name} ${last_name}`}
        className={`flex-shrink-0 object-cover overflow-hidden ${sizeClasses} ${className}`}
        onError={(e) => {
          // Fallback on load error
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  // Fallback procedural initials
  return (
    <div className={`flex-shrink-0 bg-gradient-to-tr ${gradient} text-white font-extrabold flex items-center justify-center shadow-md ${sizeClasses} ${className}`}>
      {initials}
    </div>
  );
};

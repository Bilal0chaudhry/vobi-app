import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';

export default function useTheme(profile) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('vobi-theme') || 'system';
  });
  
  const isSyncing = useRef(false);

  const applyTheme = (val) => {
    const isDark =
      val === 'dark' ||
      (val === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Reconcile DB with localStorage on mount/profile load
  useEffect(() => {
    if (profile && profile.theme_preference) {
      if (profile.theme_preference !== theme) {
        // Prevent stale DB reads from overriding while an active DB write is in flight
        if (!isSyncing.current) {
          setTheme(profile.theme_preference);
          localStorage.setItem('vobi-theme', profile.theme_preference);
          applyTheme(profile.theme_preference);
        }
      }
    }
  }, [profile, theme]);

  // Handle system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    
    // Modern API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } 
    // Fallback for older Safari
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme]);

  const updateTheme = async (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('vobi-theme', newTheme);
    applyTheme(newTheme);

    if (profile) {
      isSyncing.current = true;
      try {
        await supabase.rpc('update_user_theme', { new_theme: newTheme });
      } catch (err) {
        console.error(err);
      } finally {
        isSyncing.current = false;
      }
    }
  };

  return { theme, updateTheme };
}

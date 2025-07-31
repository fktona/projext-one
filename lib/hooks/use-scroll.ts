import { useRef, useCallback } from 'react';

export const useScrollToBottom = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: behavior
      });
    }
  }, []);

  return { scrollRef, scrollToBottom };
};
  
  
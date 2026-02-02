import { useRef, useEffect } from 'react';
import lottie from 'lottie-web';
import type { AnimationItem } from 'lottie-web';
import animationData from '../assets/animation.json';

const LottieAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (containerRef.current && !animationRef.current) {
      animationRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: animationData,
      });
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.destroy();
        animationRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} id="lottie" />;
};

export default LottieAnimation;

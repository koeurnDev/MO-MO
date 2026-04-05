import { useState, useCallback } from 'react';

export const useMagnetic = (intensity = 0.5) => {
  const [transform, setTransform] = useState({ x: 0, y: 0 });

  const onMouseMove = useCallback((e) => {
    const { currentTarget: target } = e;
    const { left, top, width, height } = target.getBoundingClientRect();
    const x = e.clientX - (left + width / 2);
    const y = e.clientY - (top + height / 2);
    setTransform({ x: x * intensity, y: y * intensity });
  }, [intensity]);

  const onMouseLeave = useCallback(() => {
    setTransform({ x: 0, y: 0 });
  }, []);

  return {
    style: {
      transform: `translate(${transform.x}px, ${transform.y}px)`,
      transition: transform.x === 0 ? 'transform 0.5s var(--spring-bounce)' : 'none'
    },
    onMouseMove,
    onMouseLeave
  };
};

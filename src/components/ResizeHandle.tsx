import { useCallback, useEffect, useRef } from 'react';

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
}

export default function ResizeHandle({ direction, onResize, onResizeEnd }: ResizeHandleProps) {
  const isDragging = useRef(false);
  const lastPos = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      lastPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [direction]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - lastPos.current;
      lastPos.current = currentPos;
      onResize(delta);
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      onResizeEnd?.();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [direction, onResize, onResizeEnd]);

  if (direction === 'horizontal') {
    return (
      <div
        onMouseDown={handleMouseDown}
        className="flex-shrink-0 w-1 cursor-col-resize group relative z-10 titlebar-no-drag"
      >
        {/* Wider invisible hit area */}
        <div className="absolute inset-y-0 -left-1 -right-1" />
        {/* Visible line on hover */}
        <div className="absolute inset-y-0 left-0 w-px bg-slate-200 dark:bg-slate-700 group-hover:bg-teal-400 group-active:bg-teal-500 dark:group-hover:bg-teal-500 dark:group-active:bg-teal-400 transition-colors" />
      </div>
    );
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className="flex-shrink-0 h-1 cursor-row-resize group relative z-10"
    >
      {/* Taller invisible hit area */}
      <div className="absolute inset-x-0 -top-1 -bottom-1" />
      {/* Visible line on hover */}
      <div className="absolute inset-x-0 top-0 h-px bg-slate-200 dark:bg-slate-700 group-hover:bg-teal-400 group-active:bg-teal-500 dark:group-hover:bg-teal-500 dark:group-active:bg-teal-400 transition-colors" />
    </div>
  );
}

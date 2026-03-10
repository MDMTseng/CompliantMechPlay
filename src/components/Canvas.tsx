interface CanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  sidebarOpen: boolean;
}

export function Canvas({ containerRef, sidebarOpen }: CanvasProps) {
  return (
    <div
      ref={containerRef}
      className={`canvas-area${sidebarOpen ? '' : ' full'}`}
    />
  );
}

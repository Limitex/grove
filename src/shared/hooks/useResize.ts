import { useCallback, useRef, useState } from "react";

interface UseResizeOptions {
  initial: number;
  min: number;
  max: number;
  direction: "horizontal" | "vertical";
}

export function useResize({ initial, min, max, direction }: UseResizeOptions) {
  const [size, setSize] = useState(initial);
  const resizing = useRef(false);

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizing.current = true;
      const startPos = direction === "horizontal" ? e.clientX : e.clientY;
      const startSize = size;

      const onMouseMove = (ev: MouseEvent) => {
        if (!resizing.current) return;
        const currentPos = direction === "horizontal" ? ev.clientX : ev.clientY;
        const dynamicMax = direction === "horizontal" ? window.innerWidth - 200 : max;
        const newSize = startSize - (currentPos - startPos);
        setSize(Math.max(min, Math.min(dynamicMax, newSize)));
      };

      const onMouseUp = () => {
        resizing.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [size, min, max, direction],
  );

  return { size, onResizeStart };
}

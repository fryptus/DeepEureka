"use client";

import React, { useState, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function FlowPanel() {
  const [height, setHeight] = useState(200); // 默认高度 200px
  const [collapsed, setCollapsed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleMouseDown = () => {
    isDraggingRef.current = true;
    document.body.style.cursor = "row-resize";
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDraggingRef.current && panelRef.current) {
      const newHeight = window.innerHeight - e.clientY;
      setHeight(Math.max(100, Math.min(newHeight, 500))); // 高度限制在100~500px
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    document.body.style.cursor = "default";
  };

  React.useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <>
      {/* 拖拽条 */}
      <div
        className="h-2 cursor-row-resize bg-neutral-800"
        onMouseDown={handleMouseDown}
      />
      
      {/* 控制台内容区域 */}
      <div
        ref={panelRef}
        className={`w-full bg-neutral-900 text-white border-t border-neutral-700 transition-all duration-200 ease-in-out ${
          collapsed ? "h-8" : ""
        }`}
        style={{ height: collapsed ? "2rem" : `${height}px` }}
      >
        <div className="flex items-center justify-between px-3 py-1 border-b border-neutral-700 text-sm text-zinc-400 bg-neutral-800">
          <span className="text-xs">Terminal</span>
          <button
            className="hover:text-white transition"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        {!collapsed && (
          <div className="p-2 overflow-auto font-mono text-sm space-y-1">
            <div>&gt; Server started at http://localhost:3000</div>
            <div>&gt; Listening for changes...</div>
            <div>&gt; Compiled successfully</div>
          </div>
        )}
      </div>
    </>
  );
}

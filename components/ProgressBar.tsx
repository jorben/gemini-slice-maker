'use client';

import React from 'react';

interface Props {
  progress: number; // 0 to 100
  label?: string;
}

export const ProgressBar: React.FC<Props> = ({ progress, label }) => {
  return (
    <div className="w-full">
      {label && <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-muted-foreground">{Math.round(progress)}%</span>
      </div>}
      <div className="w-full bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/5 rounded-full h-3 overflow-hidden backdrop-blur-sm">
        <div 
          className="bg-primary h-full rounded-full transition-all duration-500 ease-out shadow-sm" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

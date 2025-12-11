'use client';

import React, { useRef } from 'react';
import { Wand2, Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { Presentation } from '@/lib/types';
import { AppStep } from '@/lib/types';
import type { Language, translations } from '@/lib/translations';
import { ProgressBar } from './ProgressBar';

interface Props {
  step: AppStep;
  presentation: Presentation | null;
  generationProgress: number;
  streamingContent?: string;
  t: typeof translations['en'];
  uiLanguage: Language;
}

export const LoadingStep: React.FC<Props> = ({ step, presentation, generationProgress, streamingContent, t, uiLanguage }) => {
  const progressListRef = useRef<HTMLDivElement>(null);

  // Phase 1: Planning
  if (step === AppStep.PLANNING) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto p-6 animate-fade-in">
        <div className="mb-8 relative">
          <div className="w-24 h-24 border-4 border-primary/20 rounded-full animate-pulse"></div>
          <div className="absolute top-0 left-0 w-24 h-24 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <Wand2 className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t.loadingPlanning}</h2>
        <p className="text-muted-foreground mb-8 text-center max-w-md mx-auto">
          {t.analyzingDoc}
          <span className="block mt-2 text-xs text-muted-foreground/70">
            {uiLanguage === 'en' 
              ? "This may take a few moments for large documents..." 
              : "大型文档可能需要一些时间..."}
          </span>
        </p>
        <ProgressBar progress={generationProgress} />
        
        {/* Streaming Content Window */}
        <div className="mt-8 w-full max-w-lg mx-auto px-4">
           <p 
             className="text-xs text-muted-foreground/70 text-center font-mono whitespace-nowrap overflow-hidden"
             style={{ 
               maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
               WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' 
             }}
           >
             {streamingContent ? streamingContent.slice(-120) : "..."}
           </p>
        </div>
      </div>
    );
  }

  // Phase 2: Generating Images
  if (step === AppStep.GENERATING && presentation) {
    const completedCount = presentation.slides.filter(s => s.status === 'completed').length;
    const totalCount = presentation.slides.length;
    
    return (
      <div className="flex flex-col h-full max-w-3xl mx-auto p-6 animate-fade-in w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">{t.loadingGenerating}</h2>
          <div className="w-full max-w-md mx-auto">
            <ProgressBar 
              progress={generationProgress} 
              label={`${completedCount} / ${totalCount} ${t.slidesLabel}`} 
            />
            <p className="text-xs text-muted-foreground mt-2">{t.generatingHint}</p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col bg-card rounded-xl border border-border shadow-sm relative">
          <div ref={progressListRef} className="flex-1 overflow-y-auto p-2 scroll-smooth">
            {presentation.slides.map((slide) => (
              <div 
                key={slide.id} 
                className={`p-4 flex items-center gap-4 border-b border-muted last:border-0 rounded-lg transition-colors ${
                  slide.status === 'generating' ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                  slide.status === 'completed' ? 'bg-success/20 text-success' : 
                  slide.status === 'generating' ? 'bg-primary/20 text-primary' :
                  slide.status === 'failed' ? 'bg-destructive/20 text-destructive' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {slide.pageNumber}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    slide.status === 'completed' ? 'text-foreground' : 
                    slide.status === 'generating' ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {slide.content.title || `Slide ${slide.pageNumber}`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {slide.status === 'generating' ? t.designing : slide.content.visualDescription}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  {slide.status === 'pending' && <Clock className="w-5 h-5 text-muted-foreground/50" />}
                  {slide.status === 'generating' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                  {slide.status === 'completed' && <CheckCircle className="w-5 h-5 text-success" />}
                  {slide.status === 'failed' && <AlertCircle className="w-5 h-5 text-destructive" />}
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none"></div>
        </div>
      </div>
    );
  }

  return null;
};

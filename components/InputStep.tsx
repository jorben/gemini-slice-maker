'use client';

import React from 'react';
import { FileText, ChevronRight, X, File } from 'lucide-react';
import type { InputSource } from '@/lib/types';
import { AppStep } from '@/lib/types';
import type { Language, translations } from '@/lib/translations';

interface Props {
  inputSource: InputSource;
  setInputSource: (source: InputSource) => void;
  setStep: (step: AppStep) => void;
  t: typeof translations['en'];
  uiLanguage: Language;
}

export const InputStep: React.FC<Props> = ({ inputSource, setInputSource, setStep, t, uiLanguage }) => {
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert(uiLanguage === 'en' ? "File is too large (Max 20MB)" : "文件过大 (最大 20MB)");
      return;
    }

    setInputSource({ type: 'text', textContent: '' });

    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = (event.target?.result as string).split(',')[1];
        setInputSource({
          type: 'file',
          fileData: base64String,
          mimeType: 'application/pdf',
          fileName: file.name
        });
      };
      reader.readAsDataURL(file);
    } else if (file.name.endsWith('.docx')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (window.mammoth) {
          const result = await window.mammoth.extractRawText({ arrayBuffer });
          setInputSource({
            type: 'text',
            textContent: result.value,
            fileName: file.name
          });
        } else {
          alert("Word processor not loaded yet. Please try again in a moment.");
        }
      } catch (error) {
        console.error("Error parsing Word file", error);
        alert("Failed to read Word document.");
      }
    } else {
      const text = await file.text();
      setInputSource({
        type: 'text',
        textContent: text,
        fileName: file.name
      });
    }
  };

  const clearFile = () => {
    setInputSource({ type: 'text', textContent: '' });
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto w-full p-6 animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">{t.appTitle}</h1>
        <p className="text-lg text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-8">
        <div className="mb-4 flex justify-between items-center">
          <label className="block text-sm font-medium text-foreground">{t.sourceMaterial}</label>
          <div className="relative">
            <input 
              id="file-upload"
              type="file" 
              accept=".txt,.md,.json,.pdf,.docx" 
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <button className="text-sm text-primary font-medium hover:text-primary/80 flex items-center gap-1">
              <FileText className="w-4 h-4" /> {t.uploadBtn}
            </button>
          </div>
        </div>
        
        {inputSource.fileName ? (
          <div className="w-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-primary/30 rounded-lg bg-primary/5 relative">
            <button 
              onClick={clearFile}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-destructive hover:bg-background rounded-full transition-colors"
              title={t.removeFile}
            >
              <X className="w-5 h-5" />
            </button>
            <File className="w-16 h-16 text-primary/60 mb-4" />
            <p className="text-lg font-medium text-primary">{t.fileUploaded}</p>
            <p className="text-muted-foreground">{inputSource.fileName}</p>
            {inputSource.type === 'file' && <p className="text-xs text-muted-foreground mt-2">(PDF Analysis Mode)</p>}
            {inputSource.type === 'text' && inputSource.textContent && (
              <p className="text-xs text-muted-foreground mt-2">({inputSource.textContent.length} {t.charCount})</p>
            )}
          </div>
        ) : (
          <div className="relative">
            <textarea
              value={inputSource.textContent || ''}
              onChange={(e) => setInputSource({ type: 'text', textContent: e.target.value })}
              placeholder={t.pastePlaceholder}
              className="w-full h-64 p-4 rounded-lg border border-input focus:ring-2 focus:ring-ring focus:border-primary resize-none text-foreground"
            />
            <div className="mt-2 text-right text-xs text-muted-foreground">
              {(inputSource.textContent || '').length} {t.charCount}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button
          disabled={!inputSource.textContent && !inputSource.fileData}
          onClick={() => setStep(AppStep.CONFIG)}
          className="bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground text-lg font-semibold py-3 px-10 rounded-full transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          {t.nextBtn} <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Copy, Check, Printer, FileText } from 'lucide-react';
import { DialogueScript } from '../types';

interface WorksheetExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: DialogueScript;
}

export const WorksheetExportModal: React.FC<WorksheetExportModalProps> = ({
  isOpen,
  onClose,
  script,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getPlainText = () => {
    let output = `${script.title}\n${script.subtitle}\nLevel: ${script.level}\n\n`;
    output += `--- SUMMARY ---\n${script.summary}\n\n`;
    output += `--- DIALOGUE SCRIPT ---\n`;
    script.lines.forEach((line, idx) => {
      output += `${idx + 1}. [${line.speaker}]: "${line.text}"\n`;
      output += `   (中譯): ${line.chineseText}\n\n`;
    });
    output += `--- CORE A2 VOCABULARY ---\n`;
    script.vocabulary.forEach((v) => {
      output += `• ${v.word} ${v.phonetic} (${v.partOfSpeech}): ${v.chineseMeaning}\n`;
      output += `  Def: ${v.definition}\n`;
      output += `  Ex: "${v.exampleSentence}"\n\n`;
    });
    return output;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getPlainText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Student Study Sheet (練習講義)</h3>
              <p className="text-xs text-slate-500">Copy text or print this dialogue for classroom practice.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable text container */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs sm:text-sm font-mono whitespace-pre-wrap text-slate-700 select-all leading-relaxed">
          {getPlainText()}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 shrink-0">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Worksheet (列印)</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Script (複製全文)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, Upload, FileText, Image as ImageIcon, X, Send, Loader2, BookOpen, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [question, setQuestion] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState('');
  const [fileMimeType, setFileMimeType] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [followUp, setFollowUp] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, answer, isChatLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 20 * 1024 * 1024) {
      setError('File size must be less than 20MB');
      return;
    }

    setFile(selectedFile);
    setError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const split = result.split(',');
      if (split.length === 2) {
        const mimeMatch = split[0].match(/:(.*?);/);
        if (mimeMatch) {
          setFileMimeType(mimeMatch[1]);
        }
        setFileBase64(split[1]);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setFileBase64('');
    setFileMimeType('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() && !fileBase64) return;

    setIsLoading(true);
    setError('');
    setAnswer('');
    setChatHistory([]);

    try {
      const response = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question,
          fileData: fileBase64,
          fileMimeType: fileMimeType
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      setAnswer(data.answer);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUp.trim() || isChatLoading) return;
    
    const newMessage = followUp.trim();
    setFollowUp('');
    const newHistory = [...chatHistory, { role: 'user' as const, text: newMessage }];
    setChatHistory(newHistory);
    setIsChatLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalQuestion: question,
          solution: answer,
          chatHistory: chatHistory,
          message: newMessage
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setChatHistory([...newHistory, { role: 'model' as const, text: data.answer }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500/30">
      {/* Left Panel: Input */}
      <div className="w-full md:w-1/2 lg:w-[45%] border-r border-zinc-800 flex flex-col bg-zinc-950/50 shadow-2xl z-10">
        <div className="p-6 md:p-8 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">AAT AI Tutor</h1>
                <p className="text-sm text-zinc-500 font-medium">Step-by-step Accounting Solutions</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px bg-zinc-800 flex-1"></div>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest px-2">Ask a Question</h2>
              <div className="h-px bg-zinc-800 flex-1"></div>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-5">
              <div className="flex-1 bg-zinc-900/50 border border-zinc-800/80 rounded-3xl p-5 flex flex-col focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all shadow-inner">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Describe your accounting problem here, or attach a past paper image/PDF..."
                  className="w-full flex-1 bg-transparent resize-none outline-none text-zinc-200 placeholder:text-zinc-600 leading-relaxed text-base"
                  disabled={isLoading}
                />
                
                <AnimatePresence>
                  {file && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="mt-4 flex items-center gap-3 p-3 bg-zinc-800/80 rounded-2xl border border-zinc-700/50 shadow-sm"
                    >
                      <div className="p-2.5 bg-zinc-700/50 rounded-xl text-zinc-300">
                        {file.type.startsWith('image/') ? (
                          <ImageIcon className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{file.name}</p>
                        <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                        disabled={isLoading}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between mt-2 gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700 transition-all font-medium"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-sm hidden sm:inline">Attach</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
                
                <button
                  type="submit"
                  disabled={isLoading || (!question.trim() && !fileBase64)}
                  className="flex-1 flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:shadow-none text-base"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  <span>{isLoading ? 'Analyzing Problem...' : 'Solve Problem'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right Panel: Output */}
      <div className="w-full md:w-1/2 lg:w-[55%] flex flex-col bg-zinc-950 relative overflow-hidden">
        {/* Subtle Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="relative z-10 flex-1 flex flex-col h-screen overflow-y-auto custom-scrollbar">
          <div className="p-6 md:p-12 max-w-4xl mx-auto w-full flex-1 flex flex-col">
            
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-2xl flex items-start gap-4 mb-8 shadow-lg">
                <X className="w-5 h-5 mt-0.5 shrink-0" />
                <p className="leading-relaxed text-sm">{error}</p>
              </motion.div>
            )}

            {!answer && !isLoading && !error && (
              <div className="flex flex-col items-center justify-center flex-1 text-center opacity-60">
                <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                  <BookOpen className="w-10 h-10 text-zinc-600" />
                </div>
                <h3 className="text-2xl font-medium text-zinc-300 mb-3 tracking-tight">Ready to Assist</h3>
                <p className="text-zinc-500 max-w-sm leading-relaxed text-base">
                  Submit a question or upload a past paper. The AI will break down the accounting principles and provide a step-by-step solution.
                </p>
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500 blur-[30px] opacity-20 rounded-full"></div>
                  <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-6 relative z-10" />
                </div>
                <p className="text-indigo-400 font-medium animate-pulse text-lg tracking-tight">Generating comprehensive solution...</p>
              </div>
            )}

            {answer && !isLoading && (
              <div className="flex flex-col flex-1 pb-24">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="markdown-body prose prose-invert prose-zinc max-w-none"
                >
                  <ReactMarkdown>{answer}</ReactMarkdown>
                </motion.div>
                
                {chatHistory.length > 0 && (
                   <div className="w-full h-px bg-zinc-800/80 my-10"></div>
                )}
                
                {chatHistory.length > 0 && (
                   <div className="flex flex-col gap-6">
                     {chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-zinc-800 border border-zinc-700'}`}>
                             {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-indigo-400" />}
                           </div>
                           <div className={`max-w-[85%] rounded-2xl p-5 ${msg.role === 'user' ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-100 rounded-tr-sm' : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-sm'}`}>
                             {msg.role === 'user' ? (
                               <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                             ) : (
                               <div className="markdown-body prose prose-invert prose-sm max-w-none">
                                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                               </div>
                             )}
                           </div>
                        </div>
                     ))}
                   </div>
                )}
                
                {isChatLoading && (
                   <div className="flex gap-4 flex-row mt-6">
                     <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                       <Sparkles className="w-4 h-4 text-indigo-400" />
                     </div>
                     <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm p-4 flex items-center gap-3 text-zinc-400">
                       <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                       <span className="text-sm font-medium">AI is typing...</span>
                     </div>
                   </div>
                )}
                <div ref={chatEndRef} className="h-4" />
              </div>
            )}
          </div>
        </div>

        {/* Follow-up Chat Input Bar */}
        {answer && !isLoading && (
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent">
             <form onSubmit={handleFollowUp} className="max-w-4xl mx-auto flex gap-3 relative">
               <input
                 type="text"
                 value={followUp}
                 onChange={(e) => setFollowUp(e.target.value)}
                 placeholder="Ask a follow-up question (e.g. 'Can you explain step 2 again?')"
                 className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-zinc-200 shadow-xl placeholder:text-zinc-600 text-sm"
                 disabled={isChatLoading}
               />
               <button
                 type="submit"
                 disabled={isChatLoading || !followUp.trim()}
                 className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl flex items-center justify-center transition-colors"
               >
                 <Send className="w-4 h-4" />
               </button>
             </form>
          </div>
        )}
      </div>
    </div>
  );
}

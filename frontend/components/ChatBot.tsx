'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { chatWithStylist, saveClick } from '@/lib/api';

interface ChatProduct {
    name: string;
    marque: string;
    prix: number;
    recherche: string;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    products?: ChatProduct[];
}

interface ChatBotProps {
    userId: number;
    userName: string;
}

function buildShopUrl(searchTerms: string): string {
    return `https://www.google.com/search?btnI=1&q=${encodeURIComponent(searchTerms + ' acheter')}`;
}

export default function ChatBot({ userId, userName }: ChatBotProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: `Salut ${userName} ! 👋 Je suis ton styliste IA. Dis-moi ce que tu cherches : un look pour une soirée, des baskets tendance, une tenue de bureau... Je te trouve les meilleurs produits ! 🔥`,
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleProductClick = (product: ChatProduct) => {
        const url = buildShopUrl(product.recherche);
        saveClick(userId, {
            product_name: product.name,
            marque: product.marque,
            prix: typeof product.prix === 'number' ? product.prix : parseFloat(String(product.prix)) || 0,
            url,
        }).catch(console.error);
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMsg: ChatMessage = { role: 'user', content: input.trim() };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const history = messages.map((m) => ({ role: m.role, content: m.content }));
            const result = await chatWithStylist(userId, userMsg.content, history);

            const assistantMsg: ChatMessage = {
                role: 'assistant',
                content: result.reply || "Hmm, je n'ai pas compris. Reformule ta demande !",
                products: result.products || [],
            };
            setMessages((prev) => [...prev, assistantMsg]);
            if (!isOpen) setHasNewMessage(true);
        } catch (err) {
            console.error(err);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Oups, j\'ai eu un souci réseau. Réessaie ! 😅' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-gray-900 border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/10 flex flex-col overflow-hidden"
                    style={{ height: '520px' }}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-4 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">DigitalStylist</p>
                                <p className="text-[10px] text-white/60">Ton styliste IA personnel</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4 text-white/70" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                                    <div
                                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                                ? 'bg-purple-600 text-white rounded-br-md'
                                                : 'bg-white/5 text-gray-200 rounded-bl-md border border-white/5'
                                            }`}
                                    >
                                        {msg.content}
                                    </div>

                                    {/* Product cards */}
                                    {msg.products && msg.products.length > 0 && (
                                        <div className="mt-2 space-y-1.5">
                                            {msg.products.map((product, pidx) => {
                                                const prix = typeof product.prix === 'number' ? product.prix : parseFloat(String(product.prix)) || 0;
                                                return (
                                                    <a
                                                        key={pidx}
                                                        href={buildShopUrl(product.recherche)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={() => handleProductClick(product)}
                                                        className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl px-3 py-2.5 transition-colors group"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-white truncate">{product.name}</p>
                                                            <p className="text-[10px] text-gray-500">{product.marque}</p>
                                                        </div>
                                                        <span className="text-xs font-bold text-purple-400 flex-shrink-0">{prix.toFixed(2)}€</span>
                                                        <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-white flex-shrink-0 transition-colors" />
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-bl-md px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <span className="text-xs text-gray-500">Recherche en cours...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-white/5 p-3 flex-shrink-0">
                        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10 focus-within:border-purple-500/50 transition-colors">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ex: Un look pour un date ce soir..."
                                className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
                                disabled={loading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={loading || !input.trim()}
                                className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors text-white"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        <p className="text-[9px] text-gray-700 text-center mt-1.5">
                            Propulsé par Gemini AI · Les prix sont indicatifs
                        </p>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => { setIsOpen(!isOpen); setHasNewMessage(false); }}
                className={`fixed bottom-6 right-4 sm:right-6 z-50 w-14 h-14 rounded-full shadow-lg shadow-purple-500/30 flex items-center justify-center transition-all duration-300 ${isOpen
                        ? 'bg-gray-800 rotate-0 scale-90'
                        : 'bg-gradient-to-br from-purple-600 to-blue-600 hover:scale-110'
                    }`}
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <>
                        <MessageCircle className="w-6 h-6 text-white" />
                        {hasNewMessage && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-gray-950 animate-pulse" />
                        )}
                    </>
                )}
            </button>
        </>
    );
}

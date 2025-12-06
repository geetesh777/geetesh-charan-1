import React, { useState, useEffect } from 'react';
import { Member, ExpenseCategory, SplitType, AIParseResult } from '../types';
import { Sparkles, X, CheckCircle } from './ui/Icons';
import { parseExpenseWithAI } from '../services/geminiService';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onAdd: (expenseData: any) => void;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose, members, onAdd }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  
  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState(members[0]?.id || '');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.FOOD);
  const [splitType, setSplitType] = useState<SplitType>(SplitType.EQUAL);
  const [splitData, setSplitData] = useState<Record<string, number>>({});
  
  // AI State
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Reset logic
  useEffect(() => {
    if (isOpen) {
      // Default to equal split involving everyone
      const initialSplits: Record<string, number> = {};
      members.forEach(m => initialSplits[m.id] = 1);
      setSplitData(initialSplits);
      setPayerId(members[0]?.id || '');
    }
  }, [isOpen, members]);

  const handleAiParse = async () => {
    if (!aiInput.trim()) return;
    setIsAiLoading(true);
    setAiError('');

    try {
      const memberNames = members.map(m => m.name);
      const result: AIParseResult | null = await parseExpenseWithAI(aiInput, memberNames);

      if (result) {
        setDescription(result.description);
        setAmount(result.amount.toString());
        setCategory(result.category as ExpenseCategory);
        
        // Try to match payer
        if (result.payerName) {
          const payer = members.find(m => m.name.toLowerCase() === result.payerName?.toLowerCase());
          if (payer) setPayerId(payer.id);
        }

        // Adjust splits based on involved names
        const newSplits: Record<string, number> = {};
        if (result.involvedNames && result.involvedNames.length > 0) {
            members.forEach(m => {
                // Check if member is in involved list
                const isInvolved = result.involvedNames.some(name => m.name.toLowerCase().includes(name.toLowerCase()));
                if (isInvolved) {
                    newSplits[m.id] = 1;
                }
            });
             // If no exact matches found (e.g. AI returned garbage names), default to everyone
             if (Object.keys(newSplits).length === 0) {
                 members.forEach(m => newSplits[m.id] = 1);
             }
        } else {
             members.forEach(m => newSplits[m.id] = 1);
        }
        setSplitData(newSplits);
        
        setActiveTab('manual'); // Switch to manual for review
      } else {
        setAiError("Couldn't understand that. Please try rephrasing.");
      }
    } catch (e) {
      setAiError("AI service currently unavailable.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      description,
      amount: parseFloat(amount),
      payerId,
      category,
      splitType,
      splits: splitData, // In a real app, normalize this based on splitType
      date: new Date().toISOString(),
      isRecurring: false
    });
    // Reset and close
    setDescription('');
    setAmount('');
    setAiInput('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {activeTab === 'ai' && <Sparkles size={18} />}
            Add Expense
          </h2>
          <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded-full transition"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button 
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'manual' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Manual Entry
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 text-sm font-medium transition flex justify-center items-center gap-2 ${activeTab === 'ai' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Sparkles size={16} />
            Ask AI
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'ai' ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Describe the expense</label>
              <textarea 
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                rows={4}
                placeholder="e.g., Dinner at Mario's for $85 paid by Alice, excluding John"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
              />
              {aiError && <p className="text-red-500 text-sm">{aiError}</p>}
              <button 
                onClick={handleAiParse}
                disabled={isAiLoading || !aiInput.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition flex justify-center items-center gap-2"
              >
                {isAiLoading ? "Analyzing..." : "Auto-Fill Form"}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                Powered by Gemini 2.5 Flash
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                <input 
                  required
                  type="text" 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full border-b border-gray-300 pb-2 focus:border-indigo-600 outline-none text-lg font-medium placeholder-gray-300"
                  placeholder="What was it for?"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-0 bottom-2 text-gray-500">$</span>
                    <input 
                      required
                      type="number" 
                      min="0.01" 
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full border-b border-gray-300 pb-2 pl-4 focus:border-indigo-600 outline-none text-lg font-medium placeholder-gray-300"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="flex-1">
                   <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Category</label>
                   <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full border-b border-gray-300 pb-2 bg-transparent focus:border-indigo-600 outline-none text-base"
                   >
                     {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Paid By</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {members.map(member => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setPayerId(member.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition ${payerId === member.id ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <div className="w-5 h-5 rounded-full bg-gray-300 overflow-hidden">
                        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                      </div>
                      {member.name}
                      {payerId === member.id && <CheckCircle size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Split</label>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Involved Members</span>
                        <span className="text-xs text-indigo-600 font-medium cursor-pointer" onClick={() => {
                            const all: any = {};
                            members.forEach(m => all[m.id] = 1);
                            setSplitData(all);
                        }}>Select All</span>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                        {members.map(member => (
                            <div key={member.id} className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={!!splitData[member.id]}
                                        onChange={(e) => {
                                            const newSplits = { ...splitData };
                                            if (e.target.checked) newSplits[member.id] = 1;
                                            else delete newSplits[member.id];
                                            setSplitData(newSplits);
                                        }}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                    />
                                    <span className="text-sm text-gray-700">{member.name}</span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition mt-2"
              >
                Save Expense
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddExpenseModal;

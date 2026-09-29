import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Sparkles, User, Delete, ArrowRight } from 'lucide-react';
import { audio } from '../services/audio';

export const LoginScreen: React.FC = () => {
  const { login, publicChildren, familyName } = useAuth();
  const [activeTab, setActiveTab] = useState<'child' | 'parent'>('child');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleKeypadPress = (digit: string) => {
    audio.playTap();
    if (pin.length < 8) {
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    audio.playTap();
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    audio.playTap();
    setPin('');
  };

  const handleChildSelect = (childId: string) => {
    audio.playTap();
    setSelectedChildId(childId);
    setPin('');
    setError(null);
  };

  const handleBackToChildren = () => {
    audio.playTap();
    setSelectedChildId(null);
    setPin('');
    setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) return;
    setError(null);
    setLoading(true);

    try {
      if (activeTab === 'child') {
        if (!selectedChildId) {
          setError('נא לבחור ילד');
          setLoading(false);
          return;
        }
        await login('child', pin, selectedChildId);
        audio.playApproval();
      } else {
        await login('parent', pin);
        audio.playApproval();
      }
    } catch (err: any) {
      audio.playReject();
      setError(err.message || 'קוד שגוי, נסו שוב');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const selectedChild = publicChildren.find((c) => c.id === selectedChildId);

  return (
    <div className="flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-700 via-indigo-600 to-gold-400 p-0.5 shadow-xl shadow-purple-900/50">
          <div className="flex h-full w-full items-center justify-center rounded-2xl bg-night-950">
            <span className="text-2xl font-bold font-cinzel text-gold-400">T+</span>
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-gold-300 font-cinzel tracking-wider">
          Time+
        </h1>
        <p className="mt-1 text-sm text-purple-200/80 font-alef">{familyName} · אקדמיית הזמן</p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-sm rounded-3xl bg-night-900/90 border border-purple-500/30 p-6 backdrop-blur-xl shadow-2xl shadow-purple-950/60">
        {/* Role Toggle Tabs */}
        <div className="flex rounded-2xl bg-night-950/80 p-1 mb-6 border border-purple-500/20">
          <button
            type="button"
            onClick={() => {
              audio.playTap();
              setActiveTab('child');
              setSelectedChildId(null);
              setPin('');
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'child'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-purple-300/70 hover:text-purple-200'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>ילדים</span>
          </button>
          <button
            type="button"
            onClick={() => {
              audio.playTap();
              setActiveTab('parent');
              setSelectedChildId(null);
              setPin('');
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'parent'
                ? 'bg-gradient-to-r from-amber-600 to-gold-600 text-white shadow-md'
                : 'text-purple-300/70 hover:text-purple-200'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>הורים</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-950/80 border border-red-700/60 p-3 text-center text-xs text-red-200 animate-shake">
            {error}
          </div>
        )}

        {/* TAB 1: CHILD LOGIN */}
        {activeTab === 'child' && (
          <div>
            {!selectedChildId ? (
              // Child Selector
              <div className="space-y-3">
                <p className="text-center text-xs font-semibold text-purple-300 mb-3">
                  מי נכנס לאקדמיה?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {publicChildren.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => handleChildSelect(child.id)}
                      className="group flex flex-col items-center justify-center p-4 rounded-2xl bg-night-950/60 hover:bg-night-850 border border-purple-500/20 hover:border-purple-400/50 transition-all active:scale-95 shadow-md"
                    >
                      <div
                        className="h-14 w-14 rounded-full flex items-center justify-center mb-2.5 border-2 shadow-lg transition-transform group-hover:scale-105"
                        style={{
                          borderColor: child.color,
                          backgroundColor: `${child.color}20`,
                        }}
                      >
                        <User className="h-7 w-7" style={{ color: child.color }} />
                      </div>
                      <span className="font-bold text-base text-purple-100 group-hover:text-gold-300">
                        {child.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Selected Child PIN entry
              <div>
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={handleBackToChildren}
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-200"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>החלף ילד</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gold-300">
                      {selectedChild?.name}
                    </span>
                    <div
                      className="h-5 w-5 rounded-full border"
                      style={{ backgroundColor: selectedChild?.color }}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-center gap-3 my-2">
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={`h-4 w-4 rounded-full transition-all duration-200 ${
                          pin.length > idx
                            ? 'bg-gold-400 scale-125 shadow-glow shadow-gold-500/50'
                            : 'bg-night-950 border border-purple-500/40'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleKeypadPress(digit)}
                      className="h-14 rounded-2xl bg-night-950/80 hover:bg-night-800 text-xl font-bold font-cinzel text-purple-100 border border-purple-500/20 active:scale-95 transition shadow-sm"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleClear}
                    className="h-14 rounded-2xl bg-night-950/40 hover:bg-night-800 text-xs font-semibold text-purple-400 active:scale-95 transition"
                  >
                    נקה
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-14 rounded-2xl bg-night-950/80 hover:bg-night-800 text-xl font-bold font-cinzel text-purple-100 border border-purple-500/20 active:scale-95 transition shadow-sm"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="h-14 rounded-2xl bg-night-950/40 hover:bg-night-800 flex items-center justify-center text-purple-400 active:scale-95 transition"
                  >
                    <Delete className="h-5 w-5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={loading || pin.length < 4}
                  className="w-full py-3 rounded-2xl font-bold text-night-950 bg-gradient-to-r from-gold-400 to-amber-400 hover:from-gold-300 hover:to-amber-300 active:scale-95 transition-all shadow-md shadow-gold-500/30 text-sm disabled:opacity-40"
                >
                  {loading ? 'מתחבר...' : 'כניסה לאקדמיה'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PARENT LOGIN */}
        {activeTab === 'parent' && (
          <div>
            <p className="text-center text-xs font-semibold text-purple-300 mb-3">
              הזן קוד הורים סודי
            </p>

            <div className="mb-4">
              <div className="flex justify-center gap-3 my-2">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`h-4 w-4 rounded-full transition-all duration-200 ${
                      pin.length > idx
                        ? 'bg-amber-400 scale-125 shadow-glow shadow-amber-500/50'
                        : 'bg-night-950 border border-amber-500/40'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="h-14 rounded-2xl bg-night-950/80 hover:bg-night-800 text-xl font-bold font-cinzel text-purple-100 border border-purple-500/20 active:scale-95 transition shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="h-14 rounded-2xl bg-night-950/40 hover:bg-night-800 text-xs font-semibold text-purple-400 active:scale-95 transition"
              >
                נקה
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-14 rounded-2xl bg-night-950/80 hover:bg-night-800 text-xl font-bold font-cinzel text-purple-100 border border-purple-500/20 active:scale-95 transition shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-14 rounded-2xl bg-night-950/40 hover:bg-night-800 flex items-center justify-center text-purple-400 active:scale-95 transition"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading || pin.length < 4}
              className="w-full py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 active:scale-95 transition-all shadow-md shadow-purple-600/30 text-sm disabled:opacity-40"
            >
              {loading ? 'מאמת...' : 'כניסה לחדר המנהלים'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

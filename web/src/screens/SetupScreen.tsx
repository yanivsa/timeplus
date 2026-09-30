import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { Sparkles, Shield, UserPlus, Trash2, ArrowLeft, Wand2 } from 'lucide-react';
import { audio } from '../services/audio';

export const SetupScreen: React.FC = () => {
  const { checkStatus, refreshUser } = useAuth();
  const [familyName, setFamilyName] = useState('המשפחה שלנו');
  const [parentPin, setParentPin] = useState('');
  const [parentPinConfirm, setParentPinConfirm] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [children, setChildren] = useState([
    { name: 'אורי', pin: '', color: '#38bdf8', avatar: 'wand' },
    { name: 'איתן', pin: '', color: '#10b981', avatar: 'potion' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addChild = () => {
    audio.playTap();
    setChildren([
      ...children,
      {
        name: '',
        pin: '',
        color: '#f5c842',
        avatar: 'book',
      },
    ]);
  };

  const removeChild = (index: number) => {
    audio.playTap();
    if (children.length <= 1) return;
    setChildren(children.filter((_, i) => i !== index));
  };

  const updateChild = (index: number, field: string, value: string) => {
    const updated = [...children];
    (updated[index] as any)[field] = value;
    setChildren(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    audio.playTap();
    setError(null);

    if (parentPin.length < 4) {
      setError('קוד הורים חייב להכיל לפחות 4 ספרות');
      return;
    }
    if (parentPin !== parentPinConfirm) {
      setError('אימות קוד ההורים אינו תואם');
      return;
    }

    for (const c of children) {
      if (!c.name.trim()) {
        setError('נא למלא שמות לכל הילדים');
        return;
      }
      if (c.pin && c.pin.length < 4) {
        setError(`קוד הכניסה של ${c.name} חייב להכיל לפחות 4 ספרות`);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; message?: string }>('/api/setup/init', {
        method: 'POST',
        body: JSON.stringify({
          familyName,
          parentPin,
          setupSecret: setupSecret || undefined,
          children: children.map((c) => ({
            name: c.name.trim(),
            pin: c.pin || '1234',
            color: c.color,
            avatar: c.avatar,
          })),
        }),
      });

      if (res.success) {
        audio.playApproval();
        await checkStatus();
        await refreshUser();
      }
    } catch (err: any) {
      setError(err.message || 'אתחול נכשל');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl bg-night-900/90 border border-purple-500/30 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-purple-950/60">
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-amber-400 p-0.5 shadow-lg shadow-purple-600/30">
            <div className="flex h-full w-full items-center justify-center rounded-2xl bg-night-950">
              <Wand2 className="h-8 w-8 text-gold-400 animate-pulse" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gold-300 font-cinzel">
            הקמת אקדמיית הזמן
          </h1>
          <p className="mt-2 text-sm text-purple-200/80 font-alef">
            ברוכים הבאים ל-Time+! בואו נגדיר את המשפחה ונתחיל לצבור זמן מסך בקסם.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-950/60 border border-red-700/60 p-3.5 text-center text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Family Name */}
          <div>
            <label className="block text-xs font-semibold text-purple-200 mb-1.5">
              שם המשפחה
            </label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
              className="w-full rounded-xl bg-night-950/80 border border-purple-500/30 px-4 py-3 text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 text-sm"
              placeholder="למשל: משפחת ישראלי"
            />
          </div>

          {/* Parent PIN */}
          <div className="p-4 rounded-2xl bg-night-850/80 border border-gold-500/20 space-y-4">
            <div className="flex items-center gap-2 text-gold-400 text-sm font-semibold">
              <Shield className="h-4 w-4" />
              <span>הגדרת קוד הורים סודי</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-purple-300 mb-1">קוד הורים (4+ ספרות)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={parentPin}
                  onChange={(e) => setParentPin(e.target.value)}
                  required
                  maxLength={8}
                  className="w-full rounded-xl bg-night-950 border border-purple-500/30 px-3.5 py-2.5 text-center text-purple-100 font-mono tracking-widest text-lg focus:outline-none focus:border-gold-400"
                  placeholder="••••"
                />
              </div>
              <div>
                <label className="block text-xs text-purple-300 mb-1">אימות קוד הורים</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={parentPinConfirm}
                  onChange={(e) => setParentPinConfirm(e.target.value)}
                  required
                  maxLength={8}
                  className="w-full rounded-xl bg-night-950 border border-purple-500/30 px-3.5 py-2.5 text-center text-purple-100 font-mono tracking-widest text-lg focus:outline-none focus:border-gold-400"
                  placeholder="••••"
                />
              </div>
            </div>
          </div>

          {/* Children Setup */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-purple-200">
                ילדי האקדמיה ({children.length})
              </label>
              <button
                type="button"
                onClick={addChild}
                className="flex items-center gap-1 text-xs font-semibold text-gold-400 hover:text-gold-300 py-1 px-2.5 rounded-lg bg-gold-500/10 border border-gold-500/20"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>הוסף ילד</span>
              </button>
            </div>

            {children.map((child, index) => (
              <div
                key={index}
                className="p-3.5 rounded-2xl bg-night-950/70 border border-purple-500/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
              >
                <div className="flex-1">
                  <input
                    type="text"
                    value={child.name}
                    onChange={(e) => updateChild(index, 'name', e.target.value)}
                    placeholder="שם הילד"
                    required
                    className="w-full rounded-xl bg-night-900 border border-purple-500/30 px-3 py-2 text-sm text-purple-100 focus:outline-none focus:border-gold-400"
                  />
                </div>

                <div className="w-full sm:w-32">
                  <input
                    type="password"
                    inputMode="numeric"
                    value={child.pin}
                    onChange={(e) => updateChild(index, 'pin', e.target.value)}
                    placeholder="קוד PIN (4 ספרות)"
                    maxLength={6}
                    className="w-full rounded-xl bg-night-900 border border-purple-500/30 px-3 py-2 text-center text-sm font-mono tracking-wider text-purple-100 focus:outline-none focus:border-gold-400"
                  />
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <div className="flex items-center gap-1.5">
                    {['#38bdf8', '#10b981', '#f5c842', '#a855f7'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateChild(index, 'color', c)}
                        className={`h-6 w-6 rounded-full border-2 transition ${
                          child.color === c ? 'border-white scale-110' : 'border-transparent opacity-60'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  {children.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeChild(index)}
                      className="p-1.5 text-red-400/60 hover:text-red-400 transition"
                      title="הסר"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-night-950 bg-gradient-to-r from-gold-400 via-gold-300 to-amber-400 hover:from-gold-300 hover:to-amber-300 active:scale-95 transition-all shadow-lg shadow-gold-500/30 text-base flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>מאתחל את האקדמיה...</span>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>התחל את מסע הקסם</span>
                <ArrowLeft className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

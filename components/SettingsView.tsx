'use client';

import React, { useState } from 'react';
import { useApp, CURRENCY_SYMBOLS } from '@/lib/store';
import { BaseCurrency } from '@/types';
import { Settings, User, Globe, Shield, Eye, EyeOff, CheckCircle2, Camera, Upload, Trash2, Loader2, AlertTriangle, AlertCircle, X, Headphones } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, setUser, theme, setTheme, baseCurrency, setBaseCurrency, language, setLanguage, addAuditLog, deleteAccount, setIsAuthModalOpen, setAuthModalMode } = useApp();
  const [success, setSuccess] = useState(false);
  const [currencyLoading, setCurrencyLoading] = useState(false);
  const [currencyMsg, setCurrencyMsg] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string>(user.avatarUrl || '');

  const openTawkChat = () => {
    if (typeof window !== 'undefined' && (window as any).Tawk_API) {
      if (typeof (window as any).Tawk_API.showWidget === 'function') {
        (window as any).Tawk_API.showWidget();
      }
      if (typeof (window as any).Tawk_API.maximize === 'function') {
        (window as any).Tawk_API.maximize();
      }
    } else {
      window.open('https://embed.tawk.to/6ad6e53b59640134c789eb9b/default', '_blank');
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleDeleteAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    if (!deleteConfirmChecked) {
      setDeleteError('Please check the confirmation box to acknowledge permanent account deletion.');
      return;
    }
    if (deleteEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      setDeleteError('The email address entered does not match the currently authenticated account.');
      return;
    }

    setIsDeleting(true);
    setTimeout(() => {
      const res = deleteAccount(deleteEmail, deletePassword);
      setIsDeleting(false);
      if (res.success) {
        setDeleteSuccess(true);
        setTimeout(() => {
          setShowDeleteModal(false);
          setIsAuthModalOpen(true);
          setAuthModalMode('signin');
        }, 2000);
      } else {
        setDeleteError(res.error || 'Failed to delete account.');
      }
    }, 800);
  };

  const handleCurrencyChange = (newCurr: BaseCurrency) => {
    setCurrencyLoading(true);
    setCurrencyMsg(`Fetching institutional exchange rates for ${newCurr}...`);
    setTimeout(() => {
      setBaseCurrency(newCurr);
      setCurrencyLoading(false);
      setCurrencyMsg(`Base currency successfully updated to ${newCurr}`);
      addAuditLog('BASE_CURRENCY_UPDATED', `Base currency updated to ${newCurr} with live exchange rates`, 'SUCCESS');
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCurrencyMsg('');
      }, 3500);
    }, 700);
  };

  const togglePrivacyMode = () => {
    setUser(prev => ({
      ...prev,
      privacyMode: !prev.privacyMode
    }));
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        setUser(prev => ({ ...prev, avatarUrl: result }));
        addAuditLog('PROFILE_PICTURE_UPDATED', 'User profile picture updated successfully from device gallery.', 'SUCCESS');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview('');
    setUser(prev => ({ ...prev, avatarUrl: '' }));
    addAuditLog('PROFILE_PICTURE_REMOVED', 'User profile picture removed.', 'SUCCESS');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-4xl mx-auto">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Preferences & Settings</h1>
          <p className="text-xs text-slate-400 mt-1">Configure appearance, privacy mode, base currency, language, and user profile.</p>
        </div>

        {success && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Preferences successfully updated and persisted.</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Profile Picture Management */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-14 h-14 rounded-2xl object-cover border border-blue-500/40 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                    <User className="w-7 h-7" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Profile Picture</h3>
                <p className="text-xs text-slate-400">Upload or change your institutional avatar from device gallery</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-lg shadow-blue-600/20 flex items-center gap-1.5 transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
              {user.avatarUrl && (
                <button
                  onClick={handleRemoveAvatar}
                  className="bg-slate-900 hover:bg-rose-500/10 text-rose-400 p-2 rounded-xl border border-slate-800 transition-colors"
                  title="Remove Photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Privacy Mode Toggle */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user.privacyMode ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-900 text-slate-400'}`}>
                {user.privacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Privacy Mode</h3>
                <p className="text-xs text-slate-400">Hide wallet balances, portfolio values, and transaction amounts with ••••••••</p>
              </div>
            </div>
            <button
              onClick={togglePrivacyMode}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                user.privacyMode 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {user.privacyMode ? 'ON (Masked)' : 'OFF (Visible)'}
            </button>
          </div>

          {/* User Account Info & Editable Profile Name/Username */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                <span>Profile & Account Credentials</span>
              </h3>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded font-mono font-bold">Synchronized Live</span>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const usernameInput = (form.elements.namedItem('username') as HTMLInputElement).value.trim();
              if (usernameInput) {
                setUser(prev => ({ ...prev, username: usernameInput }));
                addAuditLog('PROFILE_NAME_UPDATED', `User updated profile name/username to ${usernameInput}`, 'SUCCESS');
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
              }
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Profile Name / Username</label>
                  <input
                    name="username"
                    defaultValue={user.username}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Email Address (Read-Only)</label>
                  <input
                    disabled
                    value={user.email}
                    className="w-full bg-slate-900/50 border border-slate-800/80 rounded-xl px-4 py-2.5 text-xs text-slate-400 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div className="text-[11px] text-slate-400 font-mono">
                  Role: <span className="text-emerald-400 font-bold uppercase">{user.role}</span> | Status: <span className="text-amber-400 font-bold uppercase">{user.accountStatus}</span>
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>

          {/* Theme */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Appearance & Theme</h3>
              <p className="text-xs text-slate-400">Select interface color palette</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('dark')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'}`}
              >
                Dark Charcoal
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${theme === 'light' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'}`}
              >
                Light
              </button>
            </div>
          </div>

          {/* Base Currency */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Base Currency (50 Supported)</h3>
                <p className="text-xs text-slate-400">Default fiat currency for portfolio reporting and valuation</p>
              </div>
              <div className="flex items-center gap-2">
                {currencyLoading && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                <select
                  value={baseCurrency}
                  disabled={currencyLoading}
                  onChange={(e) => handleCurrencyChange(e.target.value as BaseCurrency)}
                  className="bg-slate-900 border border-slate-800 text-white text-xs px-3 py-1.5 rounded-lg font-mono disabled:opacity-50"
                >
                  {(Object.keys(CURRENCY_SYMBOLS) as BaseCurrency[]).map(code => {
                    const item = CURRENCY_SYMBOLS[code];
                    return (
                      <option key={code} value={code}>
                        {code} — {item.name} ({item.symbol})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            {currencyMsg && (
              <p className="text-[11px] text-blue-400 font-mono animate-pulse">{currencyMsg}</p>
            )}
          </div>

          {/* Language */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Interface Language</h3>
              <p className="text-xs text-slate-400">Localization and regional terminology</p>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 text-white text-xs px-3 py-1.5 rounded-lg font-mono"
            >
              <option value="en">English (US)</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="pt">Português</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
            </select>
          </div>

          {/* Live Support (Tawk.to) Section */}
          <div className="bg-blue-950/20 p-5 rounded-xl border border-blue-900/40 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Live Customer Support (Tawk.to)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Connect instantly with a live support specialist for account assistance, trading queries, and wallet help.</p>
                </div>
              </div>
              <button
                onClick={openTawkChat}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 shrink-0"
              >
                <Headphones className="w-4 h-4" />
                <span>Open Live Chat</span>
              </button>
            </div>
          </div>

          {/* Delete Account Permanently Section */}
          <div className="bg-rose-950/20 p-5 rounded-xl border border-rose-900/40 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Delete Account Permanently</span>
                </h3>
                <p className="text-xs text-rose-200/70 mt-0.5">Permanently delete your exchange profile, institutional credentials, balances, and transaction history.</p>
              </div>
              <button
                onClick={() => {
                  setDeleteEmail('');
                  setDeletePassword('');
                  setDeleteConfirmChecked(false);
                  setDeleteError('');
                  setDeleteSuccess(false);
                  setShowDeleteModal(true);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account Permanently</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-400">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
                <h2 className="text-lg font-bold">Delete Account Permanently</h2>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deleteSuccess ? (
              <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-4 rounded-xl text-xs font-bold text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                <p className="text-sm">“Your account has been permanently deleted successfully.”</p>
                <p className="text-[11px] text-slate-300">Redirecting to sign-in screen...</p>
              </div>
            ) : (
              <form onSubmit={handleDeleteAccountSubmit} className="space-y-4">
                <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl text-xs text-rose-200 leading-relaxed space-y-1">
                  <p className="font-bold">Warning: This action is permanent and cannot be undone.</p>
                  <p className="text-[11px] opacity-90">All associated personal records, wallet balances, trading history, and institutional profile data will be permanently destroyed from the exchange servers and local storage.</p>
                </div>

                {deleteError && (
                  <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Registered Email Address</label>
                  <input
                    type="email"
                    required
                    value={deleteEmail}
                    onChange={(e) => setDeleteEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Account Password</label>
                  <input
                    type="password"
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="confirmDelete"
                    checked={deleteConfirmChecked}
                    onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                    className="mt-0.5 rounded border-slate-800 bg-slate-950 text-rose-600 focus:ring-rose-500"
                  />
                  <label htmlFor="confirmDelete" className="text-xs text-slate-300 cursor-pointer select-none">
                    I confirm that I want to permanently delete my account and understand that all data will be destroyed forever.
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDeleting || !deleteConfirmChecked}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2"
                  >
                    {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Permanently Delete Account</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

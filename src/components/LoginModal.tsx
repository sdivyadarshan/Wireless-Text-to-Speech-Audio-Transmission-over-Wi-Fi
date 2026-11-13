import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  UserCheck,
  Shield,
  X,
  Lock,
  Mail,
  User as UserIcon,
  Sparkles,
  CheckCircle2,
  Building
} from 'lucide-react';
import { Role, User } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onShowToast
}) => {
  const [selectedRole, setSelectedRole] = useState<Role>('Administrator');
  const [name, setName] = useState('Dr. S. Ramanathan');
  const [email, setEmail] = useState('admin@college.edu');
  const [password, setPassword] = useState('••••••••');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleRolePreset = (role: Role) => {
    setSelectedRole(role);
    if (role === 'Administrator') {
      setName('Dr. S. Ramanathan');
      setEmail('admin@college.edu');
    } else if (role === 'Staff') {
      setName('Prof. Ananya Sen');
      setEmail('staff.ece@college.edu');
    } else {
      setName('Campus Dispatch Operator');
      setEmail('operator@campus-pa.edu');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole, name, email })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      onLoginSuccess(data.user);
      onShowToast('success', 'Authenticated', `Welcome back, ${data.user.name} (${data.user.role})`);
      onClose();
    } catch (err: any) {
      onShowToast('error', 'Login Error', err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-600/20 mx-auto flex items-center justify-center">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight pt-2">
            Authorized System Access
          </h3>
          <p className="text-xs text-slate-400">
            Wireless Text-to-Speech Audio Transmission System
          </p>
        </div>

        {/* Quick Role Selection Cards */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">Select Access Role:</label>
          <div className="grid grid-cols-3 gap-2">
            {(['Administrator', 'Staff', 'Operator'] as Role[]).map((r) => {
              const isSelected = selectedRole === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRolePreset(r)}
                  className={`p-2.5 rounded-lg border text-center text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name / Official ID</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Campus Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
          >
            {isLoading ? 'Authenticating...' : `Sign in as ${selectedRole}`}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

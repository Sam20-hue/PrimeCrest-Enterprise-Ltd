import { useState, useEffect } from 'react';
import { useSiteData } from '../../../context/SiteDataContext';
import { mysqlService } from '../../../services/mysqlService';

interface AdminLoginProps {
  onLogin: () => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const { settings } = useSiteData();
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<'password' | 'setup' | 'verify'>('password');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [is2faSetup, setIs2faSetup] = useState(false);
  const [is2faChecking, setIs2faChecking] = useState(true);

  useEffect(() => {
    const checkSavedState = async () => {
      setIs2faChecking(true);
      const email = settings.adminEmail || 'samsonakula3@gmail.com';
      const status = await mysqlService.check2fa(email);
      const savedLocal = localStorage.getItem('pc_2fa_setup') === 'true';
      
      if (status.ok && (status.data?.setup || status.data?.enabled)) {
        setIs2faSetup(true);
        localStorage.setItem('pc_2fa_setup', 'true');
      } else if (!status.ok && savedLocal) {
        // fallback when backend temporarily unreachable
        setIs2faSetup(true);
        setError('2FA server unavailable, using local setup state fallback.');
      } else {
        setIs2faSetup(false);
        if (!savedLocal) {
          localStorage.removeItem('pc_2fa_setup');
        }
      }
      setIs2faChecking(false);
    };
    checkSavedState();
  }, [settings.adminEmail]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (is2faChecking) {
      setError('Checking 2FA status, please wait...');
      return;
    }

    if (password !== (settings.adminPassword || 'admin123')) {
      setError('Incorrect password. Please try again.');
      return;
    }

    // Password correct, move to 2FA
    const localFlag = localStorage.getItem('pc_2fa_setup') === 'true';
    if (is2faSetup || localFlag) {
      // User has already set up 2FA, ask for token
      setStep('verify');
      setStatus('Enter the 6-digit code from your authenticator app.');
    } else {
      // First time, setup 2FA
      await setupNewTotp();
    }
  };

  const setupNewTotp = async () => {
    setStatus('Generating QR code...');
    const email = settings.adminEmail || 'samsonakula3@gmail.com';
    const response = await mysqlService.setup2fa(email);

    if (response.ok && response.data) {
      setQrCode(response.data.qrCode);
      setSecret(response.data.secret);
      setStep('setup');
      setStatus('');
    } else {
      setError(response.error || 'Failed to setup 2FA.');
    }
  };

  const handleSetupConfirm = async () => {
    if (!token) {
      setError('Please enter the 6-digit code from your app.');
      return;
    }

    setStatus('Verifying token...');
    const email = settings.adminEmail || 'samsonakula3@gmail.com';
    const response = await mysqlService.verify2fa(email, token);

    if (response.ok) {
      localStorage.setItem('pc_2fa_setup', 'true');
      setIs2faSetup(true);
      setError('');
      onLogin();
    } else {
      setError(response.error || 'Invalid token. Please try again.');
      setStatus('');
    }
  };

  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Please enter the 6-digit code from your authenticator app.');
      return;
    }

    setStatus('Verifying token...');
    const email = settings.adminEmail || 'samsonakula3@gmail.com';
    const response = await mysqlService.verify2fa(email, token);

    if (response.ok) {
      localStorage.setItem('pc_2fa_setup', 'true');
      setIs2faSetup(true);
      setError('');
      onLogin();
    } else {
      setError(response.error || 'Invalid token. Please try again.');
      setStatus('');
    }
  };

  const handleReset2fa = async () => {
    // Force restarting 2FA setup and getting new QR code
    localStorage.removeItem('pc_2fa_setup');
    setIs2faSetup(false);
    setToken('');
    setStatus('Resetting 2FA and generating new QR code...');
    await setupNewTotp();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 border border-gray-800">
        <div className="text-center mb-8">
          <img
            src={settings.logoUrl}
            alt="Logo"
            className="h-16 w-auto object-contain mx-auto mb-4"
          />
          <h1 className="text-xl font-black text-white">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">PRIMECREST ENTERPRISE LTD</p>
        </div>

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {is2faChecking && (
              <p className="text-gray-400 text-xs text-center">Checking existing 2FA setup...</p>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 text-sm"
                placeholder="Enter admin password"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors cursor-pointer"
            >
              Continue
            </button>
          </form>
        )}

        {step === 'setup' && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-4">
                Scan this QR code with <strong>Google Authenticator</strong>, <strong>Authy</strong>, or <strong>Microsoft Authenticator</strong>:
              </p>
              {qrCode && (
                <img src={qrCode} alt="QR Code" className="w-48 h-48 mx-auto border-2 border-gray-700 rounded-lg p-2 bg-white" />
              )}
              <p className="text-xs text-gray-600 mt-3">Manual Key: {secret}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Verify with 6-digit code</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 text-sm text-center tracking-widest"
                placeholder="000000"
              />
            </div>
            <button
              type="button"
              onClick={handleSetupConfirm}
              className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors cursor-pointer"
            >
              Confirm Setup
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <form onSubmit={handleVerifyToken} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Authenticator Code</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 text-sm text-center tracking-widest"
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors cursor-pointer"
              >
                Verify and Access
              </button>
            </form>
            <button
              type="button"
              onClick={handleReset2fa}
              className="w-full py-2 border border-red-500 text-red-500 font-semibold rounded-lg hover:bg-red-500 hover:text-white transition-colors"
            >
              Reset 2FA and Re-scan QR
            </button>
          </div>
        )}

        {status && <p className="text-green-400 text-xs font-medium mt-3 text-center">{status}</p>}
        {error && <p className="text-red-400 text-xs font-medium mt-3 text-center">{error}</p>}
        <p className="text-gray-600 text-xs text-center mt-6">
          Email: samsonakula3@gmail.com (change in Settings)
        </p>
      </div>
    </div>
  );
}
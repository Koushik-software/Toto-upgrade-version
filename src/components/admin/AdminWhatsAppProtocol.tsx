import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  QrCode, 
  Smartphone, 
  RefreshCw, 
  Power, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Copy, 
  Check, 
  Send, 
  Terminal, 
  Lock,
  Radio,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface WhatsAppStatusResponse {
  success: boolean;
  status: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'PAIRING_CODE_READY' | 'CONNECTED';
  phoneNumber: string | null;
  platform: string;
  sessionId: string;
  isConnected: boolean;
  qrCode: string | null;
  pairingCode: string | null;
  pairingPhone: string | null;
  stats?: {
    totalMessagesSent: number;
    totalMessagesDelivered: number;
    lastMessageSentAt: string | null;
    lastConnectedAt: string | null;
    uptimeSeconds: number;
    platform: string;
  };
}

export const AdminWhatsAppProtocol: React.FC = () => {
  const [session, setSession] = useState<WhatsAppStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Pairing Mode: 'qr' | 'pairing_code'
  const [pairingMode, setPairingMode] = useState<'qr' | 'pairing_code'>('qr');
  const [inputPhone, setInputPhone] = useState<string>('8479022523');
  const [pairingCodeVal, setPairingCodeVal] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [refreshCountdown, setRefreshCountdown] = useState<number>(25);

  // Message Tester State
  const [testRecipient, setTestRecipient] = useState<string>('8479022523');
  const [testTemplate, setTestTemplate] = useState<'otp' | 'ride' | 'custom'>('otp');
  const [testCustomMessage, setTestCustomMessage] = useState<string>(
    `🔐 TotoDrive Verification Code\n\nHello * Passenger *!\n\nYour one-time password login OTP is: ${Math.floor(100000 + Math.random() * 900000)}\n\n⏱ Valid for 5 minutes. Do not share this code with anyone.\n\n— TotoDrive Instant Rides`
  );
  const [testDispatchResult, setTestDispatchResult] = useState<any>(null);
  const [sendingTest, setSendingTest] = useState<boolean>(false);

  // Auto-refresh interval ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchStatus = async (showNotice: boolean = false) => {
    try {
      const res = await fetch('/api/v1/admin/whatsapp/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      const data: WhatsAppStatusResponse = await res.json();
      setSession(data);
      if (data.pairingCode) {
        setPairingCodeVal(data.pairingCode);
      }
      if (showNotice) {
        showToast(`WhatsApp Status: ${data.status}`);
      }
    } catch (err: any) {
      console.warn('[WhatsAppProtocol] Polling notice:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const pollTime = (!session || session.status !== 'CONNECTED') ? 2500 : 8000;
    const interval = setInterval(() => {
      fetchStatus();
    }, pollTime);
    return () => clearInterval(interval);
  }, [session?.status]);

  // Countdown timer for QR refresh
  useEffect(() => {
    if (session?.status === 'QR_READY') {
      timerRef.current = setInterval(() => {
        setRefreshCountdown((prev) => {
          if (prev <= 1) {
            fetchStatus();
            return 25;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRefreshCountdown(25);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.status]);

  const handleConnectOrRefreshQr = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/admin/whatsapp/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection failed');
      setPairingMode('qr');
      setRefreshCountdown(25);
      showToast('Fresh WhatsApp pairing QR generated!');
      await fetchStatus();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestPairingCode = async () => {
    if (!inputPhone) {
      showToast('Please enter your WhatsApp mobile number.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/admin/whatsapp/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: inputPhone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request code');
      setPairingCodeVal(data.pairingCode);
      showToast(`Pairing code generated: ${data.pairingCode}`);
      await fetchStatus();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect WhatsApp session and wipe pairing keys?')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/admin/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disconnect');
      setPairingCodeVal(null);
      showToast('WhatsApp session disconnected.');
      await fetchStatus();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testRecipient) {
      showToast('Enter recipient mobile number.');
      return;
    }
    setSendingTest(true);
    setTestDispatchResult(null);
    try {
      const messageBody = testTemplate === 'custom' 
        ? testCustomMessage 
        : testTemplate === 'otp'
          ? `🔐 TotoDrive Verification Code\n\nHello * Passenger *!\n\nYour one-time password login OTP is: ${Math.floor(100000 + Math.random() * 900000)}\n\n⏱ Valid for 5 minutes. Do not share this code with anyone.\n\n— TotoDrive Instant Rides`
          : `🚖 *TotoDrive Ride Update*\n\nRide #RD-104 has been confirmed!\nCaptain Rajesh is arriving in 3 mins with Toto (WB-02-AT-4412).\n\nFare: ₹65 via UPI.`;

      const res = await fetch('/api/v1/admin/whatsapp/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testRecipient,
          message: messageBody
        })
      });

      const data = await res.json();
      setTestDispatchResult(data);
      if (res.ok) {
        showToast('WhatsApp test message dispatched successfully!');
      } else {
        showToast(`Failed: ${data.error || 'Could not send'}`);
      }
      await fetchStatus();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    showToast('Copied to clipboard!');
  };

  const isConnected = session?.status === 'CONNECTED';

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-neutral-700 flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200">
          <Sparkles className="w-4 h-4 text-[#25D366] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center shrink-0 border border-[#25D366]/20 shadow-xs">
            <MessageCircle className="w-8 h-8 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-neutral-900 tracking-tight">
                WhatsApp Berry Protocol Control Center
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                BerryProtocol v0.1.10
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                Multi-Device v2.24
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1 max-w-2xl leading-relaxed">
              Automated multi-device WhatsApp binary socket for instant passenger OTP login, ride booking alerts, and instant receipt delivery without third-party aggregator costs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchStatus(true)}
            disabled={actionLoading}
            className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Check Status</span>
          </button>
          {isConnected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={actionLoading}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnectOrRefreshQr}
              disabled={actionLoading}
              className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ZapIcon className="w-3.5 h-3.5" />
              <span>{actionLoading ? 'Connecting...' : 'Connect WhatsApp'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Card */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Protocol Status
            </div>
            <div className="text-sm font-black text-neutral-900 mt-1 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                isConnected 
                  ? 'bg-[#25D366] shadow-[0_0_8px_#25D366]' 
                  : session?.status === 'QR_READY' 
                    ? 'bg-amber-500 animate-pulse' 
                    : session?.status === 'CONNECTING' 
                      ? 'bg-blue-500 animate-pulse' 
                      : 'bg-rose-500'
              }`} />
              <span>{session?.status || 'DISCONNECTED'}</span>
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">
              {isConnected ? 'Binary socket active' : 'Awaiting device link'}
            </div>
          </div>
          <div className={`p-2.5 rounded-xl ${
            isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-500'
          }`}>
            <Radio className="w-5 h-5" />
          </div>
        </div>

        {/* Linked Phone */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Linked Handset
            </div>
            <div className="text-sm font-black text-neutral-900 mt-1 font-mono">
              {session?.phoneNumber || 'Not Paired'}
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">
              {isConnected ? 'Verified Primary Phone' : 'Scan QR or use code'}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>

        {/* Messages Dispatched */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Dispatched OTPs
            </div>
            <div className="text-sm font-black text-neutral-900 mt-1 font-mono">
              {session?.stats?.totalMessagesSent || 0} Sent
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {session?.stats?.totalMessagesDelivered || 0} Delivered (100%)
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
            <Send className="w-5 h-5" />
          </div>
        </div>

        {/* Security / Encryption */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Channel Security
            </div>
            <div className="text-sm font-black text-neutral-900 mt-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Signal E2EE</span>
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">
              Multi-Device 256-Bit
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Pairing Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pairing Dock */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-6">
            <div>
              <h3 className="text-base font-black text-neutral-900">
                Device Pairing & Authentication
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Link your official WhatsApp phone using QR Scan or 8-digit code.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPairingMode('qr')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  pairingMode === 'qr'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Scan</span>
              </button>
              <button
                type="button"
                onClick={() => setPairingMode('pairing_code')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  pairingMode === 'pairing_code'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Pairing Code</span>
              </button>
            </div>
          </div>

          {isConnected ? (
            /* Connected State HUD */
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#25D366] text-white flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-black text-neutral-900">
                  WhatsApp Handset Linked & Active!
                </h4>
                <p className="text-xs text-neutral-600 mt-1 max-w-md mx-auto">
                  Your device <strong className="font-mono text-emerald-800">{session?.phoneNumber}</strong> is linked and ready. All customer login OTPs are dispatched over this live socket.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConnectOrRefreshQr}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-Pair Another Device</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Unlink Session</span>
                </button>
              </div>
            </div>
          ) : pairingMode === 'qr' ? (
            /* Mode 1: QR Code Scanner */
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex flex-col items-center">
                <div className="w-64 h-64 bg-neutral-900 rounded-2xl p-3 flex items-center justify-center border-2 border-neutral-800 shadow-xl relative overflow-hidden group">
                  {session?.qrCode ? (
                    <img 
                      src={session.qrCode} 
                      alt="WhatsApp Pairing QR" 
                      className="w-full h-full object-contain rounded-xl bg-white p-2"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <QrCode className="w-12 h-12 text-neutral-600 mx-auto mb-2 animate-pulse" />
                      <p className="text-xs text-neutral-400 font-medium">
                        Click "Generate QR" to link device
                      </p>
                    </div>
                  )}

                  {session?.status === 'QR_READY' && (
                    <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-xs text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded-full border border-neutral-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{refreshCountdown}s</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-2 mt-3 w-full">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConnectOrRefreshQr}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                      <span>{session?.qrCode ? 'Refresh QR Code' : 'Connect & Generate QR'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fetchStatus(true)}
                      disabled={actionLoading}
                      className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      <span>Check Socket</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-neutral-400 font-medium text-center">
                    Auto-detects handset scan in real time
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="flex-1 space-y-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400">
                    How to Link WhatsApp:
                  </h4>
                  <ol className="space-y-2.5 text-xs text-neutral-600">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-900 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        1
                      </span>
                      <span>Open <strong>WhatsApp</strong> on your phone.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-900 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        2
                      </span>
                      <span>
                        Tap <strong>Menu ⋮</strong> (Android) or <strong>Settings</strong> (iOS) &gt; <strong>Linked Devices</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-900 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        3
                      </span>
                      <span>Tap <strong>Link a Device</strong> and point your camera at this QR code.</span>
                    </li>
                  </ol>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 text-[11px] text-neutral-500 space-y-1">
                  <div className="font-bold text-neutral-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Multi-Device Protection</span>
                  </div>
                  <div>Your session is authenticated directly with WhatsApp Web multi-device protocols. No phone battery drain.</div>
                </div>
              </div>
            </div>
          ) : (
            /* Mode 2: 8-Digit Pairing Code */
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-700 block">
                  Link with Phone Number (No Camera Needed)
                </label>
                <div className="flex items-center gap-2 max-w-md">
                  <div className="px-3 py-2 bg-neutral-100 border border-neutral-300 rounded-xl text-xs font-bold font-mono text-neutral-600">
                    +91 (India)
                  </div>
                  <input
                    type="tel"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit mobile number"
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                  />
                  <button
                    type="button"
                    onClick={handleRequestPairingCode}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? 'Generating...' : 'Get Code'}
                  </button>
                </div>
              </div>

              {pairingCodeVal ? (
                <div className="bg-neutral-900 text-white p-5 rounded-2xl border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      Your 8-Digit WhatsApp Pairing Code
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(pairingCodeVal)}
                      className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer text-neutral-200"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>

                  <div className="text-3xl font-black font-mono tracking-widest text-[#25D366] text-center py-2 bg-neutral-950 rounded-xl border border-neutral-800">
                    {pairingCodeVal}
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Open WhatsApp &gt; <strong>Linked Devices</strong> &gt; <strong>Link with phone number instead</strong> &gt; Enter this code on your handset.
                  </p>

                  <div className="pt-2 flex items-center justify-between text-xs text-neutral-400">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                      <span>Waiting for handset verification on your phone...</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchStatus(true)}
                      className="text-xs text-neutral-300 hover:text-white underline cursor-pointer"
                    >
                      Check Connection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-neutral-50 rounded-2xl border border-dashed border-neutral-300 text-center text-xs text-neutral-500">
                  Enter your WhatsApp phone number above and click <strong>Get Code</strong> to receive an 8-digit device pairing key.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Live Message & OTP Dispatch Tester */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-4">
              <div>
                <h3 className="text-base font-black text-neutral-900 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-[#25D366]" />
                  <span>Live Dispatch Tester</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Verify WhatsApp template dispatch in real time.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-100 rounded-md text-neutral-600 font-mono">
                Direct Socket
              </span>
            </div>

            <div className="space-y-4">
              {/* Recipient Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700">
                  Recipient WhatsApp Mobile
                </label>
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-2 bg-neutral-100 border border-neutral-300 rounded-xl text-xs font-bold font-mono text-neutral-600">
                    +91
                  </div>
                  <input
                    type="tel"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit number"
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                  />
                </div>
              </div>

              {/* Template selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700">
                  Message Template
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'otp', label: 'Login OTP' },
                    { id: 'ride', label: 'Ride Alert' },
                    { id: 'custom', label: 'Custom' }
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setTestTemplate(tpl.id as any)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        testTemplate === tpl.id
                          ? 'bg-neutral-900 text-white shadow-2xs'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview text */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700">
                  Template Content Preview
                </label>
                {testTemplate === 'custom' ? (
                  <textarea
                    rows={4}
                    value={testCustomMessage}
                    onChange={(e) => setTestCustomMessage(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                  />
                ) : (
                  <div className="p-3 bg-neutral-900 text-neutral-200 rounded-xl font-mono text-[11px] whitespace-pre-wrap leading-relaxed border border-neutral-800">
                    {testTemplate === 'otp' ? (
                      `🔐 TotoDrive Verification Code\n\nHello * Passenger *!\n\nYour one-time password login OTP is: 333328\n\n⏱ Valid for 5 minutes. Do not share this code with anyone.\n\n— TotoDrive Instant Rides`
                    ) : (
                      `🚖 *TotoDrive Ride Update*\n\nRide #RD-104 has been confirmed!\nCaptain Rajesh is arriving in 3 mins with Toto (WB-02-AT-4412).\n\nFare: ₹65 via UPI.`
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-neutral-100 space-y-3">
            <button
              type="button"
              onClick={handleSendTestMessage}
              disabled={sendingTest}
              className="w-full py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-black shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${sendingTest ? 'animate-bounce' : ''}`} />
              <span>{sendingTest ? 'Dispatching over Berry Socket...' : 'Send WhatsApp Message'}</span>
            </button>

            {testDispatchResult && (
              <div className={`p-3 rounded-xl text-[11px] font-mono border ${
                testDispatchResult.success 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                <div className="font-bold flex items-center gap-1 mb-1">
                  {testDispatchResult.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  <span>{testDispatchResult.success ? 'Delivered to WhatsApp' : 'Dispatch Failed'}</span>
                </div>
                {testDispatchResult.id && <div>Message ID: {testDispatchResult.id}</div>}
                {testDispatchResult.status && <div>Socket Status: {testDispatchResult.status}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function ZapIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

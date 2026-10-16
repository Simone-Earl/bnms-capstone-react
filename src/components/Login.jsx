import { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { logActivity } from '../utils/auditLogger';
import logo from '../assets/logo.png';

export default function Login({ setActiveTab, setUserRole }) {
  const [mode, setMode] = useState('login'); 
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [regRole, setRegRole] = useState('parent');
  const [securityPin, setSecurityPin] = useState('');
  
  const ADMIN_SECRET_PIN = 'RHU-2026';
  const BNS_SECRET_PIN = 'BNS-2026';

  const clearMessages = () => {
    setError('');
    setMessage('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    setIsProcessing(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      let role = 'parent'; 
      if (userDocSnap.exists()) {
        role = userDocSnap.data().role;
      }

      setUserRole(role);
      logActivity(user.uid, 'LOGIN', `User logged in with role: ${role}`);
      
      if (role === 'admin') setActiveTab('admin');
      else if (role === 'bns' || role === 'rhu') setActiveTab('bns');
      else if (role === 'parent') setActiveTab('parent');
      else setActiveTab('bns');

    } catch (err) {
      console.error(err);
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    clearMessages();

    if (regRole === 'admin' && securityPin !== ADMIN_SECRET_PIN) {
      setError('Invalid Security PIN. You cannot register as an Admin.');
      return;
    }
    if (regRole === 'bns' && securityPin !== BNS_SECRET_PIN) {
      setError('Invalid Security PIN. You cannot register as a BNS Worker.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsProcessing(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        role: regRole,
        created_at: serverTimestamp()
      });

      setUserRole(regRole);
      logActivity(user.uid, 'REGISTER', `New user registered as ${regRole}`);
      
      if (regRole === 'admin') setActiveTab('admin');
      else if (regRole === 'bns') setActiveTab('bns');
      else setActiveTab('parent');

    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please log in.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!email) {
      setError('Please enter your email address first.');
      return;
    }

    setIsProcessing(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err) {
      console.error(err);
      setError('Failed to send reset email. Ensure the email is registered.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="screen active" id="s-login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', padding: '20px' }}>
      <div className="frame" style={{ width: '100%', maxWidth: '420px', margin: 0, boxShadow: '0 10px 25px rgba(0,0,0,0.08)', borderRadius: '12px', border: '1px solid var(--line)', background: '#fff' }}>
        
        {/* HEADER BRANDING */}
        <div className="fhead" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, var(--maroon) 0%, #5a0c1f 100%)', color: '#fff', borderTopLeftRadius: '11px', borderTopRightRadius: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.3px' }}>
              {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Account Recovery'}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>Brgy. Epza Pulung Cacutud — BNMS</div>
          </div>
          <span className="role" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', textTransform: 'uppercase' }}>
            {mode === 'login' ? 'Secure Portal' : 'Registration'}
          </span>
        </div>

        <div className="fbody" style={{ padding: '24px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <img 
              src={logo} 
              alt="Barangay Logo" 
              style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid var(--gold)', boxShadow: '0 4px 10px rgba(0,0,0,0.08)', objectFit: 'cover' }} 
            />
            <div style={{ fontWeight: 800, color: 'var(--maroon)', marginTop: '10px', fontSize: '15px' }}>
              Barangay Nutrition Monitoring System
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
              FHSIS-Aligned Health &amp; Growth Tracking Platform
            </div>
          </div>

          {error && <div style={{ color: '#a11d3e', fontSize: '12px', textAlign: 'center', marginBottom: '14px', padding: '8px', background: '#fdf2f2', borderRadius: '6px', border: '1px solid #f5c6cb', fontWeight: 600 }}>{error}</div>}
          {message && <div style={{ color: '#2e7d32', fontSize: '12px', textAlign: 'center', marginBottom: '14px', padding: '8px', background: '#edf7ed', borderRadius: '6px', border: '1px solid #c8e6c9', fontWeight: 600 }}>{message}</div>}

          <form onSubmit={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleForgotPassword}>
            
            <div className="wf-field" style={{ background: '#fcfbfa', marginBottom: '12px', border: '1px solid var(--line)' }}>
              <b style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Email Address</b>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', outline: 'none', background: 'transparent', fontSize: '13px' }}
                placeholder="juan.delacruz@example.com"
                required
              />
            </div>
            
            {mode !== 'forgot' && (
              <div className="wf-field" style={{ background: '#fcfbfa', marginBottom: '12px', border: '1px solid var(--line)' }}>
                <b style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Password</b>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', outline: 'none', background: 'transparent', fontSize: '13px' }}
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            {mode === 'register' && (
              <>
                <div className="wf-field" style={{ background: '#fcfbfa', marginBottom: '12px', border: '1px solid var(--line)' }}>
                  <b style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Account Type</b>
                  <select 
                    value={regRole} 
                    onChange={(e) => setRegRole(e.target.value)}
                    style={{ width: '100%', outline: 'none', background: 'transparent', fontSize: '13px' }}
                  >
                    <option value="parent">Parent / Guardian</option>
                    <option value="bns">BNS (Health Worker)</option>
                    <option value="admin">RHU Staff / Admin</option>
                  </select>
                </div>

                {(regRole === 'admin' || regRole === 'bns') && (
                  <div className="wf-field" style={{ background: '#fff9e6', borderColor: 'var(--gold)', marginBottom: '12px' }}>
                    <b style={{ color: 'var(--maroon)', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Security PIN Required</b>
                    <input 
                      type="password" 
                      value={securityPin}
                      onChange={(e) => setSecurityPin(e.target.value)}
                      style={{ width: '100%', outline: 'none', background: 'transparent', fontSize: '13px' }}
                      placeholder={`Enter ${regRole === 'admin' ? 'Admin' : 'BNS'} PIN`}
                      required
                    />
                  </div>
                )}
              </>
            )}
            
            <button type="submit" className="btn" style={{ width: '100%', marginTop: '6px', padding: '10px', fontWeight: 'bold' }} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : mode === 'login' ? 'Sign In to Portal' : mode === 'register' ? 'Register Account' : 'Send Reset Link'}
            </button>
          </form>
          
          <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
            {mode === 'login' ? (
              <>
                <a href="#" onClick={(e) => { e.preventDefault(); clearMessages(); setMode('forgot'); }} style={{ color: 'var(--maroon)', textDecoration: 'underline' }}>Forgot Password?</a>
                <span style={{ color: 'var(--muted)' }}>
                  Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); clearMessages(); setMode('register'); }} style={{ color: 'var(--maroon)', fontWeight: 'bold' }}>Register here</a>
                </span>
              </>
            ) : (
              <span style={{ color: 'var(--muted)' }}>
                Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); clearMessages(); setMode('login'); }} style={{ color: 'var(--maroon)', fontWeight: 'bold' }}>Sign In</a>
              </span>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
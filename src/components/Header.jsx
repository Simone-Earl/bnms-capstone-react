import { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import logo from '../assets/logo.png';

export default function Header({ userRole, handleLogout }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close the dropdown if the user clicks outside of it
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Grab the user's email to display, and use the first letter for the avatar
  const userEmail = auth.currentUser?.email || '';
  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', zIndex: 50 }}>
      
      {/* LEFT SIDE: Brand & Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <img src={logo} alt="Barangay Pulung Cacutud Logo" style={{ width: '52px', height: '52px', borderRadius: '50%', border: '2px solid var(--gold)', flexShrink: 0, objectFit: 'cover' }} />
        <div className="titles">
          <div className="small text-gold uppercase text-[11px] tracking-wider">Barangay Epza Pulung Cacutud · Angeles City</div>
          <div className="big font-bold text-[17px]">Barangay Nutrition Monitoring System (BNMS)</div>
        </div>
        <div className="tag" style={{ background: 'rgba(217, 160, 23, 0.2)', color: 'var(--gold)', border: '1px solid var(--gold)' }}>Production · v1.0</div>
      </div>

      {/* RIGHT SIDE: Profile Dropdown (Only shows if logged in) */}
      {userRole && (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{ 
              width: '42px', height: '42px', borderRadius: '50%', 
              background: 'var(--gold)', color: '#fff', fontWeight: 'bold', fontSize: '18px',
              border: '2px solid rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)', transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            {initial}
          </button>

          {isDropdownOpen && (
            <div style={{ 
              position: 'absolute', top: '54px', right: '0', background: '#fff', color: 'var(--ink)', 
              borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', width: '220px', overflow: 'hidden', border: '1px solid var(--line)' 
            }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--line)', background: '#faf8f5' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--maroon)', wordBreak: 'break-all', lineHeight: '1.4' }}>
                  {userEmail}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', marginTop: '6px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                  Access Level: {userRole}
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsDropdownOpen(false);
                  handleLogout();
                }}
                style={{ 
                  width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', 
                  textAlign: 'left', fontSize: '13px', fontWeight: 'bold', color: '#a11d3e', cursor: 'pointer', transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#fbe1e6'}
                onMouseOut={(e) => e.target.style.background = 'transparent'}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
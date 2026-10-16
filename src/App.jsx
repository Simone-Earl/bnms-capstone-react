import { useState } from 'react';
import { auth } from './firebase'; 
import Header from './components/Header';
import TabNav from './components/TabNav';
import Login from './components/Login';
import BnsEntry from './components/BnsEntry';
import Classify from './components/Classify';
import Parent from './components/Parent';
import Admin from './components/Admin';

export default function App() {
  const [activeTab, setActiveTab] = useState('login');
  const [userRole, setUserRole] = useState(null); 

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUserRole(null);
      setActiveTab('login');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <>
      {/* Passed userRole and handleLogout to the Header */}
      <Header userRole={userRole} handleLogout={handleLogout} />
      
      <TabNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole={userRole} 
      />
      
      <main>
        {activeTab === 'login' && (
          <Login setActiveTab={setActiveTab} setUserRole={setUserRole} />
        )}
        
        {userRole && (
          <>
            {activeTab === 'bns' && <BnsEntry setActiveTab={setActiveTab} />}
            {activeTab === 'classify' && <Classify />}
            {activeTab === 'parent' && <Parent />}
            {activeTab === 'admin' && <Admin />}
          </>
        )}
      </main>
    </>
  );
}
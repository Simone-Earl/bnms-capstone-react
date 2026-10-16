export default function TabNav({ activeTab, setActiveTab, userRole }) {
  // Define all tabs and which roles are allowed to see them
  const allTabs = [
    { id: 'bns', label: 'BNS Data Entry', allowedRoles: ['bns', 'admin'] },
    { id: 'classify', label: 'Growth & Classification', allowedRoles: ['bns', 'admin'] },
    { id: 'parent', label: 'Parent Dashboard', allowedRoles: ['parent', 'admin'] },
    { id: 'admin', label: 'RHU / Admin Dashboard', allowedRoles: ['admin', 'rhu'] },
  ];

  // If no user is logged in, hide the navigation completely
  if (!userRole) return null;

  // Filter tabs based on the logged-in user's role
  const visibleTabs = allTabs.filter(tab => tab.allowedRoles.includes(userRole));

  return (
    <nav id="tabnav">
      {visibleTabs.map((tab) => (
        <button
          key={tab.id}
          className={activeTab === tab.id ? 'active' : ''}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
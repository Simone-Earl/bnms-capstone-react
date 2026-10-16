import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import logo from '../assets/logo.png';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

export default function Admin() {
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [revealContacts, setRevealContacts] = useState(false);

  const [rawChildren, setRawChildren] = useState({});
  const [rawRecords, setRawRecords] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Flagged Cases Table Pagination & Filters
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSitio, setFilterSitio] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Master Database (All Children) Pagination & Filters 
  const [childrenSearchQuery, setChildrenSearchQuery] = useState('');
  const [childrenFilterSitio, setChildrenFilterSitio] = useState('All');
  const [currentChildrenPage, setCurrentChildrenPage] = useState(1);
  const childrenPerPage = 10;

  // User Management Pagination & Filters
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const usersPerPage = 10;

  useEffect(() => {
    const unsubChildren = onSnapshot(collection(db, 'children'), (snap) => {
      const data = {};
      snap.forEach(d => {
        data[d.id] = { id: d.id, ...d.data() };
      });
      setRawChildren(data);
    });

    const unsubRecords = onSnapshot(collection(db, 'anthropometric_records'), (snap) => {
      const data = [];
      snap.forEach(d => {
        data.push({ id: d.id, ...d.data() });
      });
      setRawRecords(data);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const data = [];
      snap.forEach(d => {
        data.push({ id: d.id, ...d.data() });
      });
      setUsersList(data);
      setIsLoading(false); 
    });

    return () => {
      unsubChildren();
      unsubRecords();
      unsubUsers(); 
    };
  }, []);

  const { flaggedCases, stats } = useMemo(() => {
    if (Object.keys(rawChildren).length === 0 && rawRecords.length === 0) {
      return { flaggedCases: [], stats: { total: 0, flagged: 0, coverage: '0%' } };
    }

    const latestRecords = {};
    
    rawRecords.forEach(record => {
      const childId = record.child_id;
      if (!latestRecords[childId] || new Date(record.visit_date) > new Date(latestRecords[childId].visit_date)) {
        latestRecords[childId] = record;
      }
    });

    const flagged = [];
    const totalAssessed = Object.keys(latestRecords).length;
    const totalChildren = Object.keys(rawChildren).length;

    Object.entries(latestRecords).forEach(([childId, record]) => {
      const classification = record.nutrition_classification?.classification_result || 'Unknown';

      if (classification !== 'Normal') {
        flagged.push({
          id: childId,
          childName: rawChildren[childId]?.full_name || 'Unknown Child',
          contactNo: rawChildren[childId]?.contact_number || 'No contact provided',
          sitio: rawChildren[childId]?.sitio_purok || 'Unspecified', 
          classification: classification,
          date: record.visit_date,
          status: classification.includes('Severely') ? 'Urgent Referral' : 'Pending Visit'
        });
      }
    });

    flagged.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      flaggedCases: flagged,
      stats: {
        total: totalChildren,
        flagged: flagged.length,
        coverage: totalChildren > 0 ? Math.round((totalAssessed / totalChildren) * 100) + '%' : '0%'
      }
    };
  }, [rawChildren, rawRecords]); 

  const revealNumber = (num) => {
    if (!num || num === 'No contact provided') return 'No contact provided';
    const clean = num.replace(/\D/g, ''); 
    return clean.length > 0 ? clean : 'No contact provided';
  };

  // FIXED: Adjusted the substring to censor one more digit on the left
  const maskNumber = (num) => {
    if (!num || num === 'No contact provided') return 'No contact provided';
    const clean = num.replace(/\D/g, ''); 
    if (clean.length >= 11) {
      return `${clean.substring(0,3)}******${clean.substring(clean.length - 2)}`;
    }
    return '***********';
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    const element = document.querySelector('.pdf-page');
    if (!element) { alert("Please open the PDF preview first."); setIsExporting(false); return; }
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`BNMS_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    const summaryData = [
      ["Barangay Epza Pulung Cacutud - Barangay Nutrition Monitoring System (BNMS)"],
      ["Consolidated Nutrition Status Summary"],
      ["Generated On:", new Date().toLocaleDateString()],
      [],
      ["OVERALL STATISTICS"],
      ["Indicator", "Count"],
      ["Total Children Assessed", stats.total],
      ["Normal", stats.total - stats.flagged],
      ["Flagged (Underweight/Stunted/Wasted)", stats.flagged],
      ["OPT+ Coverage", stats.coverage],
      [],
      ["FLAGGED CASES FOR FOLLOW-UP"],
      ["Date Recorded", "Child Name", "Sitio/Purok", "Guardian Contact", "Classification", "Action Status"]
    ];

    flaggedCases.forEach(c => {
      summaryData.push([c.date, c.childName, c.sitio, revealNumber(c.contactNo), c.classification, c.status]);
    });

    const masterData = [
      ["Barangay Epza Pulung Cacutud - Master Database (All Registered Children)"],
      ["Generated On:", new Date().toLocaleDateString()],
      [],
      ["Child Name", "Sex", "Date of Birth", "Sitio/Purok", "Household Head", "Contact Number", "Parent Email"]
    ];

    const allChildrenArray = Object.values(rawChildren).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    allChildrenArray.forEach(child => {
      masterData.push([
        child.full_name,
        child.sex,
        child.date_of_birth,
        child.sitio_purok,
        child.household_head,
        revealNumber(child.contact_number),
        child.parent_email || 'None'
      ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    const masterSheet = XLSX.utils.aoa_to_sheet(masterData);
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, "FHSIS Summary");
    XLSX.utils.book_append_sheet(workbook, masterSheet, "Master Database");
    
    XLSX.writeFile(workbook, `BNMS_Data_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleRoleChange = async (userId, newRole) => {
    if (confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { role: newRole });
        alert("Role updated successfully!");
      } catch (error) {
        console.error("Error updating role:", error);
        alert("Failed to update user role.");
      }
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (confirm(`WARNING: Are you sure you want to delete the account for "${userEmail}"? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        alert("User account record deleted successfully.");
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("Failed to delete user account.");
      }
    }
  };

  // 1. Flagged Cases Logic
  const uniqueSitios = ['All', ...new Set(flaggedCases.map(c => c.sitio).filter(Boolean))];
  const processedCases = flaggedCases.filter(c => {
    const matchStatus = filterStatus === 'All' || c.classification === filterStatus;
    const matchSitio = filterSitio === 'All' || c.sitio === filterSitio;
    return matchStatus && matchSitio;
  });
  const totalPages = Math.ceil(processedCases.length / itemsPerPage) || 1;
  const currentData = processedCases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 2. Master Database (All Registered Children) Logic 
  const allChildrenArray = Object.values(rawChildren).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  const uniqueAllSitios = ['All', ...new Set(allChildrenArray.map(c => c.sitio_purok).filter(Boolean))];
  
  const processedChildren = allChildrenArray.filter(c => {
    const matchSearch = (c.full_name || '').toLowerCase().includes(childrenSearchQuery.toLowerCase()) || 
                        (c.household_head || '').toLowerCase().includes(childrenSearchQuery.toLowerCase());
    const matchSitio = childrenFilterSitio === 'All' || c.sitio_purok === childrenFilterSitio;
    return matchSearch && matchSitio;
  });
  
  const totalChildrenPages = Math.ceil(processedChildren.length / childrenPerPage) || 1;
  const currentChildrenData = processedChildren.slice((currentChildrenPage - 1) * childrenPerPage, currentChildrenPage * childrenPerPage);

  // 3. User Management Logic
  const processedUsers = usersList.filter(u => {
    return userRoleFilter === 'All' || u.role === userRoleFilter;
  });
  const totalUserPages = Math.ceil(processedUsers.length / usersPerPage) || 1;
  const currentUserData = processedUsers.slice((currentUserPage - 1) * usersPerPage, currentUserPage * usersPerPage);

  return (
    <div className="screen active" id="s-admin">
      
      {/* KPI GRID */}
      <div className="kpi-grid" style={{ marginBottom: '14px' }}>
        <div className="kpi">
          <div className="num">{isLoading ? '...' : stats.total}</div>
          <div className="lbl">Children Registered</div>
        </div>
        <div className="kpi">
          <div className="num" style={{ color: stats.flagged > 0 ? '#a11d3e' : 'var(--maroon)' }}>
            {isLoading ? '...' : stats.flagged}
          </div>
          <div className="lbl">Flagged for Follow-up</div>
        </div>
        <div className="kpi">
          <div className="num">{isLoading ? '...' : stats.coverage}</div>
          <div className="lbl">OPT+ Coverage</div>
        </div>
      </div>

      {/* FLAGGED CASES TABLE */}
      <div className="frame">
        <div className="fhead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>Flagged Cases — Active <span className="role">RHU Staff</span></div>
          <button 
            type="button" 
            className="btn ghost" 
            style={{ margin: 0, padding: '4px 8px', fontSize: '11px', borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}
            onClick={() => setRevealContacts(!revealContacts)}
          >
            {revealContacts ? '🔒 Hide Contacts (DPA)' : '👁 Reveal Contacts'}
          </button>
        </div>
        <div className="fbody">
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', background: '#f8f4eb', padding: '10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '4px' }}>Filter by Status:</label>
              <select 
                value={filterStatus} 
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--line)', outline: 'none' }}
              >
                <option value="All">All Flagged</option>
                <option value="Underweight">Underweight</option>
                <option value="Severely Underweight">Severely Underweight</option>
                <option value="Stunted">Stunted</option>
                <option value="Wasted">Wasted</option>
                <option value="Overweight">Overweight</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '4px' }}>Filter by Sitio/Purok:</label>
              <select 
                value={filterSitio} 
                onChange={(e) => {
                  setFilterSitio(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--line)', outline: 'none' }}
              >
                {uniqueSitios.map(sitio => (
                  <option key={sitio} value={sitio}>{sitio}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center text-muted">Loading database...</div>
          ) : currentData.length > 0 ? (
            <>
              <table>
                <thead>
                  <tr><th>Child</th><th>Sitio</th><th>Contact</th><th>Classification</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {currentData.map((caseItem) => (
                    <tr key={caseItem.id}>
                      <td>{caseItem.childName}</td>
                      <td>{caseItem.sitio}</td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--muted)' }}>
                        {revealContacts ? revealNumber(caseItem.contactNo) : maskNumber(caseItem.contactNo)}
                      </td>
                      <td>{caseItem.classification}</td>
                      <td>
                        <span className={`pill ${caseItem.status === 'Urgent Referral' ? 'risk' : 'watch'}`}>
                          {caseItem.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '12px', color: 'var(--muted)' }}>
                <div>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, processedCases.length)} of {processedCases.length} entries</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--line)', background: currentPage === 1 ? '#eee' : '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Prev
                  </button>
                  <span style={{ padding: '4px 10px', fontWeight: 'bold' }}>Page {currentPage} of {totalPages}</span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--line)', background: currentPage === totalPages ? '#eee' : '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-muted" style={{ padding: '20px' }}>
              No cases match the selected filters.
            </div>
          )}
        </div>
      </div>

      {/* MASTER DATABASE (ALL REGISTERED CHILDREN) */}
      <div className="frame">
        <div className="fhead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>Master Database — All Children <span className="role">Registry</span></div>
          <button 
            type="button" 
            className="btn ghost" 
            style={{ margin: 0, padding: '4px 8px', fontSize: '11px', borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}
            onClick={() => setRevealContacts(!revealContacts)}
          >
            {revealContacts ? '🔒 Hide Contacts (DPA)' : '👁 Reveal Contacts'}
          </button>
        </div>
        <div className="fbody">
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', background: '#f8f4eb', padding: '10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '4px' }}>Search Name or Guardian:</label>
              <input 
                type="text" 
                value={childrenSearchQuery} 
                onChange={(e) => {
                  setChildrenSearchQuery(e.target.value);
                  setCurrentChildrenPage(1);
                }}
                placeholder="Search..."
                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--line)', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '4px' }}>Filter by Sitio/Purok:</label>
              <select 
                value={childrenFilterSitio} 
                onChange={(e) => {
                  setChildrenFilterSitio(e.target.value);
                  setCurrentChildrenPage(1);
                }}
                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--line)', outline: 'none' }}
              >
                {uniqueAllSitios.map(sitio => (
                  <option key={sitio} value={sitio}>{sitio}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center text-muted">Loading database...</div>
          ) : currentChildrenData.length > 0 ? (
            <>
              <table>
                <thead>
                  <tr><th>Child Name</th><th>Sex</th><th>DOB</th><th>Sitio</th><th>Guardian</th><th>Contact</th></tr>
                </thead>
                <tbody>
                  {currentChildrenData.map((child) => (
                    <tr key={child.id}>
                      <td style={{ fontWeight: 'bold', color: 'var(--maroon)' }}>{child.full_name}</td>
                      <td>{child.sex}</td>
                      <td>{child.date_of_birth}</td>
                      <td>{child.sitio_purok}</td>
                      <td>{child.household_head}</td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--muted)' }}>
                        {revealContacts ? revealNumber(child.contact_number) : maskNumber(child.contact_number)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '12px', color: 'var(--muted)' }}>
                <div>Showing {((currentChildrenPage - 1) * childrenPerPage) + 1} to {Math.min(currentChildrenPage * childrenPerPage, processedChildren.length)} of {processedChildren.length} entries</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => setCurrentChildrenPage(p => Math.max(1, p - 1))}
                    disabled={currentChildrenPage === 1}
                    style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--line)', background: currentChildrenPage === 1 ? '#eee' : '#fff', cursor: currentChildrenPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Prev
                  </button>
                  <span style={{ padding: '4px 10px', fontWeight: 'bold' }}>Page {currentChildrenPage} of {totalChildrenPages}</span>
                  <button 
                    onClick={() => setCurrentChildrenPage(p => Math.min(totalChildrenPages, p + 1))}
                    disabled={currentChildrenPage === totalChildrenPages}
                    style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--line)', background: currentChildrenPage === totalChildrenPages ? '#eee' : '#fff', cursor: currentChildrenPage === totalChildrenPages ? 'not-allowed' : 'pointer' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-muted" style={{ padding: '20px' }}>
              No children match the selected search filters.
            </div>
          )}
        </div>
      </div>

      {/* USER MANAGEMENT PANEL */}
      <div className="frame" style={{ borderColor: 'var(--maroon)' }}>
        <div className="fhead" style={{ background: 'var(--maroon)', color: '#fff' }}>
          User &amp; Access Management <span className="role">System Administrator</span>
        </div>
        <div className="fbody">
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', background: '#f8f4eb', padding: '10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '4px' }}>Filter by Role:</label>
              <select 
                value={userRoleFilter} 
                onChange={(e) => {
                  setUserRoleFilter(e.target.value);
                  setCurrentUserPage(1);
                }}
                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--line)', outline: 'none' }}
              >
                <option value="All">All Roles</option>
                <option value="parent">Parent</option>
                <option value="bns">BNS</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {usersList.length > 0 ? (
            currentUserData.length > 0 ? (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>Email Address</th>
                      <th>Current Role</th>
                      <th>Change Access Level</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUserData.map(user => (
                      <tr key={user.id}>
                        <td style={{ fontWeight: 'bold', color: 'var(--maroon)' }}>{user.email || 'No Email (Legacy)'}</td>
                        <td>
                          <span className={`pill ${user.role === 'admin' ? 'risk' : user.role === 'bns' ? 'watch' : 'normal'}`} style={{ textTransform: 'uppercase' }}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <select 
                            value={user.role} 
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line)', outline: 'none', fontSize: '11px', background: '#f8f4eb' }}
                          >
                            <option value="parent">Parent (View Only)</option>
                            <option value="bns">BNS (Data Entry)</option>
                            <option value="admin">RHU Admin (Full Access)</option>
                          </select>
                        </td>
                        <td>
                          <button 
                            type="button"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            style={{ background: '#a11d3e', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '12px', color: 'var(--muted)' }}>
                  <div>Showing {((currentUserPage - 1) * usersPerPage) + 1} to {Math.min(currentUserPage * usersPerPage, processedUsers.length)} of {processedUsers.length} entries</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => setCurrentUserPage(p => Math.max(1, p - 1))}
                      disabled={currentUserPage === 1}
                      style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--line)', background: currentUserPage === 1 ? '#eee' : '#fff', cursor: currentUserPage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Prev
                    </button>
                    <span style={{ padding: '4px 10px', fontWeight: 'bold' }}>Page {currentUserPage} of {totalUserPages}</span>
                    <button 
                      onClick={() => setCurrentUserPage(p => Math.min(totalUserPages, p + 1))}
                      disabled={currentUserPage === totalUserPages}
                      style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--line)', background: currentUserPage === totalUserPages ? '#eee' : '#fff', cursor: currentUserPage === totalUserPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-muted" style={{ padding: '20px' }}>
                No users match the selected role filter.
              </div>
            )
          ) : (
            <div className="text-center text-muted">Loading user accounts...</div>
          )}
        </div>
      </div>

      {/* REPORTS PANEL */}
      <div className="frame">
        <div className="fhead">Reports <span className="role">Administrator</span></div>
        <div className="fbody">
          <div className="wf-field">
            <b>Report type</b> FHSIS-aligned Barangay Summary &amp; Registry Export
          </div>
          
          <button type="button" className="btn" onClick={() => setIsPreviewOpen(!isPreviewOpen)}>
            {isPreviewOpen ? 'Hide Preview' : '👁 Preview PDF'}
          </button>
          
          <button type="button" className="btn ghost" style={{ marginLeft: '8px' }} onClick={handleExportExcel}>
            Export Excel (All Data)
          </button>

          <div className={`panel-collapse ${isPreviewOpen ? 'open' : ''}`} id="pdf-preview-panel">
            <div className="pdf-preview">
              <div className="pdf-page">
                <div className="pdf-head">
                  <img src={logo} alt="Barangay Logo" />
                  <div>
                    <div className="t1">Barangay Epza Pulung Cacutud — Angeles City</div>
                    <div className="t2">Barangay Nutrition Monitoring System (BNMS) · FHSIS-Aligned Report</div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '11px', marginBottom: '10px' }}>
                  Consolidated Nutrition Status Summary<br/>
                  <span style={{ fontWeight: 400, fontSize: '9px', color: '#777' }}>
                    Generated on {new Date().toLocaleDateString()}
                  </span>
                </div>
                <table style={{ marginBottom: '10px' }}>
                  <thead>
                    <tr><th>Indicator</th><th>Count</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Total Children Assessed</td><td>{stats.total}</td></tr>
                    <tr><td>Normal</td><td>{stats.total - stats.flagged}</td></tr>
                    <tr><td>Flagged (Underweight/Stunted/Wasted)</td><td>{stats.flagged}</td></tr>
                  </tbody>
                </table>
                <div style={{ fontWeight: 700, fontSize: '9.5px', marginBottom: '4px' }}>Flagged Cases for Follow-up</div>
                {flaggedCases.length > 0 ? (
                  <table>
                    <thead>
                      <tr><th>Date</th><th>Child</th><th>Classification</th></tr>
                    </thead>
                    <tbody>
                      {flaggedCases.slice(0, 5).map(c => (
                        <tr key={c.id}>
                          <td>{c.date}</td>
                          <td>{c.childName}</td>
                          <td>{c.classification}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ fontSize: '9px', color: '#777', padding: '4px 0' }}>No flagged cases.</div>
                )}
                <div className="pdf-foot">
                  Page 1 of 1 · Auto-generated by BNMS · Not for redistribution outside RHU/City Health Office
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button type="button" className="btn" onClick={handleDownloadPDF} disabled={isExporting}>
                {isExporting ? 'Generating PDF...' : '⬇ Download PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
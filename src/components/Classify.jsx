import { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// NEW: Custom Tooltip Component for the Chart
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ fontWeight: 'bold', color: 'var(--maroon)', marginBottom: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '4px' }}>
          {data.displayDate}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--ink)' }}>
          <div><b>Weight:</b> {data.weight} kg</div>
          <div><b>Height/Length:</b> {data.height ? `${data.height} cm` : 'N/A'}</div>
          <div><b>MUAC:</b> {data.muac ? `${data.muac} cm` : 'N/A'}</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
            <b>Z-Scores:</b> HAZ: {data.haz ?? 'N/A'} | WAZ: {data.waz ?? 'N/A'} | WHZ: {data.whz ?? 'N/A'}
          </div>
          <div style={{ marginTop: '4px' }}>
            <b>Status:</b>{' '}
            <span className={`pill ${data.classification === 'Normal' ? 'normal' : data.classification.includes('Severely') ? 'risk' : 'watch'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
              {data.classification}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function Classify() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selectedChild, setSelectedChild] = useState(null);
  const [history, setHistory] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'children'));
      const results = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.full_name.toLowerCase().includes(searchQuery.toLowerCase())) {
          results.push({ id: doc.id, ...data });
        }
      });
      setSearchResults(results);
      if (results.length === 0) alert("No child found.");
    } catch (error) {
      console.error("Search error: ", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectChild = async (child) => {
    setSelectedChild(child);
    setSearchResults([]);
    setSearchQuery('');
    
    try {
      const q = query(
        collection(db, 'anthropometric_records'),
        where("child_id", "==", child.id)
      );
      const querySnapshot = await getDocs(q);
      const records = [];
      querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
      });
      
      records.sort((a, b) => new Date(a.visit_date) - new Date(b.visit_date));
      setHistory(records);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const latestRecord = history.length > 0 ? history[history.length - 1] : null;

  return (
    <div className="screen active" id="s-classify">
      
      {/* SEARCH EXISTING CHILD */}
      <div className="frame" style={{ background: '#f8f4eb', borderColor: 'var(--gold)' }}>
        <div className="fhead" style={{ background: 'var(--gold)', color: '#6b4f00' }}>
          Lookup Classification <span className="role">Search Database</span>
        </div>
        <div className="fbody">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="wf-field" 
              style={{ background: '#fff', margin: 0, flex: 1 }} 
              placeholder="Search by child's name..." 
            />
            <button type="submit" className="btn" style={{ margin: 0 }} disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div style={{ marginTop: '10px', background: '#fff', border: '1px solid var(--line)', borderRadius: '6px' }}>
              {searchResults.map(child => (
                <div 
                  key={child.id} 
                  onClick={() => handleSelectChild(child)}
                  style={{ padding: '10px', borderBottom: '1px solid var(--line)', cursor: 'pointer', fontSize: '13px' }}
                  className="hover:bg-gray-100"
                >
                  <b>{child.full_name}</b> — {child.sitio_purok}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedChild && !latestRecord && (
        <div className="frame">
          <div className="fbody text-center text-muted">No anthropometric records found for this child yet.</div>
        </div>
      )}

      {selectedChild && latestRecord && (
        <>
          {/* LATEST CLASSIFICATION */}
          <div className="frame">
            <div className="fhead">Nutrition Classification Result <span className="role">Latest Visit</span></div>
            <div className="fbody">
              <div style={{ marginBottom: '14px', fontWeight: 'bold', color: 'var(--maroon)' }}>
                Viewing: {selectedChild.full_name}
              </div>
              <table style={{ marginBottom: '10px' }}>
                <thead>
                  <tr><th>Date</th><th>Indicator</th><th>Z-score</th><th>Status</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{latestRecord.visit_date}</td>
                    <td>Height-for-Age (HAZ)</td>
                    <td>{latestRecord.nutrition_classification?.haz || 'N/A'}</td>
                    <td><span className="pill normal">Normal</span></td>
                  </tr>
                  <tr>
                    <td>{latestRecord.visit_date}</td>
                    <td>Weight-for-Age (WAZ)</td>
                    <td>{latestRecord.nutrition_classification?.waz || 'N/A'}</td>
                    <td><span className="pill watch">Underweight</span></td>
                  </tr>
                  <tr>
                    <td>{latestRecord.visit_date}</td>
                    <td>Weight-for-Height (WHZ)</td>
                    <td>{latestRecord.nutrition_classification?.whz_bmi || 'N/A'}</td>
                    <td><span className="pill watch">Watch</span></td>
                  </tr>
                </tbody>
              </table>
              <div className="wf-field">
                <b>Overall classification</b> 
                {latestRecord.nutrition_classification?.classification_result || 'Pending'} — flagged for follow-up (recorded {latestRecord.visit_date})
              </div>
              <button className="btn ghost">Mark for Referral / Follow-up</button>
            </div>
          </div>

          {/* LONGITUDINAL GROWTH HISTORY */}
          <div className="frame">
            <div className="fhead">Growth History — {selectedChild.full_name} <span className="role">Longitudinal view</span></div>
            <div className="fbody">
              
              <div style={{ width: '100%', height: 250, marginBottom: '20px', marginTop: '10px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    // FIXED: Mapping all the extra measurement data so the Custom Tooltip can use it
                    data={history.map((record, index) => ({
                      uniqueId: `${record.id}-${index}`,
                      displayDate: new Date(record.visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                      weight: record.weight_kg,
                      height: record.height_cm,
                      muac: record.muac_cm,
                      classification: record.nutrition_classification?.classification_result || 'Unknown',
                      haz: record.nutrition_classification?.haz,
                      waz: record.nutrition_classification?.waz,
                      whz: record.nutrition_classification?.whz_bmi
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="towerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--gold)" />
                        <stop offset="100%" stopColor="var(--maroon)" />
                      </linearGradient>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                    
                    <XAxis 
                      dataKey="uniqueId" 
                      tickFormatter={(value, index) => {
                        return history[index] ? new Date(history[index].visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                      }}
                      tick={{ fontSize: 11, fill: 'var(--muted)' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                    
                    {/* FIXED: Replaced standard tooltip with the new Custom Tooltip */}
                    <Tooltip cursor={{ fill: 'rgba(122,19,48,.06)' }} content={<CustomTooltip />} />
                    
                    <Bar 
                      dataKey="weight" 
                      name="Weight (kg)"
                      fill="url(#towerGradient)" 
                      radius={[4, 4, 0, 0]} 
                      barSize={50} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* History Table */}
              <table style={{ marginTop: '12px' }}>
                <thead>
                  <tr><th>Round Date</th><th>Weight (kg)</th><th>WAZ</th><th>Classification</th></tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record.id}>
                      <td>{record.visit_date}</td>
                      <td>{record.weight_kg}</td>
                      <td>{record.nutrition_classification?.waz || 'N/A'}</td>
                      <td>
                        <span className={`pill ${record.nutrition_classification?.classification_result === 'Severely Underweight' ? 'risk' : 'watch'}`}>
                          {record.nutrition_classification?.classification_result || 'Underweight'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="note">Weight trend across recorded OPT+ visits. Health worker + parent both see this view.</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
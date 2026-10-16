import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

export default function Parent() {
  const [myChildren, setMyChildren] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedChild, setSelectedChild] = useState(null);
  const [history, setHistory] = useState([]);

  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    async function fetchMyChildren() {
      if (!auth.currentUser?.email) return;
      
      try {
        const q = query(
          collection(db, 'children'), 
          where('parent_email', '==', auth.currentUser.email.toLowerCase())
        );
        const querySnapshot = await getDocs(q);
        const results = [];
        querySnapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() });
        });
        setMyChildren(results);
      } catch (error) {
        console.error("Error fetching children: ", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchMyChildren();
  }, []);

  const handleSelectChild = async (child) => {
    setSelectedChild(child);
    
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

  const getInitials = (name) => {
    if (!name) return 'CH';
    const split = name.split(' ');
    if (split.length > 1) return split[0][0] + split[split.length - 1][0];
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="screen active" id="s-parent">
      
      {!selectedChild && (
        <div className="frame">
          <div className="fhead" style={{ background: 'var(--maroon)' }}>
            Your Registered Children <span className="role">Linked to {auth.currentUser?.email}</span>
          </div>
          <div className="fbody">
            {isLoading ? (
              <div className="text-center text-muted">Loading your records...</div>
            ) : myChildren.length > 0 ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {myChildren.map(child => (
                  <div 
                    key={child.id} 
                    onClick={() => handleSelectChild(child)}
                    style={{ padding: '14px', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', background: '#fff', transition: 'background 0.2s' }}
                    className="hover:bg-gray-50"
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '18px' }}>
                      {getInitials(child.full_name)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--maroon)' }}>{child.full_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Born: {child.date_of_birth} · {child.sitio_purok}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted" style={{ padding: '20px' }}>
                <p>No children are currently linked to your email address.</p>
                <p style={{ fontSize: '12px', marginTop: '8px' }}>If you have registered your child with the barangay, please ask the health worker to link their profile to <b>{auth.currentUser?.email}</b>.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedChild && (
        <>
          <div style={{ marginBottom: '14px' }}>
            <button 
              onClick={() => setSelectedChild(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--maroon)', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              ← Back to My Children
            </button>
          </div>

          <div className="frame">
            <div className="fhead">Hi, {selectedChild.household_head || 'Parent'} 👋 <span className="role">Parent / Guardian</span></div>
            <div className="fbody">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '22px' }}>
                  {getInitials(selectedChild.full_name)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>
                    {selectedChild.full_name} 
                  </div>
                  <span className={`pill ${history.length > 0 && history[history.length - 1].nutrition_classification?.classification_result === 'Normal' ? 'normal' : history.length > 0 && history[history.length - 1].nutrition_classification?.classification_result?.includes('Severely') ? 'risk' : 'watch'}`}>
                    {history.length > 0 ? history[history.length - 1].nutrition_classification?.classification_result : 'No data yet'}
                  </span>
                </div>
              </div>

              {history.length > 0 && history[history.length - 1].nutrition_classification?.classification_result !== 'Normal' ? (
                <div className="wf-field" style={{ background: '#fff2d6', borderColor: '#e0c37a', color: '#6b4f00' }}>
                  <b>What this means</b><br/>
                  {selectedChild.full_name.split(' ')[0]}'s latest checkup shows they may need a bit more nutrition. This is not an emergency, but a health worker can assist you in planning meals.
                </div>
              ) : (
                <div className="wf-field" style={{ background: '#eef8ec', borderColor: 'var(--green)', color: 'var(--green)' }}>
                  <b>What this means</b><br/>
                  {selectedChild.full_name.split(' ')[0]} is growing at a healthy and normal rate based on their latest checkup. Keep up the good work!
                </div>
              )}

              {/* FIXED: Removed the CSS stripes by forcing a solid white background and explicitly setting backgroundImage to none */}
              <div className="wf-field" style={{ background: '#fff', backgroundImage: 'none', border: '1px solid var(--line)' }}>
                <b style={{ color: 'var(--maroon)' }}>Feeding tip of the day (NNC/DOH)</b><br/> 
                <span style={{ color: 'var(--ink)' }}>
                  Add 1 egg or a handful of malunggay to {selectedChild.full_name.split(' ')[0]}'s lugaw at least 3x a week.
                </span>
              </div>
              
              <button type="button" className="btn" onClick={() => setIsChartOpen(!isChartOpen)}>
                {isChartOpen ? 'Hide Growth Chart' : 'View Full Growth Chart'}
              </button>
              <button type="button" className="btn ghost" style={{ marginLeft: '8px' }} onClick={() => setIsGuideOpen(!isGuideOpen)}>
                {isGuideOpen ? 'Hide Feeding Guide' : 'Feeding & Nutrition Guide'}
              </button>
            </div>
          </div>

          <div className={`frame panel-collapse ${isChartOpen ? 'open' : ''}`} id="parent-chart-panel">
            <div className="fhead">{selectedChild.full_name}'s Full Growth Chart <span className="role">History</span></div>
            <div className="fbody">
              {history.length > 0 ? (
                <>
                  <div style={{ width: '100%', height: 250, marginBottom: '20px', marginTop: '10px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
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

                  <table style={{ marginTop: '12px' }}>
                    <thead>
                      <tr><th>Date</th><th>Weight (kg)</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {history.map((record) => (
                        <tr key={record.id}>
                          <td>{record.visit_date}</td>
                          <td>{record.weight_kg}</td>
                          <td>
                            <span className={`pill ${record.nutrition_classification?.classification_result === 'Normal' ? 'normal' : record.nutrition_classification?.classification_result?.includes('Severely') ? 'risk' : 'watch'}`}>
                              {record.nutrition_classification?.classification_result || 'Improving'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="note">The towers show weight at each check-up. Steady growth from left to right is a good sign.</div>
                </>
              ) : (
                <div className="text-center text-muted">No growth history recorded yet.</div>
              )}
            </div>
          </div>

          <div className={`frame panel-collapse ${isGuideOpen ? 'open' : ''}`} id="parent-guide-panel">
            <div className="fhead">Feeding &amp; Nutrition Guide <span className="role">Resources</span></div>
            <div className="fbody">
              <ul className="guide-list">
                <li><span className="ic">🍚</span>
                  <div><b>Give food more often</b> 3 main meals + 2 snacks daily, even in small amounts.
                    <div className="src">Source: National Nutrition Council</div>
                  </div>
                </li>
                <li><span className="ic">🥚</span>
                  <div><b>Add protein at every meal</b> Egg, fish, chicken liver, or malunggay leaves help catch-up growth.
                    <div className="src">Source: NNC – Pinggang Pinoy Guide</div>
                  </div>
                </li>
                <li><span className="ic">🥣</span>
                  <div><b>Use the Orange Plate method</b> Half the plate: rice/root crops; the rest: protein + vegetables.
                    <div className="src">Source: NNC – Orange Plate of Pinggang Pinoy</div>
                  </div>
                </li>
                <li><span className="ic">🩺</span>
                  <div><b>This is general guidance only</b> It does not replace medical advice — your BNS/RHU worker will visit to check directly.
                    <div className="src">Source: DOH Child Health Guidelines</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
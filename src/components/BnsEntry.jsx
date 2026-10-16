import { useState } from 'react';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase'; 
import { evaluateMeasurements } from '../utils/zscoreCalculator';
import { logActivity } from '../utils/auditLogger'; 

export default function BnsEntry({ setActiveTab }) {
  const today = new Date().toISOString().split('T')[0];

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState('Female');
  const [sitio, setSitio] = useState('');
  const [householdHead, setHouseholdHead] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  
  const [childId, setChildId] = useState(null); 
  const [consentGiven, setConsentGiven] = useState(false);

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [muac, setMuac] = useState('');
  const [visitDate, setVisitDate] = useState(today);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentClassification, setCurrentClassification] = useState(null);

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
      if (results.length === 0) alert("No child found with that name.");
    } catch (error) {
      console.error("Search error: ", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectChild = (child) => {
    setChildId(child.id);
    setFullName(child.full_name);
    setDob(child.date_of_birth);
    setSex(child.sex);
    setSitio(child.sitio_purok);
    setHouseholdHead(child.household_head);
    setContactNo(child.contact_number || '');
    setParentEmail(child.parent_email || ''); 
    
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    
    if (!consentGiven && !childId) {
      alert("Data Privacy Act Compliance: You must obtain and verify the parent/guardian's consent before registering this child.");
      return;
    }

    // Optional: Validate that if they typed a number, it's actually 11 digits
    if (contactNo && contactNo.length !== 11) {
      alert("Please enter a valid 11-digit mobile number (e.g., 09123456789).");
      return;
    }

    setIsSaving(true);
    
    try {
      const docRef = await addDoc(collection(db, 'children'), {
        full_name: fullName,
        date_of_birth: dob,
        sex: sex,
        sitio_purok: sitio,
        household_head: householdHead,
        contact_number: contactNo,
        parent_email: parentEmail.trim().toLowerCase(),
        registration_date: serverTimestamp(),
        dpa_consent_verified: true,
        dpa_consent_timestamp: serverTimestamp()
      });
      
      setChildId(docRef.id);
      
      logActivity(auth.currentUser.uid, 'REGISTER_CHILD', `Registered new profile for ${fullName} (${docRef.id}) linked to email ${parentEmail}.`);
      
      alert(`Profile saved successfully!`);
    } catch (error) {
      console.error("Error adding profile: ", error);
      alert("Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMeasurementSubmit = async (e) => {
    e.preventDefault();
    
    if (!childId) {
      alert("Please save or select a child profile first before submitting measurements.");
      return;
    }
    
    if (new Date(visitDate) < new Date(dob)) {
      alert("Error: The visit date cannot be earlier than the child's Date of Birth.");
      return;
    }

    setIsSaving(true);

    try {
      const computedClassification = evaluateMeasurements(
        dob, 
        visitDate, 
        sex, 
        parseFloat(weight), 
        parseFloat(height)
      );

      await addDoc(collection(db, 'anthropometric_records'), {
        child_id: childId,
        visit_date: visitDate,
        height_cm: parseFloat(height),
        weight_kg: parseFloat(weight),
        muac_cm: parseFloat(muac),
        nutrition_classification: {
          haz: computedClassification.haz,
          waz: computedClassification.waz,
          whz_bmi: computedClassification.whz_bmi,
          classification_result: computedClassification.classification_result
        },
        recorded_at: serverTimestamp()
      });
      
      logActivity(auth.currentUser.uid, 'RECORD_MEASUREMENT', `Recorded ${weight}kg for child ${childId}. Result: ${computedClassification.classification_result}`);
      
      setCurrentClassification(computedClassification);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error adding measurement: ", error);
      alert("Failed to save measurements.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAnother = () => {
    setFullName(''); setDob(''); setSex('Female'); setSitio('');
    setHouseholdHead(''); setContactNo(''); setParentEmail('');
    setHeight(''); setWeight(''); setMuac('');
    setChildId(null);
    setIsSubmitted(false);
    setCurrentClassification(null);
    setConsentGiven(false);
  };

  return (
    <div className="screen active" id="s-bns">
      
      {/* SEARCH EXISTING CHILD */}
      <div className="frame" style={{ background: '#f8f4eb', borderColor: 'var(--gold)' }}>
        <div className="fhead" style={{ background: 'var(--gold)', color: '#6b4f00' }}>
          Find Existing Child <span className="role">For returning visits</span>
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
                  <b>{child.full_name}</b> — {child.sitio_purok} (Head: {child.household_head})
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CHILD REGISTRATION FORM */}
      <form className="frame" onSubmit={handleProfileSave}>
        <div className="fhead">Register Child &amp; Household <span className="role">Profile Data</span></div>
        <div className="fbody">
          <div className="row2">
            <div className="wf-field" style={{ background: '#fff' }}>
              <b>Child full name</b>
              <input 
                type="text" 
                required 
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
                className="w-full outline-none bg-transparent" 
                disabled={childId} 
              />
            </div>
            <div className="wf-field" style={{ background: '#fff' }}>
              <b>Date of birth</b>
              <input 
                type="date" 
                required 
                max={today} 
                value={dob} 
                onChange={e => setDob(e.target.value)} 
                className="w-full outline-none bg-transparent" 
                disabled={childId} 
              />
            </div>
          </div>
          <div className="row2">
            <div className="wf-field" style={{ background: '#fff' }}>
              <b>Sex</b>
              <select value={sex} onChange={e => setSex(e.target.value)} className="w-full outline-none bg-transparent" disabled={childId}>
                <option>Female</option>
                <option>Male</option>
              </select>
            </div>
            <div className="wf-field" style={{ background: '#fff' }}>
              <b>Sitio / Purok</b>
              <input 
                type="text" 
                value={sitio} 
                onChange={e => setSitio(e.target.value)} 
                className="w-full outline-none bg-transparent" 
                disabled={childId} 
              />
            </div>
          </div>
          <div className="row3">
            <div className="wf-field" style={{ background: '#fff' }}>
              <b>Household head</b>
              <input 
                type="text" 
                value={householdHead} 
                onChange={e => setHouseholdHead(e.target.value)} 
                className="w-full outline-none bg-transparent" 
                disabled={childId} 
              />
            </div>
            <div className="wf-field" style={{ background: '#fff' }}>
              <b>Guardian contact no.</b>
              <input 
                type="tel" 
                maxLength="11" 
                value={contactNo} 
                onChange={e => {
                  // This strictly removes anything that isn't a number
                  const onlyNumbers = e.target.value.replace(/\D/g, '');
                  setContactNo(onlyNumbers);
                }} 
                className="w-full outline-none bg-transparent" 
                placeholder="09xxxxxxxxx" 
                disabled={childId} 
              />
            </div>
            <div className="wf-field" style={{ background: '#f0f9ff', borderColor: '#0284c7' }}>
              <b style={{ color: '#0369a1' }}>Parent App Email (Required)</b>
              <input 
                type="email" 
                required 
                value={parentEmail} 
                onChange={e => setParentEmail(e.target.value)} 
                className="w-full outline-none bg-transparent" 
                placeholder="Required for parent access" 
                disabled={childId} 
              />
            </div>
          </div>
          
          {!childId && (
            <div style={{ marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#f8f4eb', padding: '10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
              <input 
                type="checkbox" 
                id="dpaConsent" 
                checked={consentGiven} 
                onChange={(e) => setConsentGiven(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <label htmlFor="dpaConsent" style={{ color: 'var(--muted)', lineHeight: '1.4' }}>
                <b style={{ color: 'var(--maroon)' }}>Data Privacy Consent:</b> I confirm that the parent/guardian has agreed to allow the RHU to collect and process their child's health and personal data for the Community Nutrition Monitoring System in compliance with RA 10173.
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn ghost" disabled={childId || isSaving || (!consentGiven && !childId)}>
              {childId ? 'Profile Locked ✓' : 'Save New Profile'}
            </button>
            {childId && (
               <button type="button" className="btn ghost" style={{ borderColor: 'var(--muted)', color: 'var(--muted)' }} onClick={handleAddAnother}>
                 Clear Selection
               </button>
            )}
          </div>
        </div>
      </form>

      {/* ANTHROPOMETRIC MEASUREMENT FORM */}
      <form className="frame" onSubmit={handleMeasurementSubmit}>
        <div className="fhead">Record Anthropometric Measurement — OPT+ Round <span className="role">Visit entry</span></div>
        <div className="fbody">
          <div className="row3">
            <div className="wf-field" style={{ background: '#fff' }}>
              <b>Height / Length (cm)</b>
              <input 
                type="number" 
                step="0.1" 
                min="30" 
                max="150" 
                title="Must be between 30cm and 150cm"
                required 
                value={height} 
                onChange={e => setHeight(e.target.value)} 
                className="w-full outline-none bg-transparent" 
              />
            </div>
            <div className="wf-field" style={{ background: '#fff' }}>
              <b>Weight (kg)</b>
              <input 
                type="number" 
                step="0.1" 
                min="1" 
                max="40" 
                title="Must be between 1kg and 40kg"
                required 
                value={weight} 
                onChange={e => setWeight(e.target.value)} 
                className="w-full outline-none bg-transparent" 
              />
            </div>
            <div className="wf-field" style={{ background: '#fff' }}>
              <b>MUAC (cm)</b>
              <input 
                type="number" 
                step="0.1" 
                min="5" 
                max="25" 
                title="Must be between 5cm and 25cm"
                required 
                value={muac} 
                onChange={e => setMuac(e.target.value)} 
                className="w-full outline-none bg-transparent" 
              />
            </div>
          </div>
          <div className="wf-field" style={{ background: '#fff' }}>
            <b>Visit date</b>
            <input 
              type="date" 
              required 
              max={today} 
              value={visitDate} 
              onChange={e => setVisitDate(e.target.value)} 
              className="w-full outline-none bg-transparent" 
            />
          </div>
          <button type="submit" className="btn" disabled={isSaving}>Submit &amp; Classify Automatically →</button>
          <div className="note">On submit, system computes HAZ / WAZ / WHZ based on standard algorithms.</div>
        </div>
      </form>

      {/* AFTER SUBMISSION CONFIRMATION */}
      {isSubmitted && currentClassification && (
        <div className="frame" id="bns-confirmation">
          <div className="fhead">Submission Result <span className="role">Auto-generated</span></div>
          <div className="fbody">
            <div className="confirm-card">
              <div className="check">✓</div>
              <h3>Measurement Recorded</h3>
              <p>{fullName} · Visit date {visitDate} · Height {height}cm · Weight {weight}kg · MUAC {muac}cm</p>
              
              <div className="wf-field" style={{ textAlign: 'left', background: '#fff' }}>
                <b>Auto-classification ({currentClassification.age_in_months} months old)</b><br/>
                HAZ {currentClassification.haz} &nbsp;|&nbsp; 
                WAZ {currentClassification.waz} &nbsp;|&nbsp; 
                WHZ {currentClassification.whz_bmi} &nbsp;
                <span className={`pill ${currentClassification.classification_result === 'Normal' ? 'normal' : currentClassification.classification_result.includes('Severely') ? 'risk' : 'watch'}`}>
                  {currentClassification.classification_result}
                </span>
              </div>
              
              <div className="confirm-actions">
                <button type="button" className="btn" onClick={() => setActiveTab('classify')}>
                  View Full Classification →
                </button>
                <button type="button" className="btn ghost">Mark for Follow-up</button>
                <button type="button" className="btn ghost" onClick={handleAddAnother}>
                  ＋ Input Next Child
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
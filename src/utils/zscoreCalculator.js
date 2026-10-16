// src/utils/zscoreCalculator.js

/**
 * Calculates the exact age in months between birth and visit date.
 */
export function calculateAgeInMonths(dob, visitDate) {
  const birth = new Date(dob);
  const visit = new Date(visitDate);
  
  let months = (visit.getFullYear() - birth.getFullYear()) * 12;
  months -= birth.getMonth();
  months += visit.getMonth();
  
  if (visit.getDate() < birth.getDate()) {
    months--;
  }
  return months >= 0 ? months : 0;
}

/**
 * Evaluates the anthropometric measurements based on WHO guidelines.
 * For the capstone prototype, this uses an approximation algorithm. 
 */
export function evaluateMeasurements(dob, visitDate, sex, weightKg, heightCm) {
  const ageMonths = calculateAgeInMonths(dob, visitDate);
  
  // MOCK WHO LMS BASELINE
  const expectedWeight = sex === 'Male' ? (ageMonths * 0.25) + 3.3 : (ageMonths * 0.24) + 3.2;
  const expectedHeight = sex === 'Male' ? (ageMonths * 0.8) + 50 : (ageMonths * 0.78) + 49;
  
  let waz = parseFloat(((weightKg - expectedWeight) / (expectedWeight * 0.12)).toFixed(1));
  let haz = parseFloat(((heightCm - expectedHeight) / (expectedHeight * 0.05)).toFixed(1));
  
  waz = Math.max(-5, Math.min(waz, 5));
  haz = Math.max(-5, Math.min(haz, 5));
  
  let whz = parseFloat(((waz + haz) / 2).toFixed(1)); 

  let classificationResult = 'Normal';
  
  if (waz < -3 || whz < -3 || haz < -3) {
    classificationResult = 'Severely Underweight';
  } else if (waz < -2) {
    classificationResult = 'Underweight';
  } else if (whz < -2) {
    classificationResult = 'Wasted';
  } else if (haz < -2) {
    classificationResult = 'Stunted';
  } else if (whz > 2) {
    classificationResult = 'Overweight';
  }

  return {
    age_in_months: ageMonths,
    haz: haz,
    waz: waz,
    whz_bmi: whz,
    classification_result: classificationResult
  };
}
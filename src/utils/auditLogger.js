// src/utils/auditLogger.js
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Silently records user actions to the Firestore audit_logs collection.
 * 
 * @param {string} userId - The Firebase Auth UID of the user performing the action.
 * @param {string} action - A short uppercase string categorizing the action (e.g., 'LOGIN', 'REGISTER_CHILD').
 * @param {string} details - A human-readable description of what was changed.
 */
export async function logActivity(userId, action, details) {
  if (!userId) return; // Prevent logging if user is somehow undefined
  
  try {
    await addDoc(collection(db, 'audit_logs'), {
      user_id: userId,
      action: action,
      details: details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    // We only log to console so it doesn't interrupt the user's workflow if logging fails
    console.error("Audit Log Error:", error);
  }
}
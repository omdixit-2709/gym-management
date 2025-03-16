import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { WalkIn } from '../types/walkIn';

export const useWalkIns = () => {
  const [walkIns, setWalkIns] = useState<WalkIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const walkInsRef = collection(db, 'walkIns');
    const q = query(walkInsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const walkInsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WalkIn[];

        setWalkIns(walkInsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching walk-ins:', err);
        setError('Failed to fetch walk-ins');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const refreshWalkIns = () => {
    setLoading(true);
    // The onSnapshot listener will automatically update the data
  };

  return {
    walkIns,
    loading,
    error,
    refreshWalkIns,
  };
}; 
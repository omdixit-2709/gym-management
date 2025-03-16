import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Member } from '../types/member';

export const useMembers = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'members'));
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const membersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Member[];
        setMembers(membersData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching members:', err);
        setError('Failed to fetch members');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const refreshMembers = () => {
    setLoading(true);
    // The onSnapshot listener will automatically update the data
  };

  return { members, loading, error, refreshMembers };
};

export default useMembers; 
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminTeamsPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the main teams page
    router.replace('/teams');
  }, [router]);
  
  return null;
}
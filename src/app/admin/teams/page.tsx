'use client';

import { useRouter } from 'next/navigation';

export default function AdminTeamsPage() {
  const router = useRouter();
  
  // Redirect to the main teams page
  router.replace('/teams');
  
  return null;
}
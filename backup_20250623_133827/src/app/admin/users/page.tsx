'use client';

import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
  const router = useRouter();
  
  // Redirect to the main users page
  router.replace('/users');
  
  return null;
}
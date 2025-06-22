'use client';

import React, { useState } from 'react';
import UserManager from '@/components/users/UserManager';
import type { User } from '@/types/user-management';

export default function UsersPage() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Handle user selection from the manager
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    // The UserManager handles all modal logic internally
  };

  return (
    <div className="users-page">
      <UserManager 
        onUserSelect={handleUserSelect}
        selectedUserId={selectedUser?.id}
        showActions={true}
      />
    </div>
  );
}
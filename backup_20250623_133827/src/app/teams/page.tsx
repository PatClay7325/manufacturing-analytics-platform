'use client';

import React, { useState } from 'react';
import TeamManager from '@/components/teams/TeamManager';
import { useAuth } from '@/contexts/AuthContext';
import type { Team, CreateTeamRequest, UpdateTeamRequest } from '@/types/user-management';

export default function TeamsPage() {
  const { hasPermission } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Handle team creation
  const handleCreateTeam = async (teamData: CreateTeamRequest) => {
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create team');
      }

      // The TeamManager will refresh automatically
    } catch (error) {
      console.error('Error creating team:', error);
      throw error; // Let the form component handle the error
    }
  };

  // Handle team update
  const handleUpdateTeam = async (teamData: UpdateTeamRequest) => {
    if (!selectedTeam) return;

    try {
      const response = await fetch(`/api/teams/${selectedTeam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update team');
      }

      setSelectedTeam(null);
      // The TeamManager will refresh automatically
    } catch (error) {
      console.error('Error updating team:', error);
      throw error; // Let the form component handle the error
    }
  };

  // Handle team selection from the manager
  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    // You could open an edit modal here or navigate to a detail page
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <TeamManager 
        onTeamSelect={handleTeamSelect}
        selectedTeamId={selectedTeam?.id}
        showActions={true}
      />

      {/* Team forms and modals would go here */}
      {/* For now, we'll just use the basic functionality */}
    </div>
  );
}
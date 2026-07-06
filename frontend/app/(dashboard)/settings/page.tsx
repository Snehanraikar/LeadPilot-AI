'use client';

import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { authService } from '../../../services/auth.service';
import { useAuthStore } from '../../../store/auth.store';
import { toast } from 'sonner';
import { ApiClientError } from '../../../lib/api-client';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  const isDirty = firstName !== user.firstName || lastName !== user.lastName;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await authService.updateMe({ firstName, lastName });
      setUser(updated);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="text-sm text-muted mt-0.5">Manage your profile and organization</p>
      </div>

      <div className="glass-card card-hover p-6 space-y-4 animate-fade-in" style={{ animationFillMode: 'backwards' }}>
        <h2 className="text-sm font-semibold text-text">Profile</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <Input label="Email" value={user.email} disabled />
        <div className="flex justify-end">
          <Button size="sm" disabled={!isDirty} isLoading={isSaving} onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </div>

      <div className="glass-card card-hover p-6 space-y-4 animate-fade-in" style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}>
        <h2 className="text-sm font-semibold text-text">Organization</h2>
        <Input label="Organization name" value={user.organization.name} disabled />
        <Input label="Role" value={user.role.replace('_', ' ')} disabled />
      </div>
    </div>
  );
}

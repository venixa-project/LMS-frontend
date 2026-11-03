// ============================================================
// LMS - User Directory (Clean / Empty Production State)
// All mock user accounts removed - authentication relies on PostgreSQL
// ============================================================
import { User } from '../types';

export const mockUsers: User[] = [];

export const demoAccounts: {
  email: string;
  role: string;
  name: string;
  desc: string;
  badge: string;
  color: string;
}[] = [];

// ═══════════════════════════════════════════════
// FILEHUB — Type Definitions
// ═══════════════════════════════════════════════

export type ViewType =
  | 'dashboard' | 'expenses' | 'shared-finances' | 'work' | 'tasks'
  | 'goals' | 'calendar' | 'trips' | 'shopping' | 'nutrition'
  | 'ideas' | 'ai-hub' | 'qr' | 'settings' | 'fitness'
  | 'courses' | 'news' | 'notebook' | 'notebook-ai' | 'medico'
  | 'carplay' | 'partner' | 'openwebui' | 'monthly-analysis'
  | 'social' | 'coordinador' | 'files';

export interface Expense {
  id: string;
  user_id?: string;
  amount: number;
  vendor: string;
  date: string;
  category: string;
  description?: string;
  priority?: string;
  isRecurring?: boolean;
  frequency?: string;
}

export interface Project {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  status: string;
  progress: number;
}

export interface Trip {
  id: string;
  user_id?: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget?: number;
  status: string;
  notebookUrl?: string;
}

export interface CalendarEvent {
  id: string;
  user_id?: string;
  title: string;
  start: string;
  end: string;
  type: string;
}

export interface Goal {
  id: string;
  user_id?: string;
  title: string;
  status: string;
  category: string;
  targetDate?: string;
  currentValue: number;
  targetValue: number;
}

export interface Task {
  id: string;
  user_id?: string;
  title: string;
  completed: boolean;
  category: string;
  priority: string;
  dueDate?: string;
  isRecurring?: boolean;
  frequency?: string;
}

export interface ShoppingItem {
  id: string;
  user_id?: string;
  name: string;
  category: string;
  completed: boolean;
  estimatedPrice?: number;
}

export interface ShoppingOrder {
  id: string;
  user_id?: string;
  name: string;
  status: string;
  trackingNumber?: string;
  platform?: string;
}

export interface Idea {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  createdAt?: string;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  isActive: boolean;
  apiKey?: string;
}

export interface OpenNotebookConfig {
  baseUrl: string;
  collectionName: string;
  isActive: boolean;
}

export interface Debt {
  id: string;
  user_id?: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  dueDate?: string;
  category?: string;
  interestRate?: number;
}

export interface Investment {
  id: string;
  user_id?: string;
  name: string;
  amount: number;
  date: string;
  status: string;
  category?: string;
  expectedReturn?: number;
}

export interface Presentation {
  id: string;
  user_id?: string;
  title: string;
  subject?: string;
  status: string;
  dueDate?: string;
}

export interface SharedExpense {
  id: string;
  user_id?: string;
  description: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
  date: string;
  category?: string;
}

export interface SharedDebt {
  id: string;
  user_id?: string;
  from_person: string;
  to_person: string;
  amount: number;
  settled: boolean;
}

export interface StoredFile {
  id: string;
  user_id?: string;
  name: string;
  type: string;
  size: number;
  content?: string;
  aiSummary?: string;
}

export interface WeightEntry {
  id: string;
  user_id?: string;
  weight: number;
  date: string;
}

export interface NutritionPlan {
  id: string;
  user_id?: string;
  name: string;
  calories?: number;
  uploadDate?: string;
}

export interface TrainingSession {
  id: string;
  user_id?: string;
  title: string;
  date: string;
  type: string;
  duration?: number;
  intensity?: string;
  status: string;
  notes?: string;
}

export interface TrainingPlan {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  durationWeeks?: number;
  source?: string;
}

export interface Partnership {
  id: string;
  user_email: string;
  partner_email: string;
  status: string;
}

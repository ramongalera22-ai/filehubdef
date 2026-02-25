
import React, { useState, useEffect, useRef, lazy, Suspense, useCallback, useMemo } from 'react';
import { ViewType, Expense, Project, Trip, CalendarEvent, Goal, Task, ShoppingItem, ShoppingOrder, Idea, OllamaConfig, OpenNotebookConfig, Debt, Investment, Presentation, SharedExpense, SharedDebt, StoredFile, WeightEntry, NutritionPlan, TrainingSession, TrainingPlan, Partnership } from './types';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
const SmartNotebook = lazy(() => import('./components/SmartNotebook'));
import { processUniversalDocument } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import {
  Search, Bell, X, FileText, Sparkles, Menu, Receipt, Database, User, Moon, Sun, Wifi
} from 'lucide-react';

// ============================================
// OPTIMIZACIÓN 3: LAZY LOADING DE COMPONENTES
// Cada vista se carga SOLO cuando el usuario navega a ella.
// Reduce el bundle inicial de ~18K líneas a ~2K.
// ============================================
const Dashboard = lazy(() => import('./components/Dashboard'));
const ExpenseTracker = lazy(() => import('./components/ExpenseTracker'));
const AICoach = lazy(() => import('./components/AICoach'));
const ProjectManager = lazy(() => import('./components/ProjectManager'));
const FitnessView = lazy(() => import('./components/FitnessView'));
const NutritionView = lazy(() => import('./components/NutritionView'));
const WorkView = lazy(() => import('./components/WorkView'));
const TasksView = lazy(() => import('./components/TasksView'));
const LearningView = lazy(() => import('./components/LearningView'));
const GoalsView = lazy(() => import('./components/GoalsView'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const OmniAssistant = lazy(() => import('./components/OmniAssistant'));
const TripsView = lazy(() => import('./components/TripsView'));
const ShoppingView = lazy(() => import('./components/ShoppingView'));
const QRView = lazy(() => import('./components/QRView'));
const IdeasView = lazy(() => import('./components/IdeasView'));
const AIHubView = lazy(() => import('./components/AIHubView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const SharedFinancesView = lazy(() => import('./components/SharedFinancesView'));
const AuthView = lazy(() => import('./components/AuthView'));
const FilesView = lazy(() => import('./components/FilesView'));
const FilePreviewModal = lazy(() => import('./components/FilePreviewModal'));
const NewsView = lazy(() => import('./components/NewsView'));
const NotebookView = lazy(() => import('./components/NotebookView'));
const NotebookAIView = lazy(() => import('./components/NotebookAIView'));
const MedicoWorkHub = lazy(() => import('./components/MedicoWorkHub'));
const CarPlayView = lazy(() => import('./components/CarPlayView'));
const PartnerHubView = lazy(() => import('./components/PartnerHubView'));
const OpenWebUIView = lazy(() => import('./components/OpenWebUIView'));
const MonthlyAnalysisView = lazy(() => import('./components/MonthlyAnalysisView'));
const SocialView = lazy(() => import('./components/SocialView'));
const CoordinadorView = lazy(() => import('./components/CoordinadorView'));

// ============================================
// OPTIMIZACIÓN 4: LOADING SKELETON
// Feedback visual mientras se carga un chunk
// ============================================
const ViewLoader = () => (
  <div className="flex items-center justify-center h-64 w-full">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Cargando módulo...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // OPTIMIZACIÓN: Leer tema en inicialización, no en useEffect
    return localStorage.getItem('filehub_theme') === 'dark';
  });

  // App Data State
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  // Cloud Synced State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [shoppingOrders, setShoppingOrders] = useState<ShoppingOrder[]>([]);
  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>([]);
  const [sharedDebts, setSharedDebts] = useState<SharedDebt[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([]);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([]);

  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);
  const [isDBReady, setIsDBReady] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [notebookOpen, setNotebookOpen] = useState<{ section: string; label: string } | null>(null);

  const getBackendUrl = useCallback((port: number) => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.includes('duckdns.org')) {
      return `http://${host}:${port}`;
    }
    return `http://filehub-casa.duckdns.org:${port}`;
  }, []);

  const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>(() => ({
    baseUrl: getBackendUrl(11434),
    model: 'llama3',
    isActive: false,
    apiKey: '9910c6ebb8f744bb9f2db216e39c0b60.G9r3mMB-WnPbeVrUVAj14NKG'
  }));

  const [openNotebookConfig, setOpenNotebookConfig] = useState<OpenNotebookConfig>(() => ({
    baseUrl: getBackendUrl(8000),
    collectionName: 'my-docs',
    isActive: false
  }));

  const scanInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // OPTIMIZACIÓN 5: CARGA DE DATOS EN PARALELO
  // Antes: 18 queries secuenciales (~3-5s)
  // Ahora: 3 batches en paralelo (~0.8-1.2s)
  // ============================================
  const loadCloudData = useCallback(async (userId: string, userEmail: string) => {
    setIsDBReady(false);

    try {
      // BATCH 1: Datos críticos para el Dashboard (se muestran primero)
      const [expRes, taskRes, evtRes, goalRes] = await Promise.all([
        supabase.from('expenses').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('calendar_events').select('*').eq('user_id', userId),
        supabase.from('goals').select('*').eq('user_id', userId),
      ]);

      if (expRes.data) setExpenses(expRes.data);
      if (taskRes.data) setTasks(taskRes.data.map((t: any) => ({
        id: t.id, title: t.title, completed: t.completed, category: t.category, priority: t.priority,
        dueDate: t.due_date, isRecurring: t.is_recurring, frequency: t.frequency
      })));
      if (evtRes.data) setCalendarEvents(evtRes.data.map((e: any) => ({
        id: e.id, title: e.title, start: e.start_date, end: e.end_date, type: e.type
      })));
      if (goalRes.data) setGoals(goalRes.data.map((g: any) => ({
        ...g, targetDate: g.target_date, currentValue: g.current_value, targetValue: g.target_value
      })));

      // Marcar DB como lista después del batch crítico
      setIsDBReady(true);

      // BATCH 2: Datos secundarios (se cargan en background)
      const [projRes, ideaRes, shopRes, debtRes, investRes, tripRes] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', userId),
        supabase.from('ideas').select('*').eq('user_id', userId),
        supabase.from('shopping_items').select('*').eq('user_id', userId),
        supabase.from('debts').select('*').eq('user_id', userId),
        supabase.from('investments').select('*').eq('user_id', userId),
        supabase.from('trips').select('*').eq('user_id', userId),
      ]);

      if (projRes.data) setProjects(projRes.data);
      if (ideaRes.data) setIdeas(ideaRes.data.map((i: any) => ({ ...i, createdAt: i.created_at })));
      if (shopRes.data) setShoppingItems(shopRes.data.map((s: any) => ({ ...s, estimatedPrice: s.estimated_price })));
      if (debtRes.data) setDebts(debtRes.data.map((d: any) => ({
        ...d, totalAmount: d.total_amount, paidAmount: d.paid_amount, dueDate: d.due_date, interestRate: d.interest_rate
      })));
      if (investRes.data) setInvestments(investRes.data.map((i: any) => ({ ...i, expectedReturn: i.expected_return })));
      if (tripRes.data) setTrips(tripRes.data.map((t: any) => ({
        ...t, startDate: t.start_date, endDate: t.end_date, notebookUrl: t.notebook_url
      })));

      // BATCH 3: Datos terciarios
      const [ordRes, shExpRes, shDebtRes, weightRes, nutRes, fileRes, presRes, trainRes, planRes, partRes] = await Promise.all([
        supabase.from('shopping_orders').select('*').eq('user_id', userId),
        supabase.from('shared_expenses').select('*').eq('user_id', userId),
        supabase.from('shared_debts').select('*').eq('user_id', userId),
        supabase.from('weight_entries').select('*').eq('user_id', userId),
        supabase.from('nutrition_plans').select('*').eq('user_id', userId),
        supabase.from('files').select('*').eq('user_id', userId),
        supabase.from('presentations').select('*').eq('user_id', userId),
        supabase.from('training_sessions').select('*').eq('user_id', userId),
        supabase.from('training_plans').select('*').eq('user_id', userId),
        supabase.from('partnerships')
          .select('*')
          .or(`partner_email.eq.${userEmail},user_email.eq.${userEmail}`)
          .single(),
      ]);

      if (ordRes.data) setShoppingOrders(ordRes.data.map((o: any) => ({ ...o, trackingNumber: o.tracking_number })));
      if (shExpRes.data) setSharedExpenses(shExpRes.data.map((e: any) => ({ ...e, splitBetween: e.split_between, paidBy: e.paid_by })));
      if (shDebtRes.data) setSharedDebts(shDebtRes.data);
      if (weightRes.data) setWeightEntries(weightRes.data);
      if (nutRes.data) setNutritionPlans(nutRes.data.map((p: any) => ({ ...p, uploadDate: p.upload_date })));
      if (fileRes.data) setFiles(fileRes.data.map((f: any) => ({ ...f, aiSummary: f.ai_summary })));
      if (presRes.data) setPresentations(presRes.data.map((p: any) => ({ ...p, dueDate: p.due_date })));
      if (trainRes.data) setTrainingSessions(trainRes.data);
      if (planRes.data) setTrainingPlans(planRes.data.map((p: any) => ({ ...p, durationWeeks: p.duration_weeks })));
      if (partRes.data) setPartnership(partRes.data);

    } catch (e) {
      console.error("Error loading cloud data", e);
      setIsDBReady(true); // No bloquear UI en caso de error
    }
  }, []);

  // Check Supabase Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setIsAuthenticated(true);
        setCurrentUser(session.user.email);
        loadCloudData(session.user.id, session.user.email!);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setIsAuthenticated(true);
        setCurrentUser(session.user.email);
        loadCloudData(session.user.id, session.user.email!);
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadCloudData]);

  // Theme Handling - OPTIMIZADO: solo sincroniza con DOM, no lee de localStorage
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('filehub_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('filehub_theme', 'light');
    }
  }, [darkMode]);

  const handleLogin = useCallback((user: any) => {
    // Handled by onAuthStateChange in useEffect
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    // Reset all state in one batch
    setExpenses([]);
    setCalendarEvents([]);
    setTasks([]);
    setProjects([]);
    setGoals([]);
    setIdeas([]);
    setShoppingItems([]);
    setDebts([]);
    setInvestments([]);
    setFiles([]);
    setTrips([]);
    setPresentations([]);
    setSharedExpenses([]);
    setSharedDebts([]);
    setWeightEntries([]);
    setNutritionPlans([]);
    setShoppingOrders([]);
    setTrainingSessions([]);
    setTrainingPlans([]);
  }, []);

  // ============================================
  // OPTIMIZACIÓN 6: MEMOIZAR globalContext
  // Evita re-renders en cascada de todos los hijos
  // ============================================
  const globalContext = useMemo(() => ({
    expenses, debts, investments, projects, goals, tasks, calendarEvents,
    trips, shoppingItems, shoppingOrders, ideas, presentations, sharedExpenses,
    sharedDebts, files, weightEntries, trainingSessions
  }), [expenses, debts, investments, projects, goals, tasks, calendarEvents,
       trips, shoppingItems, shoppingOrders, ideas, presentations, sharedExpenses,
       sharedDebts, files, weightEntries, trainingSessions]);

  const handleScanClick = useCallback(() => scanInputRef.current?.click(), []);

  const handleFileSelection = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setPreviewFile(file);
    event.target.value = '';
  }, []);

  const processFileWithAI = useCallback(async () => {
    if (!previewFile) return;
    const fileToProcess = previewFile;
    setPreviewFile(null);
    setIsScanning(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const mimeType = fileToProcess.type || "application/octet-stream";
      try {
        const results = await processUniversalDocument(base64, mimeType);
        if (results.expenses && results.expenses.length > 0) {
          const newExps = results.expenses.map((e: any) => ({
            ...e,
            id: `ai-exp-${Date.now()}-${Math.random()}`,
            user_id: session?.user.id
          }));
          setExpenses(prev => [...newExps, ...prev]);
          if (session) {
            const { error } = await supabase.from('expenses').insert(newExps);
            if (error) console.error("Error saving AI expenses", error);
          }
        }
        setScanResults(results);
      } catch (error) {
        console.error(error);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(fileToProcess);
  }, [previewFile, session]);

  // ============================================
  // CRUD HANDLERS - MEMOIZADOS con useCallback
  // Evita que cada handler recree su función en cada render
  // ============================================

  // EXPENSES
  const handleAddExpense = useCallback(async (e: Expense) => {
    setExpenses(prev => [e, ...prev]);
    if (session) {
      await supabase.from('expenses').insert({
        id: e.id, user_id: session.user.id, amount: e.amount, vendor: e.vendor, date: e.date,
        category: e.category, description: e.description, priority: e.priority, is_recurring: e.isRecurring, frequency: e.frequency
      });
    }
  }, [session]);

  const handleDeleteExpense = useCallback(async (id: string) => {
    if (confirm("¿Eliminar este gasto?")) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      if (session) await supabase.from('expenses').delete().eq('id', id);
    }
  }, [session]);

  const handleUpdateExpense = useCallback(async (e: Expense) => {
    setExpenses(prev => prev.map(ex => ex.id === e.id ? e : ex));
    if (session) await supabase.from('expenses').update({
      amount: e.amount, vendor: e.vendor, date: e.date, category: e.category, description: e.description
    }).eq('id', e.id);
  }, [session]);

  // DEBTS
  const handleAddDebt = useCallback(async (d: Debt) => {
    setDebts(prev => [...prev, d]);
    if (session) await supabase.from('debts').insert({
      id: d.id, user_id: session.user.id, name: d.name, total_amount: d.totalAmount, paid_amount: d.paidAmount,
      due_date: d.dueDate, category: d.category, interest_rate: d.interestRate
    });
  }, [session]);

  // INVESTMENTS
  const handleAddInvestment = useCallback(async (i: Investment) => {
    setInvestments(prev => [...prev, i]);
    if (session) await supabase.from('investments').insert({
      id: i.id, user_id: session.user.id, name: i.name, amount: i.amount, date: i.date,
      status: i.status, category: i.category, expected_return: i.expectedReturn
    });
  }, [session]);

  // EVENTS
  const handleAddEvent = useCallback(async (e: CalendarEvent) => {
    setCalendarEvents(prev => [...prev, e]);
    if (session) await supabase.from('calendar_events').insert({
      id: e.id, user_id: session.user.id, title: e.title, start_date: e.start, end_date: e.end, type: e.type
    });
  }, [session]);

  const handleDeleteEvent = useCallback(async (id: string) => {
    setCalendarEvents(prev => prev.filter(e => e.id !== id));
    if (session) await supabase.from('calendar_events').delete().eq('id', id);
  }, [session]);

  // TASKS
  const handleAddTask = useCallback(async (t: Task) => {
    setTasks(prev => [...prev, t]);
    if (session) await supabase.from('tasks').insert({
      id: t.id, user_id: session.user.id, title: t.title, completed: t.completed, category: t.category,
      priority: t.priority, due_date: t.dueDate, is_recurring: t.isRecurring, frequency: t.frequency
    });
  }, [session]);

  const handleToggleTask = useCallback(async (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    if (session) {
      const task = tasks.find(t => t.id === id);
      if (task) await supabase.from('tasks').update({ completed: !task.completed }).eq('id', id);
    }
  }, [session, tasks]);

  const handleDeleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (session) await supabase.from('tasks').delete().eq('id', id);
  }, [session]);

  // GOALS
  const handleAddGoal = useCallback(async (g: Goal) => {
    setGoals(prev => [...prev, g]);
    if (session) await supabase.from('goals').insert({
      id: g.id, user_id: session.user.id, title: g.title, status: g.status, category: g.category,
      target_date: g.targetDate, current_value: g.currentValue, target_value: g.targetValue
    });
  }, [session]);

  const handleUpdateGoal = useCallback(async (g: Goal) => {
    setGoals(prev => prev.map(goal => goal.id === g.id ? g : goal));
    if (session) await supabase.from('goals').update({
      title: g.title, status: g.status, category: g.category, target_date: g.targetDate,
      current_value: g.currentValue, target_value: g.targetValue
    }).eq('id', g.id);
  }, [session]);

  const handleDeleteGoal = useCallback(async (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    if (session) await supabase.from('goals').delete().eq('id', id);
  }, [session]);

  // IDEAS
  const handleAddIdea = useCallback(async (i: Idea) => {
    setIdeas(prev => [...prev, i]);
    if (session) await supabase.from('ideas').insert({
      id: i.id, user_id: session.user.id, title: i.title, description: i.description, category: i.category, status: i.status
    });
  }, [session]);

  const handleDeleteIdea = useCallback(async (id: string) => {
    setIdeas(prev => prev.filter(i => i.id !== id));
    if (session) await supabase.from('ideas').delete().eq('id', id);
  }, [session]);

  const handleUpdateIdea = useCallback(async (i: Idea) => {
    setIdeas(prev => prev.map(idea => idea.id === i.id ? i : idea));
    if (session) await supabase.from('ideas').update({
      title: i.title, description: i.description, category: i.category, status: i.status
    }).eq('id', i.id);
  }, [session]);

  // SHOPPING
  const handleAddItem = useCallback(async (item: ShoppingItem) => {
    setShoppingItems(prev => [...prev, item]);
    if (session) await supabase.from('shopping_items').insert({
      id: item.id, user_id: session.user.id, name: item.name, category: item.category,
      completed: item.completed, estimated_price: item.estimatedPrice
    });
  }, [session]);

  const handleToggleItem = useCallback(async (id: string) => {
    setShoppingItems(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
    if (session) {
      const item = shoppingItems.find(i => i.id === id);
      if (item) await supabase.from('shopping_items').update({ completed: !item.completed }).eq('id', id);
    }
  }, [session, shoppingItems]);

  const handleDeleteItem = useCallback(async (id: string) => {
    setShoppingItems(prev => prev.filter(i => i.id !== id));
    if (session) await supabase.from('shopping_items').delete().eq('id', id);
  }, [session]);

  const handleAddOrder = useCallback(async (order: ShoppingOrder) => {
    setShoppingOrders(prev => [...prev, order]);
    if (session) await supabase.from('shopping_orders').insert({
      id: order.id, user_id: session.user.id, name: order.name, status: order.status,
      tracking_number: order.trackingNumber, platform: order.platform
    });
  }, [session]);

  // TRIPS
  const handleAddTrip = useCallback(async (t: Trip) => {
    setTrips(prev => [...prev, t]);
    if (session) await supabase.from('trips').insert({
      id: t.id, user_id: session.user.id, destination: t.destination, start_date: t.startDate,
      end_date: t.endDate, budget: t.budget, status: t.status, notebook_url: t.notebookUrl
    });
  }, [session]);

  const handleDeleteTrip = useCallback(async (id: string) => {
    setTrips(prev => prev.filter(t => t.id !== id));
    if (session) await supabase.from('trips').delete().eq('id', id);
  }, [session]);

  // PROJECTS
  const handleAddProject = useCallback(async (p: Project) => {
    setProjects(prev => [...prev, p]);
    if (session) await supabase.from('projects').insert({
      id: p.id, user_id: session.user.id, name: p.name, description: p.description, status: p.status, progress: p.progress
    });
  }, [session]);

  const handleUpdateProject = useCallback(async (p: Project) => {
    setProjects(prev => prev.map(proj => proj.id === p.id ? p : proj));
    if (session) await supabase.from('projects').update({
      name: p.name, description: p.description, status: p.status, progress: p.progress
    }).eq('id', p.id);
  }, [session]);

  // PRESENTATIONS
  const handleAddPresentation = useCallback(async (p: Presentation) => {
    setPresentations(prev => [...prev, p]);
    if (session) await supabase.from('presentations').insert({
      id: p.id, user_id: session.user.id, title: p.title, subject: p.subject, status: p.status, due_date: p.dueDate
    });
  }, [session]);

  // FILES
  const handleAddFile = useCallback(async (f: StoredFile) => {
    setFiles(prev => [...prev, f]);
    if (session) await supabase.from('files').insert({
      id: f.id, user_id: session.user.id, name: f.name, type: f.type, size: f.size, content: f.content, ai_summary: f.aiSummary
    });
  }, [session]);

  const handleDeleteFile = useCallback(async (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (session) await supabase.from('files').delete().eq('id', id);
  }, [session]);

  const handleUpdateFile = useCallback(async (f: StoredFile) => {
    setFiles(prev => prev.map(file => file.id === f.id ? f : file));
    if (session) await supabase.from('files').update({
      name: f.name, ai_summary: f.aiSummary
    }).eq('id', f.id);
  }, [session]);

  // SHARED FINANCES
  const handleAddSharedExpense = useCallback(async (e: SharedExpense) => {
    setSharedExpenses(prev => [...prev, e]);
    if (session) await supabase.from('shared_expenses').insert({
      id: e.id, user_id: session.user.id, description: e.description, amount: e.amount,
      paid_by: e.paidBy, split_between: e.splitBetween, date: e.date, category: e.category
    });
  }, [session]);

  const handleSettleSharedDebt = useCallback(async (id: string) => {
    setSharedDebts(prev => prev.map(d => d.id === id ? { ...d, settled: true } : d));
    if (session) await supabase.from('shared_debts').update({ settled: true }).eq('id', id);
  }, [session]);

  const handleAddSharedDebt = useCallback(async (d: SharedDebt) => {
    setSharedDebts(prev => [...prev, d]);
    if (session) await supabase.from('shared_debts').insert({
      id: d.id, user_id: session.user.id, from_person: d.from_person, to_person: d.to_person,
      amount: d.amount, settled: d.settled
    });
  }, [session]);

  // WEIGHT & NUTRITION
  const handleAddWeight = useCallback(async (w: WeightEntry) => {
    setWeightEntries(prev => [...prev, w]);
    if (session) await supabase.from('weight_entries').insert({
      id: w.id, user_id: session.user.id, weight: w.weight, date: w.date
    });
  }, [session]);

  const handleAddNutritionPlan = useCallback(async (p: NutritionPlan) => {
    setNutritionPlans(prev => [...prev, p]);
    if (session) await supabase.from('nutrition_plans').insert({
      id: p.id, user_id: session.user.id, name: p.name, calories: p.calories, upload_date: p.uploadDate
    });
  }, [session]);

  const handleDeletePlan = useCallback(async (id: string) => {
    setNutritionPlans(prev => prev.filter(p => p.id !== id));
    if (session) await supabase.from('nutrition_plans').delete().eq('id', id);
  }, [session]);

  // PARTNER
  const handleInvitePartner = useCallback(async (email: string) => {
    if (!session) return;
    const newPartnership = {
      id: `part-${Date.now()}`,
      user_email: currentUser!,
      partner_email: email,
      status: 'pending'
    };
    const { data, error } = await supabase.from('partnerships').insert(newPartnership).select().single();
    if (data) setPartnership(data);
  }, [session, currentUser]);

  // TRAINING
  const handleAddTrainingSession = useCallback(async (s: TrainingSession) => {
    setTrainingSessions(prev => [...prev, s]);
    if (session) await supabase.from('training_sessions').insert({
      id: s.id, user_id: session.user.id, title: s.title, date: s.date, type: s.type, duration: s.duration, intensity: s.intensity, status: s.status, notes: s.notes
    });
  }, [session]);

  const handleDeleteTrainingSession = useCallback(async (id: string) => {
    setTrainingSessions(prev => prev.filter(s => s.id !== id));
    if (session) await supabase.from('training_sessions').delete().eq('id', id);
  }, [session]);

  const handleAddTrainingPlan = useCallback(async (p: TrainingPlan) => {
    setTrainingPlans(prev => [...prev, p]);
    if (session) await supabase.from('training_plans').insert({
      id: p.id, user_id: session.user.id, name: p.name, description: p.description, duration_weeks: p.durationWeeks, source: p.source
    });
  }, [session]);

  const handleDeleteTrainingPlan = useCallback(async (id: string) => {
    setTrainingPlans(prev => prev.filter(p => p.id !== id));
    if (session) await supabase.from('training_plans').delete().eq('id', id);
  }, [session]);

  // ============================================
  // AUTH GUARD
  // ============================================
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<ViewLoader />}>
        <AuthView onLogin={handleLogin} />
      </Suspense>
    );
  }

  // ============================================
  // OPTIMIZACIÓN 7: RENDER CON SUSPENSE
  // ============================================
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return (
        <Dashboard
          expenses={expenses}
          globalContext={globalContext}
          tasks={tasks}
          events={calendarEvents}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onToggleTask={handleToggleTask}
          onAddExpense={handleAddExpense}
          onDeleteExpense={handleDeleteExpense}
        />
      );
      case 'files': return (
        <FilesView files={files} ollamaConfig={ollamaConfig} onAddFile={handleAddFile} onDeleteFile={handleDeleteFile} onUpdateFile={handleUpdateFile} />
      );
      case 'expenses': return (
        <ExpenseTracker expenses={expenses} debts={debts} investments={investments} onAddExpense={handleAddExpense} onUpdateExpense={handleUpdateExpense} onDeleteExpense={handleDeleteExpense} onAddDebt={handleAddDebt} onAddInvestment={handleAddInvestment} />
      );
      case 'shared-finances': return (
        <SharedFinancesView sharedExpenses={sharedExpenses} sharedDebts={sharedDebts} onAddExpense={handleAddSharedExpense} onSettleDebt={handleSettleSharedDebt} onAddDebt={handleAddSharedDebt} />
      );
      case 'work': return (
        <WorkView initialProjects={projects} initialPresentations={presentations} initialTasks={tasks} ollamaConfig={ollamaConfig} onAddProject={handleAddProject} onAddTask={handleAddTask} onAddPresentation={handleAddPresentation} onUpdateProject={handleUpdateProject} />
      );
      case 'tasks': return (
        <TasksView tasks={tasks} calendarEvents={calendarEvents} expenses={expenses} onAddTask={handleAddTask} onToggleTask={handleToggleTask} onDeleteTask={handleDeleteTask} />
      );
      case 'goals': return (
        <GoalsView goals={goals} onAddGoal={handleAddGoal} onUpdateGoal={handleUpdateGoal} onDeleteGoal={handleDeleteGoal} />
      );
      case 'calendar': return (
        <CalendarView expenses={expenses} projects={projects} calendarEvents={calendarEvents} tasks={tasks} goals={goals} onAddEvent={handleAddEvent} onDeleteEvent={handleDeleteEvent} />
      );
      case 'trips': return (
        <TripsView trips={trips} onAddTrip={handleAddTrip} onDeleteTrip={handleDeleteTrip} />
      );
      case 'shopping': return (
        <ShoppingView items={shoppingItems} orders={shoppingOrders} onAddItem={handleAddItem} onToggleItem={handleToggleItem} onDeleteItem={handleDeleteItem} onAddOrder={handleAddOrder} />
      );
      case 'nutrition': return (
        <NutritionView weightEntries={weightEntries} nutritionPlans={nutritionPlans} onAddWeightEntry={handleAddWeight} onAddPlan={handleAddNutritionPlan} onDeletePlan={handleDeletePlan} />
      );
      case 'ideas': return (
        <IdeasView ideas={ideas} onAddIdea={handleAddIdea} onDeleteIdea={handleDeleteIdea} onUpdateIdea={handleUpdateIdea} />
      );
      case 'ai-hub': return (
        <AIHubView ollamaConfig={ollamaConfig} openNotebookConfig={openNotebookConfig} onUpdateConfig={setOllamaConfig} onUpdateNotebookConfig={setOpenNotebookConfig} globalContext={globalContext} />
      );
      case 'qr': return <QRView />;
      case 'settings': return (
        <SettingsView currentUser={currentUser || 'Invitado'} ollamaConfig={ollamaConfig} isDarkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)} />
      );
      case 'fitness': return (
        <FitnessView sessions={trainingSessions} plans={trainingPlans} onAddSession={handleAddTrainingSession} onDeleteSession={handleDeleteTrainingSession} onAddPlan={handleAddTrainingPlan} onDeletePlan={handleDeleteTrainingPlan} onSyncPlan={(events) => { events.forEach(ev => handleAddEvent(ev)); }} />
      );
      case 'courses': return <LearningView />;
      case 'news': return <NewsView />;
      case 'notebook': return <NotebookView />;
      case 'notebook-ai': return <NotebookAIView />;
      case 'medico': return <MedicoWorkHub />;
      case 'carplay': return <CarPlayView onClose={() => setCurrentView('dashboard')} />;
      case 'partner': return (
        <PartnerHubView partnership={partnership} sharedExpenses={sharedExpenses} currentUser={currentUser} onInvitePartner={handleInvitePartner} onAddSharedTask={handleAddTask} />
      );
      case 'openwebui': return <OpenWebUIView />;
      case 'monthly-analysis': return (
        <MonthlyAnalysisView expenses={expenses} tasks={tasks} events={calendarEvents} />
      );
      case 'social': return (
        <SocialView events={calendarEvents} />
      );
      case 'coordinador': return (
        <CoordinadorView events={calendarEvents} tasks={tasks} onAddEvent={handleAddEvent} onDeleteEvent={handleDeleteEvent} />
      );
      default: return (
        <Dashboard expenses={expenses} tasks={tasks} events={calendarEvents} onAddTask={handleAddTask} onDeleteTask={handleDeleteTask} onToggleTask={handleToggleTask} />
      );
    }
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden ${darkMode ? 'dark' : ''}`}>
      <div className={`fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm transition-opacity md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)} />
      <div className={`fixed left-0 top-0 h-full z-50 transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:flex`}>
        <Sidebar currentView={currentView} onViewChange={(v) => { setCurrentView(v); setIsSidebarOpen(false); }} onScanClick={handleScanClick} onLogout={handleLogout} onOpenNotebook={(section, label) => setNotebookOpen({ section, label })} />
      </div>

      <input type="file" accept="image/*,application/pdf" className="hidden" ref={scanInputRef} onChange={handleFileSelection} />

      <main className="flex-1 w-full p-4 md:p-12 relative min-h-screen flex flex-col">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 md:mb-16 gap-6">
          <div className="flex items-center w-full md:w-auto gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <Menu size={24} className="text-slate-700 dark:text-slate-200" />
            </button>
            <div className="relative flex-1 md:w-[400px] group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" placeholder="Buscar en FILEHUB..." className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-16 pr-8 shadow-sm focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-700 dark:text-slate-200 placeholder-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-end">
            <button onClick={() => setDarkMode(!darkMode)} className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="hidden lg:flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 shadow-sm">
              <Database size={16} className={isDBReady ? 'text-emerald-500' : 'text-amber-500 animate-pulse'} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isDBReady ? 'CLOUD SYNC' : 'CONNECTING...'}</span>
            </div>
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 pr-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => setCurrentView('settings')}>
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black"><User size={20} /></div>
              <div className="hidden sm:block">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[150px]">{currentUser || 'Usuario'}</p>
                <div className="flex items-center gap-1">
                  <Wifi size={8} className="text-emerald-500" />
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Conectado</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-[1500px] mx-auto w-full flex-1 overflow-hidden">
          <ErrorBoundary>
            <Suspense fallback={<ViewLoader />}>
              {renderContent()}
            </Suspense>
          </ErrorBoundary>
        </div>

        <Suspense fallback={null}>
          <OmniAssistant
            globalContext={globalContext}
            onAddExpenses={(newExpenses) => {
              newExpenses.forEach(e => handleAddExpense(e));
            }}
          />
        </Suspense>

        {/* Floating Notebook AI Button */}
        <button
          onClick={() => {
            const labels: Record<string, string> = {
              'dashboard': 'Dashboard', 'calendar': 'Calendario IA', 'tasks': 'Tareas y Brain',
              'expenses': 'Gastos y Deuda', 'shared-finances': 'Cuentas Compartidas', 'monthly-analysis': 'Análisis Mensual',
              'goals': 'Visiómetro Metas', 'fitness': 'Entrenamiento', 'nutrition': 'Nutrición',
              'trips': 'Expediciones', 'shopping': 'Compras', 'work': 'Work Hub',
              'ideas': 'Ideas', 'files': 'Archivos', 'courses': 'Aprendizaje',
              'ai-hub': 'AI Hub', 'news': 'Noticias', 'qr': 'QR', 'settings': 'Ajustes',
            };
            setNotebookOpen({ section: currentView, label: labels[currentView] || currentView });
          }}
          className="fixed bottom-6 right-24 z-40 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 transition-all font-bold text-sm"
          title="Abrir Cuaderno IA"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          Cuaderno IA
        </button>
      </main>

      {previewFile && (
        <Suspense fallback={null}>
          <FilePreviewModal
            file={previewFile}
            onClose={() => setPreviewFile(null)}
            onProcess={processFileWithAI}
            isProcessing={false}
          />
        </Suspense>
      )}

      {isScanning && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[600] flex flex-col items-center justify-center text-white animate-in fade-in">
          <div className="relative">
            <div className="w-32 h-32 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <FileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400" size={40} />
          </div>
          <h2 className="text-2xl font-black mt-8 tracking-widest uppercase">Analizando con IA</h2>
          <p className="text-indigo-300 mt-2 font-bold text-xs">Extrayendo transacciones y flujos...</p>
        </div>
      )}

      {notebookOpen && (
        <Suspense fallback={null}>
          <SmartNotebook
            section={notebookOpen.section}
            sectionLabel={notebookOpen.label}
            onClose={() => setNotebookOpen(null)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default App;

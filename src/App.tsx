import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { QuickAddModal } from './components/QuickAddModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { OrganizationSetupWizardModal } from './components/OrganizationSetupWizardModal';
import { Login } from './components/Login';

import { DashboardView } from './views/DashboardView';
import { InventoryView } from './views/InventoryView';
import { TransactionsView } from './views/TransactionsView';
import { CashControlView } from './views/CashControlView';
import { AccountsView } from './views/AccountsView';
import { BankReconciliationView } from './views/BankReconciliationView';
import { ApprovalsView } from './views/ApprovalsView';
import { ProjectsView } from './views/ProjectsView';
import { ReportsView } from './views/ReportsView';
import { SharedReportView } from './views/SharedReportView';
import { AuditTrailView } from './views/AuditTrailView';
import { SettingsView } from './views/SettingsView';
import { TutorialView } from './views/TutorialView';
import { HelpCentreView } from './views/HelpCentreView';
import { AboutView } from './views/AboutView';
import { TaxObligationsView } from './views/TaxObligationsView';
import { OrganizationsView } from './views/OrganizationsView';
import { ProfitAnalysisView } from './views/ProfitAnalysisView';

import { ReceiptFormModal } from './views/ReceiptFormModal';
import { PaymentFormModal } from './views/PaymentFormModal';
import { TransferFormModal } from './views/TransferFormModal';

import {
  getStore,
  subscribeStore,
  getActiveOrganization,
  getActiveUser,
  calculateFinancialSummary,
  saveStore
} from './lib/storage';
import { Organization, User, AuthSession } from './types';
import { getCurrentSession, setCurrentSession, logoutUser, isAuthenticated } from './lib/auth';
import { applyOrgTheme } from './lib/theme';
import { downloadOrganizationArchive } from './lib/storage';
import { X, Wallet, Calculator, Clock, FolderGit2, ShieldCheck, Settings, HelpCircle, BookOpen, Sparkles, TrendingUp } from 'lucide-react';

export default function App() {
  const sharedParams = new URLSearchParams(window.location.search);
  const sharedOrgId = sharedParams.get('org');
  // Authentication State
  const [authSession, setAuthSession] = useState<AuthSession | null>(getCurrentSession());
  const [isAuthenticating, setIsAuthenticating] = useState(!isAuthenticated());

  const [storeState, setStoreState] = useState(getStore());
  const [currentView, setCurrentView] = useState(sharedParams.has('share') ? 'shared-report' : 'organizations');
  const [viewFilterParams, setViewFilterParams] = useState<any>(null);

  const [activeOrg, setActiveOrg] = useState<Organization>(() =>
    getStore().organizations.find(organization => organization.id === sharedOrgId) || getActiveOrganization()
  );
  const [currentUser, setCurrentUser] = useState<User>(getActiveUser());

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Modals & Drawers
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [notificationsDrawerOpen, setNotificationsDrawerOpen] = useState(false);
  const [setupWizardOpen, setSetupWizardOpen] = useState(false);
  const [mobileMoreMenuOpen, setMobileMoreMenuOpen] = useState(false);
  const [sharedReportCode, setSharedReportCode] = useState<string | null>(sharedParams.get('share'));

  // Subscribe to storage changes
  useEffect(() => {
    const unsubscribe = subscribeStore(() => {
      const updatedStore = getStore();
      setStoreState({ ...updatedStore });
      setActiveOrg(getActiveOrganization());
      setCurrentUser(getActiveUser());
    });
    return unsubscribe;
  }, []);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Apply organization theme
  useEffect(() => {
    applyOrgTheme(activeOrg.themeColor || '#3b82f6', activeOrg.accentColor || '#1e40af');
  }, [activeOrg.themeColor, activeOrg.accentColor]);

  const summary = calculateFinancialSummary(activeOrg.id);
  const unreadNotifications = storeState.notifications.filter(n => n.orgId === activeOrg.id && !n.isRead);

  const handleNavigate = (view: string, filterParams?: any) => {
    if (view === 'profit-analysis' && currentUser.role !== 'admin') return;
    setCurrentView(view);
    setViewFilterParams(filterParams || null);
    setMobileMoreMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenQuickAdd = (defaultTab?: string) => {
    if (defaultTab === 'receipt') {
      setReceiptModalOpen(true);
    } else if (defaultTab === 'payment') {
      setPaymentModalOpen(true);
    } else if (defaultTab === 'transfer') {
      setTransferModalOpen(true);
    } else {
      setQuickAddOpen(true);
    }
  };

  const handleQuickAddAction = (action: 'receipt' | 'payment' | 'cash-count' | 'transfer') => {
    if (action === 'receipt') setReceiptModalOpen(true);
    else if (action === 'payment') setPaymentModalOpen(true);
    else if (action === 'transfer') setTransferModalOpen(true);
    else if (action === 'cash-count') handleNavigate('cash-control');
  };

  const handleSelectTransactionFromSearch = (type: 'receipt' | 'payment' | 'transfer', item: any) => {
    handleNavigate('transactions');
  };

  const handleLoginSuccess = (session: AuthSession, user: User) => {
    setAuthSession(session);
    setCurrentUser(user);
    setActiveOrg(getActiveOrganization());
    setIsAuthenticating(false);
    setCurrentSession(session, true);
  };

  const handleLogout = () => {
    logoutUser();
    setAuthSession(null);
    setIsAuthenticating(true);
  };

  const handleSwitchOrganization = (org: Organization) => {
    const store = getStore();
    store.activeOrgId = org.id;
    saveStore(store);
    setActiveOrg(org);
    setCurrentUser(getActiveUser());
    setStoreState({ ...store });
  };

  const handleOpenWorkspace = (org: Organization) => {
    handleSwitchOrganization(org);
    handleNavigate('dashboard');
  };

  const handleCreateOrganization = () => {
    // Open the organization setup wizard
    setSetupWizardOpen(true);
  };

  const handleOrganizationCreated = (newOrg: Organization) => {
    setActiveOrg(newOrg);
    setSetupWizardOpen(false);
  };

  const handleDeleteOrganization = (organization: Organization) => {
    if (currentUser.role !== 'admin') return;
    if (!window.confirm(`Delete ${organization.name}? A JSON archive will download first.`)) return;

    downloadOrganizationArchive(organization.id);
    const store = getStore();
    const scopedCollections = ['users', 'accounts', 'categories', 'projects', 'departments', 'receipts', 'payments', 'transfers', 'cashCounts', 'reconciliations', 'shareLinks', 'auditLogs', 'notifications'] as const;
    store.organizations = store.organizations.filter(org => org.id !== organization.id);
    scopedCollections.forEach(collection => {
      store[collection] = store[collection].filter(item => item.orgId !== organization.id) as never;
    });
    const nextOrganization = store.organizations[0];
    if (nextOrganization) {
      store.activeOrgId = nextOrganization.id;
      setActiveOrg(nextOrganization);
    }
    saveStore(store);
    setStoreState({ ...store });
    setCurrentView('organizations');
  };

  // Show login screen if not authenticated
  if (isAuthenticating || !authSession) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onError={(error) => console.error('Login error:', error)}
      />
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] flex font-sans antialiased selection:bg-[var(--brand)] selection:text-white">
      
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
                  currentUserRole={currentUser.role}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        pendingApprovalsCount={summary.pendingApprovalsCount}
        orgThemeColor={activeOrg.themeColor || '#3b82f6'}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 pb-16 md:pb-0">
        
        {/* Top Header */}
        <Header
          organization={activeOrg}
          organizations={storeState.organizations}
          currentUser={currentUser}
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenQuickAdd={handleOpenQuickAdd}
          onOpenNotifications={() => setNotificationsDrawerOpen(true)}
          onNavigate={handleNavigate}
          onSwitchOrganization={handleSwitchOrganization}
          onCreateOrganization={handleCreateOrganization}
          onLogout={handleLogout}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          unreadNotificationsCount={unreadNotifications.length}
        />

        {/* View Router Body */}
        <main className="flex-1 min-h-0 overflow-y-auto max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
          {currentView === 'organizations' && (
            <OrganizationsView
              organizations={storeState.organizations}
              currentUser={currentUser}
              onOpenWorkspace={handleOpenWorkspace}
              onCreateOrganization={handleCreateOrganization}
              onDeleteOrganization={handleDeleteOrganization}
            />
          )}

          {currentView === 'dashboard' && (
            <DashboardView
              organization={activeOrg}
              currentUser={currentUser}
              onNavigate={handleNavigate}
              onOpenQuickAdd={handleOpenQuickAdd}
            />
          )}

          {currentView === 'inventory' && (
            <InventoryView
              organization={activeOrg}
              currentUser={currentUser}
            />
          )}

          {currentView === 'transactions' && (
            <TransactionsView
              organization={activeOrg}
              currentUser={currentUser}
              onOpenQuickAdd={handleOpenQuickAdd}
              initialFilterMonth={viewFilterParams?.month}
            />
          )}

          {currentView === 'cash-control' && (
            <CashControlView
              organization={activeOrg}
              currentUser={currentUser}
            />
          )}

          {currentView === 'accounts' && (
            <AccountsView
              organization={activeOrg}
              currentUser={currentUser}
            />
          )}

          {currentView === 'bank-reconciliation' && (
            <BankReconciliationView
              organization={activeOrg}
              currentUser={currentUser}
            />
          )}

          {currentView === 'approvals' && (
            <ApprovalsView
              organization={activeOrg}
              currentUser={currentUser}
            />
          )}

          {currentView === 'projects' && (
            <ProjectsView
              organization={activeOrg}
              currentUser={currentUser}
            />
          )}

          {currentView === 'reports' && (
            <ReportsView
              organization={activeOrg}
              currentUser={currentUser}
              onOpenSharedReport={(shareCode) => {
                setSharedReportCode(shareCode);
                setCurrentView('shared-report');
              }}
            />
          )}
          {currentView === 'profit-analysis' && currentUser.role === 'admin' && (
            <ProfitAnalysisView
              organization={activeOrg}
              currentUser={currentUser}
            />
          )}

          {currentView === 'shared-report' && (
            <SharedReportView
              shareCode={sharedReportCode || ''}
              organization={activeOrg}
              onBack={() => setCurrentView('reports')}
            />
          )}

          {currentView === 'audit-trail' && (
            <AuditTrailView
              organization={activeOrg}
              currentUser={currentUser}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              organization={activeOrg}
              currentUser={currentUser}
              onOrganizationUpdate={(updatedOrg) => setActiveOrg(updatedOrg)}
            />
          )}

          {currentView === 'tax-obligations' && (
            <TaxObligationsView
              organization={activeOrg}
              currentUser={currentUser}
            />
          )}

          {currentView === 'tutorial' && (
            <TutorialView onNavigate={handleNavigate} />
          )}

          {currentView === 'help' && (
            <HelpCentreView />
          )}

          {currentView === 'about' && (
            <AboutView />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenQuickAdd={handleOpenQuickAdd}
        onOpenMoreMenu={() => setMobileMoreMenuOpen(true)}
      />

      {/* Mobile "More" Drawer Overlay */}
      {mobileMoreMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-4/5 max-w-xs h-full p-5 space-y-4 shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">All Modules & Views</span>
              <button onClick={() => setMobileMoreMenuOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 text-xs">
              <button onClick={() => handleNavigate('accounts')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium">
                <Wallet className="w-4 h-4 text-blue-500" />
                <span>Accounts & Wallets</span>
              </button>
              <button onClick={() => handleNavigate('inventory')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium">
                <FolderGit2 className="w-4 h-4 text-emerald-500" />
                <span>Inventory Management</span>
              </button>
              <button onClick={() => handleNavigate('cash-control')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium">
                <Calculator className="w-4 h-4 text-amber-500" />
                <span>Cash Control & Counts</span>
              </button>
              <button onClick={() => handleNavigate('bank-reconciliation')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Bank Reconciliation</span>
              </button>
              <button onClick={() => handleNavigate('approvals')} className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-teal-500" />
                  <span>Approvals Queue</span>
                </div>
                {summary.pendingApprovalsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                    {summary.pendingApprovalsCount}
                  </span>
                )}
              </button>
              <button onClick={() => handleNavigate('projects')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium">
                <FolderGit2 className="w-4 h-4 text-purple-500" />
                <span>Projects & Donor Grants</span>
              </button>
              {currentUser.role === 'admin' && (
                <button onClick={() => handleNavigate('profit-analysis')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Profit Analysis</span>
                </button>
              )}
              <button onClick={() => handleNavigate('tax-obligations')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span>Tax Obligations</span>
              </button>
              <button onClick={() => handleNavigate('audit-trail')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span>Audit Trail Logs</span>
              </button>
              <button onClick={() => handleNavigate('settings')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium">
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Organization Settings</span>
              </button>
              <button onClick={() => handleNavigate('tutorial')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span>User Tutorial</span>
              </button>
              <button onClick={() => handleNavigate('help')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                <span>Help Centre</span>
              </button>
              <button onClick={() => handleNavigate('about')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>About LedgerNest</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Quick Add Action Picker Modal */}
      <QuickAddModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSelectAction={handleQuickAddAction}
      />

      {/* New Receipt Form Modal */}
      <ReceiptFormModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        organization={activeOrg}
        currentUser={currentUser}
      />

      {/* New Payment Form Modal */}
      <PaymentFormModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        organization={activeOrg}
        currentUser={currentUser}
      />

      {/* New Inter-Account Transfer Form Modal */}
      <TransferFormModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        organization={activeOrg}
        currentUser={currentUser}
      />

      {/* Global Search Modal (⌘K) */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        organization={activeOrg}
        onSelectTransaction={handleSelectTransactionFromSearch}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={notificationsDrawerOpen}
        onClose={() => setNotificationsDrawerOpen(false)}
        notifications={storeState.notifications.filter(n => n.orgId === activeOrg.id)}
        onNavigate={handleNavigate}
      />

      {/* Organization Setup Wizard Modal */}
      <OrganizationSetupWizardModal
        isOpen={setupWizardOpen}
        onClose={() => setSetupWizardOpen(false)}
        onOrganizationCreated={handleOrganizationCreated}
        currentUser={currentUser}
      />

    </div>
  );
}

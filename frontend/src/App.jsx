import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import MedicinesPage from './pages/medicines/MedicinesPage';
import MedicineFormPage from './pages/medicines/MedicineFormPage';
import MedicineDetailPage from './pages/medicines/MedicineDetailPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import InventoryPage from './pages/inventory/InventoryPage';
import ExpiryDashboard from './pages/inventory/ExpiryDashboard';
import StaffPage from './pages/settings/StaffPage';
import SettingsPage from './pages/settings/SettingsPage';
import SuperAdminDashboard from './pages/dashboard/SuperAdminDashboard';
import POSTerminal from './pages/pos/POSTerminal';
import SalesPage from './pages/sales/SalesPage';
import SaleDetailPage from './pages/sales/SaleDetailPage';
import SaleReturnPage from './pages/sales/SaleReturnPage';
import StockMovementsPage from './pages/inventory/StockMovementsPage';
import StockCountPage from './pages/inventory/StockCountPage';
import DeadStockPage from './pages/inventory/DeadStockPage';
import RackLocationsPage from './pages/inventory/RackLocationsPage';
import ReorderPage from './pages/inventory/ReorderPage';
import SuppliersPage from './pages/purchase/SuppliersPage';
import SupplierDetailPage from './pages/purchase/SupplierDetailPage';
import PurchaseOrdersPage from './pages/purchase/PurchaseOrdersPage';
import CreatePOPage from './pages/purchase/CreatePOPage';
import GRNPage from './pages/purchase/GRNPage';
import CustomersPage from './pages/customers/CustomersPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import PrescriptionsPage from './pages/prescriptions/PrescriptionsPage';
import CashRegisterPage from './pages/finance/CashRegisterPage';
import ExpensesPage from './pages/finance/ExpensesPage';
import ProfitLossPage from './pages/finance/ProfitLossPage';
import ComplianceDashboardPage from './pages/regulatory/ComplianceDashboardPage';
import ControlledDrugRegisterPage from './pages/regulatory/ControlledDrugRegisterPage';
import DrugLicensesPage from './pages/regulatory/DrugLicensesPage';
import ExpiryDestructionPage from './pages/regulatory/ExpiryDestructionPage';
import ReportsPage from './pages/reports/ReportsPage';
import NotificationsPage from './pages/settings/NotificationsPage';
import ReceiptDesignerPage from './pages/settings/ReceiptDesignerPage';
import ActivityLogPage from './pages/settings/ActivityLogPage';
import BarcodeLabelPage from './pages/medicines/BarcodeLabelPage';
import PODetailPage from './pages/purchase/PODetailPage';
import PurchaseReturnPage from './pages/purchase/PurchaseReturnPage';
import InsuranceClaimsPage from './pages/customers/InsuranceClaimsPage';
import StockTransferPage from './pages/transfers/StockTransferPage';
import AdminStoresPage from './pages/admin/AdminStoresPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminSubscriptionsPage from './pages/admin/AdminSubscriptionsPage';
import AdminRevenuePage from './pages/admin/AdminRevenuePage';
import useAutoSelectInputs from './hooks/useAutoSelect';

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-light">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Loading MedStore Pro...</p>
      </div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, loading, user } = useAuth();
  useAutoSelectInputs(); // Auto-select number inputs on focus globally

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />

      {/* POS — Full Screen (no sidebar) */}
      <Route path="/pos" element={<ProtectedRoute roles={['StoreAdmin','Pharmacist','Cashier']}><POSTerminal /></ProtectedRoute>} />

      {/* Protected — Dashboard Layout */}
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={user?.role === 'SuperAdmin' ? <SuperAdminDashboard /> : <DashboardPage />} />
        <Route path="medicines" element={<MedicinesPage />} />
        <Route path="medicines/new" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin','Pharmacist']}><MedicineFormPage /></ProtectedRoute>} />
        <Route path="medicines/:id/edit" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin','Pharmacist']}><MedicineFormPage /></ProtectedRoute>} />
        <Route path="medicines/:id" element={<MedicineDetailPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inventory/expiry" element={<ExpiryDashboard />} />
        <Route path="inventory/movements" element={<StockMovementsPage />} />
        <Route path="inventory/stock-count" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin','InventoryStaff']}><StockCountPage /></ProtectedRoute>} />
        <Route path="inventory/dead-stock" element={<DeadStockPage />} />
        <Route path="inventory/racks" element={<RackLocationsPage />} />
        <Route path="inventory/reorder" element={<ReorderPage />} />
        <Route path="purchase/suppliers" element={<SuppliersPage />} />
        <Route path="purchase/suppliers/:id" element={<SupplierDetailPage />} />
        <Route path="purchase/orders" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin']}><PurchaseOrdersPage /></ProtectedRoute>} />
        <Route path="purchase/orders/new" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin']}><CreatePOPage /></ProtectedRoute>} />
        <Route path="purchase/grn" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin','InventoryStaff']}><GRNPage /></ProtectedRoute>} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="prescriptions" element={<PrescriptionsPage />} />
        <Route path="finance/register" element={<CashRegisterPage />} />
        <Route path="finance/expenses" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin']}><ExpensesPage /></ProtectedRoute>} />
        <Route path="finance/profit-loss" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin']}><ProfitLossPage /></ProtectedRoute>} />
        <Route path="regulatory" element={<ComplianceDashboardPage />} />
        <Route path="regulatory/register" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin','Pharmacist']}><ControlledDrugRegisterPage /></ProtectedRoute>} />
        <Route path="regulatory/licenses" element={<DrugLicensesPage />} />
        <Route path="regulatory/destruction" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin']}><ExpiryDestructionPage /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin']}><ReportsPage /></ProtectedRoute>} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="receipt-designer" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin']}><ReceiptDesignerPage /></ProtectedRoute>} />
        <Route path="activity-log" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin']}><ActivityLogPage /></ProtectedRoute>} />
        <Route path="barcode-labels" element={<BarcodeLabelPage />} />
        <Route path="purchase/orders/:id" element={<PODetailPage />} />
        <Route path="purchase/returns" element={<PurchaseReturnPage />} />
        <Route path="insurance" element={<InsuranceClaimsPage />} />
        <Route path="transfers" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin']}><StockTransferPage /></ProtectedRoute>} />
        {/* SuperAdmin Platform Management */}
        <Route path="admin/stores" element={<ProtectedRoute roles={['SuperAdmin']}><AdminStoresPage /></ProtectedRoute>} />
        <Route path="admin/users" element={<ProtectedRoute roles={['SuperAdmin']}><AdminUsersPage /></ProtectedRoute>} />
        <Route path="admin/subscriptions" element={<ProtectedRoute roles={['SuperAdmin']}><AdminSubscriptionsPage /></ProtectedRoute>} />
        <Route path="admin/revenue" element={<ProtectedRoute roles={['SuperAdmin']}><AdminRevenuePage /></ProtectedRoute>} />
        <Route path="sales" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin','Pharmacist','Cashier']}><SalesPage /></ProtectedRoute>} />
        <Route path="sales/:id" element={<SaleDetailPage />} />
        <Route path="sales/:id/return" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin','Pharmacist']}><SaleReturnPage /></ProtectedRoute>} />
        <Route path="staff" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin']}><StaffPage /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute roles={['SuperAdmin','StoreAdmin']}><SettingsPage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

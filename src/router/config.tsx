import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import LoginPage from "../pages/auth/login/page";
import RegisterPage from "../pages/auth/register/page";
import LoginClientPage from "../pages/auth/login-client/page";
import RegisterClientPage from "../pages/auth/register-client/page";
import ClientDashboardPage from "../pages/client/dashboard/page";
import DashboardPage from "../pages/dashboard/page";
import DashboardLayout from "../components/feature/DashboardLayout";
import ProductsPage from "../pages/dashboard/products/page";
import NewProductPage from "../pages/dashboard/products/new/page";
import EditProductPage from "../pages/dashboard/products/edit/page";
import StockPage from "../pages/dashboard/products/stock/page";
import ServicesPage from "../pages/dashboard/services/page";
import NewServicePage from "../pages/dashboard/services/new/page";
import EditServicePage from "../pages/dashboard/services/edit/page";
import PortfolioPage from "../pages/dashboard/services/portfolio/page";
import NewPortfolioPage from "../pages/dashboard/services/portfolio/new/page";
import PartenairesPage from "../pages/dashboard/services/partenaires/page";
import EquipePage from "../pages/dashboard/services/equipe/page";
import UsersPage from "../pages/dashboard/services/users/page";
import CaissePage from "../pages/dashboard/caisse/page";
import OrdersPage from "../pages/dashboard/orders/page";
import NewOrderPage from "../pages/dashboard/orders/new/page";
import CustomersPage from "../pages/dashboard/customers/page";
import PaymentsPage from "../pages/dashboard/payments/page";
import StorePage from "../pages/dashboard/store/page";
import MediaPage from "../pages/dashboard/media/page";
import AnalyticsPage from "../pages/dashboard/analytics/page";
import SettingsPage from "../pages/dashboard/settings/page";
import AppStorePage from "../pages/dashboard/appstore/page";
import ThemeStorePage from "../pages/dashboard/themestore/page";
import AppsManagementPage from "../pages/dashboard/apps/page";
import AnalyticsAdvancedPage from "../pages/dashboard/apps/analytics-advanced/page";
import CustomersManagerPage from "../pages/dashboard/apps/customers-manager/page";
import CustomerDetailPage from "../pages/dashboard/apps/customers-manager/detail/page";
import WhatsAppButtonPage from "../pages/dashboard/apps/whatsapp-button/page";
import AIShopperPage from "../pages/dashboard/apps/ai-shopper/page";
import CustomerSupportPage from "../pages/dashboard/apps/customer-support/page";
import FacebookPixelPage from "../pages/dashboard/apps/facebook-pixel/page";
import IAReportingPage from "../pages/dashboard/apps/ia-reporting/page";
import MaFidelitePage from "../pages/dashboard/apps/ma-fidelite/page";
import FideliteRecompensesPage from "../pages/dashboard/apps/fidelite-recompenses/page";
import MonAssistantPage from "../pages/dashboard/apps/mon-assistant/page";
import PayPalPage from "../pages/dashboard/apps/paypal/page";
import FileManagerPage from "../pages/dashboard/apps/file-manager/page";
import FormsAppPage from "../pages/dashboard/apps/forms/page";
import FormBuilderPage from "../pages/dashboard/apps/forms/new/page";
import FormResponsesPage from "../pages/dashboard/apps/forms/responses/page";
import ZCalendarPage from "../pages/dashboard/apps/zcalendar/page";
import ZifekBIPage from "../pages/dashboard/apps/zifekbi/page";
import GestionProPage from "../pages/dashboard/apps/gestionpro/page";
import GestionProDetailPage from "../pages/dashboard/apps/gestionpro/detail/page";
import ZCallPage from "../pages/dashboard/apps/zcall/page";
import FormationAppPage from "../pages/dashboard/apps/formation/page";
import DynamicAppPage from "../pages/dashboard/app/dynamic/page";
import SuperAdminLayout from "../components/feature/SuperAdminLayout";
import SuperAdminDashboard from "../pages/superadmin/page";
import SuperAdminUsers from "../pages/superadmin/users/page";
import SuperAdminThemes from "../pages/superadmin/themes/page";
import ThemeGeneratePage from "../pages/superadmin/themes/generate/page";
import SuperAdminApps from "../pages/superadmin/apps/page";
import AppBuilderPage from "../pages/superadmin/apps/builder/page";
import SuperAdminLogs from "../pages/superadmin/logs/page";
import SuperAdminSettings from "../pages/superadmin/settings/page";
import SuperAdminHomepage from "../pages/superadmin/homepage/page";
import ProduitsPublic from "../pages/public/ProduitsPage";
import ServicesPublic from "../pages/public/ServicesPage";
import PartenairesPublic from "../pages/public/PartenairesPage";
import PortfolioPublic from "../pages/public/PortfolioPage";
import EquipePublic from "../pages/public/EquipePage";
import PublicFormPage from "../pages/public/FormPage";
import BookingPage from "../pages/public/BookingPage";
import ZCallRoomPage from "../pages/public/ZCallRoomPage";
import LookbookPage from "../pages/public/LookbookPage";
import PlanningPage from "../pages/client/dashboard/planning/page";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/login-client",
    element: <LoginClientPage />,
  },
  {
    path: "/register-client",
    element: <RegisterClientPage />,
  },
  {
    path: "/mon-compte",
    element: <ClientDashboardPage />,
  },
  {
    path: "/mon-planning",
    element: <PlanningPage />,
  },
  {
    path: "/produits",
    element: <ProduitsPublic />,
  },
  {
    path: "/services",
    element: <ServicesPublic />,
  },
  {
    path: "/partenaires",
    element: <PartenairesPublic />,
  },
  {
    path: "/portfolio",
    element: <PortfolioPublic />,
  },
  {
    path: "/equipe",
    element: <EquipePublic />,
  },
  {
    path: "/forms/:id",
    element: <PublicFormPage />,
  },
  {
    path: "/booking",
    element: <BookingPage />,
  },
  {
    path: "/booking/:serviceId",
    element: <BookingPage />,
  },
  {
    path: "/call/:roomId",
    element: <ZCallRoomPage />,
  },
  {
    path: "/lookbook/:outfitId",
    element: <LookbookPage />,
  },
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "caisse", element: <CaissePage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "products/new", element: <NewProductPage /> },
      { path: "products/:id/edit", element: <EditProductPage /> },
      { path: "products/stock", element: <StockPage /> },
      { path: "services", element: <ServicesPage /> },
      { path: "services/new", element: <NewServicePage /> },
      { path: "services/:id/edit", element: <EditServicePage /> },
      { path: "services/portfolio", element: <PortfolioPage /> },
      { path: "services/portfolio/new", element: <NewPortfolioPage /> },
      { path: "services/partenaires", element: <PartenairesPage /> },
      { path: "services/equipe", element: <EquipePage /> },
      { path: "services/users", element: <UsersPage /> },
      { path: "orders/new", element: <NewOrderPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "customers/:clientId", element: <CustomerDetailPage /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "payments", element: <PaymentsPage /> },
      { path: "store", element: <StorePage /> },
      { path: "media", element: <MediaPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "appstore", element: <AppStorePage /> },
      { path: "themestore", element: <ThemeStorePage /> },
      { path: "apps", element: <AppsManagementPage /> },
      { path: "analytics-advanced", element: <AnalyticsAdvancedPage /> },
      { path: "customers-manager/:customerId", element: <CustomerDetailPage /> },
      { path: "customers-manager", element: <CustomersManagerPage /> },
      { path: "whatsapp-button", element: <WhatsAppButtonPage /> },
      { path: "ai-shopper", element: <AIShopperPage /> },
      { path: "customer-support", element: <CustomerSupportPage /> },
      { path: "facebook-pixel", element: <FacebookPixelPage /> },
      { path: "ia-reporting", element: <IAReportingPage /> },
      { path: "ma-fidelite", element: <MaFidelitePage /> },
      { path: "fidelite-recompenses", element: <FideliteRecompensesPage /> },
      { path: "mon-assistant", element: <MonAssistantPage /> },
      { path: "paypal", element: <PayPalPage /> },
      { path: "file-manager", element: <FileManagerPage /> },
      { path: "forms", element: <FormsAppPage /> },
      { path: "forms/new", element: <FormBuilderPage /> },
      { path: "forms/:id/edit", element: <FormBuilderPage /> },
      { path: "forms/:id/responses", element: <FormResponsesPage /> },
      { path: "zcalendar", element: <ZCalendarPage /> },
      { path: "zifekbi", element: <ZifekBIPage /> },
      { path: "gestionpro", element: <GestionProPage /> },
      { path: "gestionpro/:id", element: <GestionProDetailPage /> },
      { path: "zcall", element: <ZCallPage /> },
      { path: "formation", element: <FormationAppPage /> },
      { path: "*", element: <DynamicAppPage /> },
    ],
  },
  {
    path: "/superadmin",
    element: <SuperAdminLayout />,
    children: [
      { index: true, element: <SuperAdminDashboard /> },
      { path: "users", element: <SuperAdminUsers /> },
      { path: "themes", element: <SuperAdminThemes /> },
      { path: "themes/generate", element: <ThemeGeneratePage /> },
      { path: "apps", element: <SuperAdminApps /> },
      { path: "apps/:id", element: <AppBuilderPage /> },
      { path: "logs", element: <SuperAdminLogs /> },
      { path: "settings", element: <SuperAdminSettings /> },
      { path: "homepage", element: <SuperAdminHomepage /> },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;
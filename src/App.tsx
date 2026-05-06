import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Success from "./pages/Success.tsx";
import Failed from "./pages/Failed.tsx";
import Payment3DSMock from "./pages/Payment3DSMock.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Account from "./pages/admin/Account.tsx";
import RequireAdmin from "./components/admin/RequireAdmin.tsx";
import AdminLayout from "./components/admin/AdminLayout.tsx";
import Overview from "./pages/admin/Overview.tsx";
import Orders from "./pages/admin/Orders.tsx";
import Products from "./pages/admin/Products.tsx";
import Pricing from "./pages/admin/Pricing.tsx";
import Users from "./pages/admin/Users.tsx";
import Audit from "./pages/admin/Audit.tsx";
import Payments from "./pages/admin/Payments.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/success" element={<Success />} />
          <Route path="/failed" element={<Failed />} />
          <Route path="/payment/3ds-mock" element={<Payment3DSMock />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<Overview />} />
            <Route path="orders" element={<Orders />} />
            <Route path="products" element={<Products />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="users" element={<Users />} />
            <Route path="account" element={<Account />} />
            <Route path="payments" element={<Payments />} />
            <Route path="audit" element={<Audit />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

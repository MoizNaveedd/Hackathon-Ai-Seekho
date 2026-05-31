/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import BookingDetail from "./pages/BookingDetail";
import Chat from "./pages/Chat";
import Messages from "./pages/Messages";
import CalendarScreen from "./pages/Calendar";
import PricingInvoice from "./pages/PricingInvoice";
import Disputes from "./pages/Disputes";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Registration from "./pages/Registration";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Registration />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/bookings/:id" element={<BookingDetail />} />
            <Route path="/bookings/:id/chat" element={<Chat />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/calendar" element={<CalendarScreen />} />
            <Route path="/pricing" element={<PricingInvoice />} />
            <Route path="/disputes" element={<Disputes />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}


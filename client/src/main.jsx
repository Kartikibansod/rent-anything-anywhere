import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "leaflet/dist/leaflet.css";
import "./index.css";
import { AppShell } from "./components/AppShell.jsx";
import { ToastProvider } from "./components/ToastProvider.jsx";
import { UserProvider } from "./lib/userContext.jsx";
import { AdminDashboard } from "./pages/AdminDashboard.jsx";
import { BookingManagement } from "./pages/BookingManagement.jsx";
import { BuyListings } from "./pages/BuyListings.jsx";
import { ChatInbox } from "./pages/ChatInbox.jsx";
import { CreateListing } from "./pages/CreateListing.jsx";
import { Home } from "./pages/Home.jsx";
import { ListingDetail } from "./pages/ListingDetail.jsx";
import { Login } from "./pages/Login.jsx";
import { MyDeals } from "./pages/MyDeals.jsx";
import { MyListings } from "./pages/MyListings.jsx";
import { Notifications } from "./pages/Notifications.jsx";
import { PaymentCheckout } from "./pages/PaymentCheckout.jsx";
import { Register } from "./pages/Register.jsx";
import { RentListings } from "./pages/RentListings.jsx";
import { SearchResults } from "./pages/SearchResults.jsx";
import { UserProfile } from "./pages/UserProfile.jsx";
import { Wishlist } from "./pages/Wishlist.jsx";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <ToastProvider>
          <UserProvider>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route path="/feed" element={<Home />} />
                  <Route path="/buy" element={<BuyListings />} />
                  <Route path="/rent" element={<RentListings />} />
                  <Route path="/sell" element={<CreateListing />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/create" element={<Navigate to="/sell" replace />} />
                  <Route path="/listing/:id" element={<ListingDetail />} />
                  <Route path="/profile/:id" element={<UserProfile />} />
                  <Route path="/my-listings" element={<MyListings />} />
                  <Route path="/my-deals" element={<MyDeals />} />
                  <Route path="/chat" element={<ChatInbox />} />
                  <Route path="/bookings" element={<BookingManagement />} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="/checkout/:listingId" element={<PaymentCheckout />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </UserProvider>
        </ToastProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

function RequireAuth() {
  return localStorage.getItem("token") ? <Outlet /> : <Navigate to="/" replace />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

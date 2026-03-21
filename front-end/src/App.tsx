import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AssistantProvider } from './context/AssistantContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import CategoriesTab from './pages/Categories'
import CreateProductPage from './pages/CreateProducts'
import DashboardTab from './pages/Dashboard'
import LoginPage from './pages/Login'
import ProductsTab from './pages/Products'
import RegisterPage from './pages/Register'

function App() {
  return (
    <AuthProvider>
      <AssistantProvider>
        <BrowserRouter>
          <Routes>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<DashboardTab />} />
                <Route path="/products" element={<ProductsTab />} />
                <Route path="/products/new" element={<CreateProductPage />} />
                <Route path="/categories" element={<CategoriesTab />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AssistantProvider>
    </AuthProvider>
  )
}

export default App

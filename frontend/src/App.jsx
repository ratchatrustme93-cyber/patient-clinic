import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isLoggedIn } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Appointments from './pages/Appointments'
import Patients from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import Employees from './pages/Employees'
import Items from './pages/Items'
import Materials from './pages/Materials'
import Bills from './pages/Bills'
import Master from './pages/Master'

function Private({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/*"
          element={
            <Private>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route path="/patients" element={<Patients />} />
                  <Route path="/patients/:id" element={<PatientDetail />} />
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/items" element={<Items />} />
                  <Route path="/materials" element={<Materials />} />
                  <Route path="/bills" element={<Bills />} />
                  <Route path="/master" element={<Master />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </Private>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

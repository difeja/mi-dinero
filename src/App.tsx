import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FinanceProvider } from './context/FinanceContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import Savings from './pages/Savings';

export default function App() {
  return (
    <FinanceProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="transacciones" element={<Transactions />} />
            <Route path="ahorro" element={<Savings />} />
            <Route path="categorias" element={<Categories />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FinanceProvider>
  );
}

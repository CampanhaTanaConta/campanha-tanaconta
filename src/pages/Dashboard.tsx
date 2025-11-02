import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, TrendingUp, DollarSign, Users, ShoppingCart } from 'lucide-react';
import { ActivationStats } from '@/components/ActivationStats';
import { PendingClientsTable } from '@/components/PendingClientsTable';
import { ActivationChart } from '@/components/ActivationChart';
import { ActivatedClientsTable } from '@/components/ActivatedClientsTable';
import logo from '@/assets/logo.png';

interface KPIData {
  vendas: number;
  premiacaoAtual: number;
  premiacaoEstimada: number;
  clientesAtivos: number;
  ticketMedio: number;
}

interface ActivationData {
  totalClients: number;
  activatedClients: number;
  pendingClients: number;
  activationRate: number;
  pendingClientsList: any[];
  activatedClientsList: any[];
  inProgressCount: number;
  noSalesCount: number;
  activatedValue: number;
  inProgressValue: number;
  noSalesValue: number;
}

const Dashboard = () => {
  const { participante, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIData>({
    vendas: 0,
    premiacaoAtual: 0,
    premiacaoEstimada: 0,
    clientesAtivos: 0,
    ticketMedio: 0,
  });
  const [activationData, setActivationData] = useState<ActivationData>({
    totalClients: 0,
    activatedClients: 0,
    pendingClients: 0,
    activationRate: 0,
    pendingClientsList: [],
    activatedClientsList: [],
    inProgressCount: 0,
    noSalesCount: 0,
    activatedValue: 0,
    inProgressValue: 0,
    noSalesValue: 0,
  });

  useEffect(() => {
    if (!participante) {
      navigate('/login');
      return;
    }

    fetchDashboardData();
  }, [participante, navigate]);

  const fetchDashboardData = async () => {
    try {
      // Get participant's wallet (clients)
      const { data: wallet, error: walletError } = await supabase
        .from('wallet')
        .select('cliente_id')
        .eq('participante', participante);

      if (walletError) throw walletError;

      const clienteIds = wallet?.map((w) => w.cliente_id) || [];

      if (clienteIds.length === 0) {
        setIsLoading(false);
        return;
      }

      // Get transactions for those clients
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .in('cliente_id', clienteIds);

      if (transError) throw transError;

      // Calculate KPIs
      if (transactions && transactions.length > 0) {
        const vendas = transactions.reduce((sum, t) => sum + Number(t.total_parcela), 0);
        const premiacaoAtual = transactions.reduce((sum, t) => sum + Number(t.premiacao_valor), 0);
        const clientesAtivos = new Set(transactions.map((t) => t.cliente_id)).size;
        const ticketMedio = vendas / transactions.length;

        // Calculate estimated award projection until 31/12/2025
        const startDate = new Date('2024-10-15');
        const endDate = new Date('2025-12-31');
        const currentDate = new Date();

        let premiacaoEstimada = premiacaoAtual;
        
        if (currentDate < endDate && currentDate >= startDate) {
          const diasDecorridos = Math.max(1, Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
          const diasTotais = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const taxaDiaria = premiacaoAtual / diasDecorridos;
          premiacaoEstimada = taxaDiaria * diasTotais;
        }

        setKpis({
          vendas,
          premiacaoAtual,
          premiacaoEstimada,
          clientesAtivos,
          ticketMedio,
        });
      }

      // Get department store data for activation tracking
      const { data: departmentStore, error: deptError } = await supabase
        .from('department_store')
        .select('*')
        .in('cliente_id', clienteIds);

      if (deptError) throw deptError;

      if (departmentStore && departmentStore.length > 0) {
        // Calculate total sales per client
        const salesByClient = transactions?.reduce((acc, t) => {
          const clientId = t.cliente_id;
          acc[clientId] = (acc[clientId] || 0) + Number(t.total_parcela);
          return acc;
        }, {} as Record<string, number>) || {};

        const activatedClients = Object.values(salesByClient).filter(total => total > 500).length;
        const inProgressClients = Object.entries(salesByClient).filter(([_, total]) => total > 0 && total <= 500).length;
        const totalClients = departmentStore.length;
        const noSalesClients = totalClients - Object.keys(salesByClient).length;

        // Calculate total sales values by status
        const activatedValue = Object.values(salesByClient)
          .filter(total => total > 500)
          .reduce((sum, val) => sum + val, 0);
        
        const inProgressValue = Object.entries(salesByClient)
          .filter(([_, total]) => total > 0 && total <= 500)
          .reduce((sum, [_, val]) => sum + val, 0);
        
        const noSalesValue = 0; // Clientes sem vendas têm valor 0

        // Calculate monthly sales for each client
        const salesByClientAndMonth = transactions?.reduce((acc, t) => {
          const clientId = t.cliente_id;
          const date = new Date(t.data_transacao);
          const month = date.getMonth(); // 0 = Jan, 9 = Oct, 10 = Nov, 11 = Dec
          
          if (!acc[clientId]) {
            acc[clientId] = { outubro: 0, novembro: 0, dezembro: 0 };
          }
          
          const value = Number(t.total_parcela);
          if (month === 9) acc[clientId].outubro += value; // October
          if (month === 10) acc[clientId].novembro += value; // November
          if (month === 11) acc[clientId].dezembro += value; // December
          
          return acc;
        }, {} as Record<string, { outubro: number; novembro: number; dezembro: number }>) || {};

        // Get pending clients details
        const pendingClientsList = departmentStore
          .filter(client => {
            const totalVendas = salesByClient[client.cliente_id] || 0;
            return totalVendas <= 500;
          })
          .map(client => ({
            ...client,
            totalVendas: salesByClient[client.cliente_id] || 0,
          }))
          .sort((a, b) => b.totalVendas - a.totalVendas)
          .slice(0, 10); // Top 10 pending clients

        // Get activated clients details with monthly breakdown
        const activatedClientsList = departmentStore
          .filter(client => {
            const totalVendas = salesByClient[client.cliente_id] || 0;
            return totalVendas > 500;
          })
          .map(client => ({
            ...client,
            totalVendas: salesByClient[client.cliente_id] || 0,
            salesByMonth: salesByClientAndMonth[client.cliente_id] || { outubro: 0, novembro: 0, dezembro: 0 },
          }))
          .sort((a, b) => b.totalVendas - a.totalVendas);

        setActivationData({
          totalClients,
          activatedClients,
          pendingClients: totalClients - activatedClients,
          activationRate: totalClients > 0 ? (activatedClients / totalClients) * 100 : 0,
          pendingClientsList,
          activatedClientsList,
          inProgressCount: inProgressClients,
          noSalesCount: noSalesClients,
          activatedValue,
          inProgressValue,
          noSalesValue,
        });
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="container mx-auto p-6">
          <Skeleton className="h-20 w-full mb-6" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo" className="h-12 w-12" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard Campanha Tá na Conta e no Cartão</h1>
              <p className="text-sm text-muted-foreground">Olá, {participante}</p>
            </div>
          </div>
          <div className="flex gap-4">
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate('/admin')}>
                Admin
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{formatCurrency(kpis.vendas)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total em vendas realizadas</p>
            </CardContent>
          </Card>

          <Card className="border-success/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Premiação Atual</CardTitle>
              <TrendingUp className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{formatCurrency(kpis.premiacaoAtual)}</div>
              <p className="text-xs text-muted-foreground mt-1">Valor acumulado até hoje</p>
            </CardContent>
          </Card>

          <Card className="border-warning/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Premiação Estimada</CardTitle>
              <TrendingUp className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{formatCurrency(kpis.premiacaoEstimada)}</div>
              <p className="text-xs text-muted-foreground mt-1">Projeção até 31/12/2025</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <ShoppingCart className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(kpis.ticketMedio)}</div>
              <p className="text-xs text-muted-foreground mt-1">Valor médio por transação</p>
            </CardContent>
          </Card>
        </div>

        {activationData.totalClients > 0 && (
          <>
            <ActivationStats
              totalClients={activationData.totalClients}
              activatedClients={activationData.activatedClients}
              pendingClients={activationData.pendingClients}
              activationRate={activationData.activationRate}
            />

            <ActivationChart
              activatedCount={activationData.activatedClients}
              inProgressCount={activationData.inProgressCount}
              noSalesCount={activationData.noSalesCount}
              activatedValue={activationData.activatedValue}
              inProgressValue={activationData.inProgressValue}
              noSalesValue={activationData.noSalesValue}
            />

            <PendingClientsTable clients={activationData.pendingClientsList} />

            <ActivatedClientsTable clients={activationData.activatedClientsList} />
          </>
        )}

        {kpis.clientesAtivos === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bem-vindo!</CardTitle>
              <CardDescription>
                Você ainda não possui transações registradas no período selecionado.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
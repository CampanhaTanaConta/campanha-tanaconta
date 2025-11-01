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
import logo from '@/assets/logo.png';

interface KPIData {
  vendas: number;
  premiacao: number;
  clientesAtivos: number;
  ticketMedio: number;
}

interface ActivationData {
  totalClients: number;
  activatedClients: number;
  pendingClients: number;
  activationRate: number;
  pendingClientsList: any[];
  inProgressCount: number;
  noSalesCount: number;
}

const Dashboard = () => {
  const { participante, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIData>({
    vendas: 0,
    premiacao: 0,
    clientesAtivos: 0,
    ticketMedio: 0,
  });
  const [activationData, setActivationData] = useState<ActivationData>({
    totalClients: 0,
    activatedClients: 0,
    pendingClients: 0,
    activationRate: 0,
    pendingClientsList: [],
    inProgressCount: 0,
    noSalesCount: 0,
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
        const premiacao = transactions.reduce((sum, t) => sum + Number(t.premiacao_valor), 0);
        const clientesAtivos = new Set(transactions.map((t) => t.cliente_id)).size;
        const ticketMedio = vendas / transactions.length;

        setKpis({
          vendas,
          premiacao,
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

        setActivationData({
          totalClients,
          activatedClients,
          pendingClients: totalClients - activatedClients,
          activationRate: totalClients > 0 ? (activatedClients / totalClients) * 100 : 0,
          pendingClientsList,
          inProgressCount: inProgressClients,
          noSalesCount: noSalesClients,
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
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Olá, {participante}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate('/admin')}>
              Admin
            </Button>
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
              <CardTitle className="text-sm font-medium">Premiação Estimada</CardTitle>
              <TrendingUp className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{formatCurrency(kpis.premiacao)}</div>
              <p className="text-xs text-muted-foreground mt-1">Valor total de comissão</p>
            </CardContent>
          </Card>

          <Card className="border-accent/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <Users className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpis.clientesAtivos}</div>
              <p className="text-xs text-muted-foreground mt-1">Clientes com vendas</p>
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
            />

            <PendingClientsTable clients={activationData.pendingClientsList} />
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
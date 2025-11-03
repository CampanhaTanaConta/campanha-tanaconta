import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, TrendingUp, DollarSign, Users, ShoppingCart, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ActivationStats } from '@/components/ActivationStats';
import { PendingClientsTable } from '@/components/PendingClientsTable';
import { MultiPurposeChart } from '@/components/MultiPurposeChart';
import { ActivatedClientsTable } from '@/components/ActivatedClientsTable';
import { ParticipantsOverviewTable } from '@/components/ParticipantsOverviewTable';
import { DistributorsTable } from '@/components/DistributorsTable';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import logo from '@/assets/logo.png';

interface KPIData {
  vendas: number;
  premiacaoAtual: number;
  premiacaoEstimada: number;
  clientesAtivos: number;
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
  solarSalesClients: number;
  nonSolarSalesClients: number;
  partners30kPlusCount: number;
  partnersBelow30kCount: number;
  notActivatedCount: number;
}

const Dashboard = () => {
  const { participante, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdateDate, setLastUpdateDate] = useState<Date | null>(null);
  const [kpis, setKpis] = useState<KPIData>({
    vendas: 0,
    premiacaoAtual: 0,
    premiacaoEstimada: 0,
    clientesAtivos: 0,
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
    solarSalesClients: 0,
    nonSolarSalesClients: 0,
    partners30kPlusCount: 0,
    partnersBelow30kCount: 0,
    notActivatedCount: 0,
  });
  const [adminParticipantsData, setAdminParticipantsData] = useState<any[]>([]);
  const [adminDistributorsData, setAdminDistributorsData] = useState<any[]>([]);

  useEffect(() => {
    if (!participante) {
      navigate('/login');
      return;
    }

    fetchDashboardData();
  }, [participante, navigate]);

  const fetchDashboardData = async () => {
    try {
      // Get user email from auth context - required for RLS
      const userEmail = localStorage.getItem('userEmail') || '';
      
      let dashboardSlices;
      
      // If admin, fetch global data; otherwise fetch participant-specific data
      if (isAdmin) {
        const { data, error } = await supabase.rpc('get_admin_dashboard_data');
        if (error) throw error;
        dashboardSlices = data;
        
        // Set admin-specific data
        const adminData = data as any;
        setAdminParticipantsData(adminData?.participants || []);
        setAdminDistributorsData(adminData?.distributors || []);
      } else {
        // Call unified RPC that fetches all data with proper session context
        const { data, error } = await supabase
          .rpc('get_dashboard_slices', { 
            p_email: userEmail, 
            p_participante: participante 
          });
        if (error) throw error;
        dashboardSlices = data;
      }

      // Extract data from RPC response with proper typing
      const responseData = dashboardSlices as any;
      
      if (isAdmin) {
        // ========== ADMIN: Process ALL data without wallet filter ==========
        const transactions: Array<any> = responseData?.transactions || [];
        const departmentStore: Array<any> = responseData?.department_store || [];

        // Optional debug logging (only when ?debug=1 in URL)
        if (window.location.search.includes('debug=1')) {
          console.log('[Dashboard Debug - Admin]', {
            transactionsCount: transactions.length,
            departmentStoreCount: departmentStore.length,
          });
        }

        // Calculate KPIs from ALL transactions
        if (transactions && transactions.length > 0) {
          const vendas = transactions.reduce((sum, t) => sum + Number(t.total_parcela), 0);
          const premiacaoAtual = transactions.reduce((sum, t) => sum + Number(t.premiacao_valor), 0);
          const clientesAtivos = new Set(transactions.map((t) => t.cliente_id)).size;

          // Calculate estimated award projection until 31/12/2025
          const startDate = new Date('2025-10-15');
          const endDate = new Date('2025-12-31');
          
          // Use the date of the last transaction import (most recent created_at)
          const lastUpdateDate = transactions.length > 0
            ? new Date(Math.max(...transactions.map(t => new Date(t.created_at || startDate).getTime())))
            : new Date();

          setLastUpdateDate(lastUpdateDate);

          let premiacaoEstimada = premiacaoAtual;
          
          if (lastUpdateDate < endDate && lastUpdateDate >= startDate) {
            const diasDecorridos = Math.max(1, Math.floor((lastUpdateDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
            const diasTotais = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const taxaDiaria = premiacaoAtual / diasDecorridos;
            premiacaoEstimada = taxaDiaria * diasTotais;
          }

          setKpis({
            vendas,
            premiacaoAtual,
            premiacaoEstimada,
            clientesAtivos,
          });
        }

        // Process department store data for activation tracking
        if (departmentStore && departmentStore.length > 0) {
          // Calculate total sales per client
          const salesByClient = transactions?.reduce((acc, t) => {
            const clientId = t.cliente_id;
            acc[clientId] = (acc[clientId] || 0) + Number(t.total_parcela);
            return acc;
          }, {} as Record<string, number>) || {};

          const activatedClients = Object.values(salesByClient).filter((total: number) => total > 500).length;
          const inProgressClients = Object.entries(salesByClient).filter(([_, total]) => (total as number) > 0 && (total as number) <= 500).length;
          const totalClients = departmentStore.length;
          const noSalesClients = totalClients - Object.keys(salesByClient).length;

          // Calculate total sales values by status
          const activatedValue = (Object.values(salesByClient)
            .filter((total: number) => total > 500)
            .reduce((sum: number, val) => sum + (val as number), 0)) as number;
          
          const inProgressValue = (Object.entries(salesByClient)
            .filter(([_, total]) => (total as number) > 0 && (total as number) <= 500)
            .reduce((sum: number, [_, val]) => sum + (val as number), 0)) as number;
          
          const noSalesValue = 0; // Revendas sem vendas têm valor 0

          // Calculate partners with R$30k+ in sales
          const partners30kPlusCount = Object.values(salesByClient).filter((total: number) => total >= 30000).length;
          const partnersBelow30kCount = totalClients - partners30kPlusCount;

          // Calculate not activated clients (including in progress and no sales)
          const notActivatedCount = inProgressClients + noSalesClients;

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

          // Calcular quais revendas venderam Energia Solar
          const clientsWithSolarSales = new Set(
            transactions
              ?.filter(t => t.tipo_venda === 'Energia Solar')
              .map(t => t.cliente_id) || []
          );

          const solarSalesClients = clientsWithSolarSales.size;
          const nonSolarSalesClients = totalClients - solarSalesClients;

          // Calcular vendas de Energia Solar por revenda
          const solarSalesByClient = transactions?.reduce((acc, t) => {
            if (t.tipo_venda === 'Energia Solar') {
              const clientId = t.cliente_id;
              acc[clientId] = (acc[clientId] || 0) + Number(t.total_parcela);
            }
            return acc;
          }, {} as Record<string, number>) || {};

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
              hasSolarSales: !!solarSalesByClient[client.cliente_id],
              totalSolarSales: solarSalesByClient[client.cliente_id] || 0,
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
            solarSalesClients,
            nonSolarSalesClients,
            partners30kPlusCount,
            partnersBelow30kCount,
            notActivatedCount,
          });
        }

      } else {
        // ========== PARTICIPANT: Filter data by wallet ==========
        const wallet: Array<{ cliente_id: string }> = responseData?.wallet || [];
        const transactions: Array<any> = responseData?.transactions || [];
        const departmentStore: Array<any> = responseData?.department_store || [];

        // Optional debug logging (only when ?debug=1 in URL)
        if (window.location.search.includes('debug=1')) {
          console.log('[Dashboard Debug - Participant]', {
            walletCount: wallet.length,
            transactionsCount: transactions.length,
            departmentStoreCount: departmentStore.length,
          });
        }

        const clienteIds = wallet?.map((w) => w.cliente_id) || [];

        if (clienteIds.length === 0) {
          setIsLoading(false);
          return;
        }

        // Calculate KPIs
        if (transactions && transactions.length > 0) {
          const vendas = transactions.reduce((sum, t) => sum + Number(t.total_parcela), 0);
          const premiacaoAtual = transactions.reduce((sum, t) => sum + Number(t.premiacao_valor), 0);
          const clientesAtivos = new Set(transactions.map((t) => t.cliente_id)).size;

          // Calculate estimated award projection until 31/12/2025
          const startDate = new Date('2025-10-15');
          const endDate = new Date('2025-12-31');
          
          // Use the date of the last transaction import (most recent created_at)
          const lastUpdateDate = transactions.length > 0
            ? new Date(Math.max(...transactions.map(t => new Date(t.created_at || startDate).getTime())))
            : new Date();

          setLastUpdateDate(lastUpdateDate);

          let premiacaoEstimada = premiacaoAtual;
          
          if (lastUpdateDate < endDate && lastUpdateDate >= startDate) {
            const diasDecorridos = Math.max(1, Math.floor((lastUpdateDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
            const diasTotais = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const taxaDiaria = premiacaoAtual / diasDecorridos;
            premiacaoEstimada = taxaDiaria * diasTotais;
          }

          setKpis({
            vendas,
            premiacaoAtual,
            premiacaoEstimada,
            clientesAtivos,
          });
        }

        // Process department store data for activation tracking
        if (departmentStore && departmentStore.length > 0) {
          // Calculate total sales per client
          const salesByClient = transactions?.reduce((acc, t) => {
            const clientId = t.cliente_id;
            acc[clientId] = (acc[clientId] || 0) + Number(t.total_parcela);
            return acc;
          }, {} as Record<string, number>) || {};

          const activatedClients = Object.values(salesByClient).filter((total: number) => total > 500).length;
          const inProgressClients = Object.entries(salesByClient).filter(([_, total]) => (total as number) > 0 && (total as number) <= 500).length;
          const totalClients = departmentStore.length;
          const noSalesClients = totalClients - Object.keys(salesByClient).length;

          // Calculate total sales values by status
          const activatedValue = (Object.values(salesByClient)
            .filter((total: number) => total > 500)
            .reduce((sum: number, val) => sum + (val as number), 0)) as number;
          
          const inProgressValue = (Object.entries(salesByClient)
            .filter(([_, total]) => (total as number) > 0 && (total as number) <= 500)
            .reduce((sum: number, [_, val]) => sum + (val as number), 0)) as number;
          
          const noSalesValue = 0; // Revendas sem vendas têm valor 0

          // Calculate partners with R$30k+ in sales
          const partners30kPlusCount = Object.values(salesByClient).filter((total: number) => total >= 30000).length;
          const partnersBelow30kCount = totalClients - partners30kPlusCount;

          // Calculate not activated clients (including in progress and no sales)
          const notActivatedCount = inProgressClients + noSalesClients;

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

          // Calcular quais revendas venderam Energia Solar
          const clientsWithSolarSales = new Set(
            transactions
              ?.filter(t => t.tipo_venda === 'Energia Solar')
              .map(t => t.cliente_id) || []
          );

          const solarSalesClients = clientsWithSolarSales.size;
          const nonSolarSalesClients = totalClients - solarSalesClients;

          // Calcular vendas de Energia Solar por revenda
          const solarSalesByClient = transactions?.reduce((acc, t) => {
            if (t.tipo_venda === 'Energia Solar') {
              const clientId = t.cliente_id;
              acc[clientId] = (acc[clientId] || 0) + Number(t.total_parcela);
            }
            return acc;
          }, {} as Record<string, number>) || {};

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
              hasSolarSales: !!solarSalesByClient[client.cliente_id],
              totalSolarSales: solarSalesByClient[client.cliente_id] || 0,
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
            solarSalesClients,
            nonSolarSalesClients,
            partners30kPlusCount,
            partnersBelow30kCount,
            notActivatedCount,
          });
        }
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

  const formatDate = (date: Date | null) => {
    if (!date) return '--/--/----';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
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
          
          <div className="flex flex-col items-end gap-1 mr-4">
            <p className="text-sm font-medium text-foreground">
              Dashboard atualizado em <span className="underline">{formatDate(lastUpdateDate)}</span>
            </p>
            <p className="text-xs text-muted-foreground italic">
              Atualizado semanalmente
            </p>
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
              <DollarSign className="h-5 w-5 text-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{formatCurrency(kpis.vendas)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total em vendas realizadas</p>
            </CardContent>
          </Card>

          <Card className="border-success/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Premiação Atual</CardTitle>
              <TrendingUp className="h-5 w-5 text-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{formatCurrency(kpis.premiacaoAtual)}</div>
              <p className="text-xs text-muted-foreground mt-1">Valor acumulado até hoje</p>
            </CardContent>
          </Card>

          <Card className="border-warning/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Premiação Estimada</CardTitle>
              <TrendingUp className="h-5 w-5 text-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{formatCurrency(kpis.premiacaoEstimada)}</div>
              <p className="text-xs text-muted-foreground mt-1">Projeção até 31/12/2025</p>
            </CardContent>
          </Card>

          {kpis.vendas < 50000 ? (
            <Card className="border-destructive/50 shadow-lg hover:shadow-xl transition-shadow bg-destructive/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-destructive">Status da Premiação</CardTitle>
                <AlertTriangle className="h-5 w-5 text-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive mb-2">
                  Mínimo não atingido
                </div>
                <p className="text-xs font-medium text-destructive/90 mb-1">
                  Faltam {formatCurrency(50000 - kpis.vendas)} para ativar seu cartão
                </p>
                <p className="text-xs text-muted-foreground">
                  Mínimo: R$ 50.000,00 em vendas
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-success/50 shadow-lg hover:shadow-xl transition-shadow bg-success/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-success">Status da Premiação</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success mb-2">
                  🎉 Parabéns!
                </div>
                <p className="text-sm font-medium text-success">
                  Você ativou o seu cartão!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Mínimo de R$ 50.000,00 alcançado
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Admin-only sections */}
        {isAdmin && (
          <div className="space-y-6">
            <div className="border-l-4 border-primary pl-4">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                🔒 Visão Global do Administrador
              </h2>
              <p className="text-sm text-muted-foreground">
                Dados consolidados de todos os participantes e distribuidores
              </p>
            </div>

            <ParticipantsOverviewTable data={adminParticipantsData} />
            
            <DistributorsTable data={adminDistributorsData} />
          </div>
        )}

        {activationData.totalClients > 0 && (
          <>
            <ActivationStats
              totalClients={activationData.totalClients}
              activatedClients={activationData.activatedClients}
              activationRate={activationData.activationRate}
              solarSalesClients={activationData.solarSalesClients}
              nonSolarSalesClients={activationData.nonSolarSalesClients}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Status de Ativação</CardTitle>
                  <CardDescription>Distribuição de revendas por status</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { 
                            name: 'Ativados (>R$500)', 
                            value: activationData.activatedClients, 
                            color: 'hsl(var(--success))',
                            total: activationData.activatedValue
                          },
                          { 
                            name: 'Em Progresso', 
                            value: activationData.inProgressCount, 
                            color: 'hsl(var(--warning))',
                            total: activationData.inProgressValue
                          },
                          { 
                            name: 'Sem Vendas', 
                            value: activationData.noSalesCount, 
                            color: 'hsl(var(--muted))',
                            total: activationData.noSalesValue
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                          const pieData = [
                            { total: activationData.activatedValue },
                            { total: activationData.inProgressValue },
                            { total: activationData.noSalesValue }
                          ];
                          const RADIAN = Math.PI / 180;
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          
                          return (
                            <text 
                              x={x} 
                              y={y} 
                              fill={index === 2 ? "#4B5563" : "white"} 
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize={12}
                              fontWeight={600}
                            >
                              <tspan x={x} dy={0}>{`${(percent * 100).toFixed(0)}%`}</tspan>
                              <tspan x={x} dy={14} fontSize={10}>
                                {formatCurrency(pieData[index].total)}
                              </tspan>
                            </text>
                          );
                        }}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { color: 'hsl(var(--success))' },
                          { color: 'hsl(var(--warning))' },
                          { color: 'hsl(var(--muted))' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <MultiPurposeChart
                activatedCount={activationData.activatedClients}
                notActivatedCount={activationData.notActivatedCount}
                solarClientsCount={activationData.solarSalesClients}
                nonSolarClientsCount={activationData.nonSolarSalesClients}
                partners30kPlusCount={activationData.partners30kPlusCount}
                partnersBelow30kCount={activationData.partnersBelow30kCount}
              />
            </div>

            <PendingClientsTable clients={activationData.pendingClientsList} />

            <ActivatedClientsTable clients={activationData.activatedClientsList} />
          </>
        )}

        {kpis.clientesAtivos === 0 && !isAdmin && (
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
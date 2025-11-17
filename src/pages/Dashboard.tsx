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
import { MultiPurposeChart } from '@/components/MultiPurposeChart';
import { ActivatedClientsTable } from '@/components/ActivatedClientsTable';
import { ParticipantsOverviewTable } from '@/components/ParticipantsOverviewTable';
import { DistributorsTable } from '@/components/DistributorsTable';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import logo from '@/assets/logo.png';

interface WalletItem {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  participante: string;
  created_at: string;
  num_participantes?: number;
  compartilhado?: boolean;
  outros_participantes?: string[];
}

interface Transaction {
  id: string;
  cliente_id: string;
  data_transacao: string;
  tipo_venda: string;
  total_parcela: number;
  premiacao_pct_norm: number;
  premiacao_valor: number;
  created_at: string;
  num_participantes?: number;
  compartilhado?: boolean;
}

interface KPIData {
  vendas: number;
  premiacaoAtual: number;
  premiacaoEstimada: number;
  vendasEstimadas: number;
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
    vendasEstimadas: 0,
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
        const { data, error } = await supabase.rpc('get_admin_dashboard_data', {
          p_email: userEmail
        });
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

      // ========== Buscar data de última atualização (universal para todos) ==========
      // Usa função RPC que ignora RLS e retorna a data global do último upload
      let currentLastUpdateDate: Date | null = null;
      try {
        const { data, error } = await supabase.rpc('get_last_upload_date');
        if (error) throw error;
        if (data) {
          // Extrair data em UTC para evitar conversão de timezone
          const tempDate = new Date(data);
          currentLastUpdateDate = new Date(Date.UTC(
            tempDate.getUTCFullYear(),
            tempDate.getUTCMonth(),
            tempDate.getUTCDate()
          ));
        }
        // Se não há data, mantém null (formatDate mostrará "--/--/----")
      } catch (error) {
        console.warn('Erro ao buscar data de atualização:', error);
        // Sem fallback para "hoje" - mantém null para não mostrar data errada
      }
      // Atualiza o estado para exibição
      setLastUpdateDate(currentLastUpdateDate);

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
          const startDate = new Date(Date.UTC(2025, 9, 15)); // 15/10/2025 em UTC (mês 9 = outubro)
          const endDate = new Date(Date.UTC(2025, 11, 31)); // 31/12/2025 em UTC (mês 11 = dezembro)
          
          let premiacaoEstimada = premiacaoAtual;
          let vendasEstimadas = vendas;
          
          if (currentLastUpdateDate && currentLastUpdateDate < endDate && currentLastUpdateDate >= startDate) {
            const diasDecorridos = Math.max(1, Math.floor((currentLastUpdateDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
            const diasTotais = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const taxaDiaria = premiacaoAtual / diasDecorridos;
            premiacaoEstimada = taxaDiaria * diasTotais;
            const taxaDiariaVendas = vendas / diasDecorridos;
            vendasEstimadas = taxaDiariaVendas * diasTotais;
          }

          setKpis({
            vendas,
            premiacaoAtual,
            premiacaoEstimada,
            vendasEstimadas,
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
          const totalClients = new Set(departmentStore.map((c: any) => c.cliente_id)).size;
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

          // Calculate not activated clients (total minus activated)
          const notActivatedCount = totalClients - activatedClients;

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

          // Criar mapa de cliente_id para estab_comercial
          const estabComercialByClient = transactions?.reduce((acc, t) => {
            const clientId = t.cliente_id;
            // Pega o primeiro estab_comercial não vazio encontrado para cada cliente
            if (!acc[clientId] && t.estab_comercial) {
              acc[clientId] = t.estab_comercial;
            }
            return acc;
          }, {} as Record<string, string>) || {};

          // Get pending clients details (Admin view - no wallet info available)
          const pendingClientsList = departmentStore
            .filter(client => {
              const totalVendas = salesByClient[client.cliente_id] || 0;
              return totalVendas <= 500;
            })
            .map(client => ({
              ...client,
              estab_comercial: estabComercialByClient[client.cliente_id] || client.nome,
              totalVendas: salesByClient[client.cliente_id] || 0,
            }))
            .sort((a, b) => b.totalVendas - a.totalVendas)
            .slice(0, 10); // Top 10 pending clients

          // Get activated clients details with monthly breakdown (Admin view - no wallet info available)
          const activatedClientsList = departmentStore
            .filter(client => {
              const totalVendas = salesByClient[client.cliente_id] || 0;
              return totalVendas > 500;
            })
            .map(client => ({
              ...client,
              estab_comercial: estabComercialByClient[client.cliente_id] || client.nome,
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
          const startDate = new Date(Date.UTC(2025, 9, 15)); // 15/10/2025 em UTC (mês 9 = outubro)
          const endDate = new Date(Date.UTC(2025, 11, 31)); // 31/12/2025 em UTC (mês 11 = dezembro)
          
          let premiacaoEstimada = premiacaoAtual;
          let vendasEstimadas = vendas;

          if (currentLastUpdateDate && currentLastUpdateDate < endDate && currentLastUpdateDate >= startDate) {
            const diasDecorridos = Math.max(1, Math.floor((currentLastUpdateDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
            const diasTotais = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const taxaDiaria = premiacaoAtual / diasDecorridos;
            premiacaoEstimada = taxaDiaria * diasTotais;
            const taxaDiariaVendas = vendas / diasDecorridos;
            vendasEstimadas = taxaDiariaVendas * diasTotais;
          }

          setKpis({
            vendas,
            premiacaoAtual,
            premiacaoEstimada,
            vendasEstimadas,
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
          const totalClients = new Set(departmentStore.map((c: any) => c.cliente_id)).size;
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

          // Calculate not activated clients (total minus activated)
          const notActivatedCount = totalClients - activatedClients;

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

          // Criar mapa de cliente_id para estab_comercial
          const estabComercialByClient = transactions?.reduce((acc, t) => {
            const clientId = t.cliente_id;
            // Pega o primeiro estab_comercial não vazio encontrado para cada cliente
            if (!acc[clientId] && t.estab_comercial) {
              acc[clientId] = t.estab_comercial;
            }
            return acc;
          }, {} as Record<string, string>) || {};

          // Create wallet map for shared client info
          const walletMap = new Map<string, { 
            compartilhado: boolean; 
            num_participantes: number;
            outros_participantes: string[];
          }>();
          
          (wallet as WalletItem[])?.forEach((w) => {
            walletMap.set(w.cliente_id, {
              compartilhado: w.compartilhado || false,
              num_participantes: w.num_participantes || 1,
              outros_participantes: w.outros_participantes || []
            });
          });

          // Get pending clients details
          const pendingClientsList = departmentStore
            .filter(client => {
              const totalVendas = salesByClient[client.cliente_id] || 0;
              return totalVendas <= 500;
            })
            .map(client => {
              const walletInfo = walletMap.get(client.cliente_id);
              return {
                ...client,
                estab_comercial: estabComercialByClient[client.cliente_id] || client.nome,
                totalVendas: salesByClient[client.cliente_id] || 0,
                compartilhado: walletInfo?.compartilhado,
                num_participantes: walletInfo?.num_participantes,
                outros_participantes: walletInfo?.outros_participantes
              };
            })
            .sort((a, b) => b.totalVendas - a.totalVendas)
            .slice(0, 10); // Top 10 pending clients

          // Get activated clients details with monthly breakdown
          const activatedClientsList = departmentStore
            .filter(client => {
              const totalVendas = salesByClient[client.cliente_id] || 0;
              return totalVendas > 500;
            })
            .map(client => {
              const walletInfo = walletMap.get(client.cliente_id);
              return {
                ...client,
                estab_comercial: estabComercialByClient[client.cliente_id] || client.nome,
                totalVendas: salesByClient[client.cliente_id] || 0,
                salesByMonth: salesByClientAndMonth[client.cliente_id] || { outubro: 0, novembro: 0, dezembro: 0 },
                hasSolarSales: !!solarSalesByClient[client.cliente_id],
                totalSolarSales: solarSalesByClient[client.cliente_id] || 0,
                compartilhado: walletInfo?.compartilhado,
                num_participantes: walletInfo?.num_participantes,
                outros_participantes: walletInfo?.outros_participantes
              };
            })
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
      year: 'numeric',
      timeZone: 'UTC' // Força UTC para evitar conversão de timezone
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
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo" className="h-12 w-12" />
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-foreground">Dashboard Campanha Tá na Conta e no Cartão</h1>
              <p className="text-sm text-muted-foreground">Olá, {participante}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-1 w-full md:w-auto">
            <p className="text-sm font-medium text-foreground">
              Dashboard atualizado em <span className="underline">{formatDate(lastUpdateDate)}</span>
            </p>
            <p className="text-xs text-muted-foreground italic">
              Atualizado semanalmente
            </p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto justify-end">
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

          <Card className="border-accent/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projeção de vendas</CardTitle>
              <TrendingUp className="h-5 w-5 text-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{formatCurrency(kpis.vendasEstimadas)}</div>
              <p className="text-xs text-muted-foreground mt-1">Projeção até 31/12/2025</p>
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
        </div>

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

            {isAdmin && (
              <div className="space-y-6">
                <div className="border-l-4 border-primary pl-4">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    🏢 Performance dos Distribuidores
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Dados consolidados por distribuidor
                  </p>
                </div>

                <DistributorsTable data={adminDistributorsData} />
              </div>
            )}

            <ActivatedClientsTable clients={activationData.activatedClientsList} />
          </>
        )}

        {/* Admin-only sections */}
        {isAdmin && (
          <div className="space-y-6">
            <div className="border-l-4 border-primary pl-4">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                📊 Performance dos Participantes
              </h2>
              <p className="text-sm text-muted-foreground">
                Dados consolidados de todos os participantes e distribuidores
              </p>
            </div>

            <ParticipantsOverviewTable data={adminParticipantsData} />
          </div>
        )}

        {kpis.clientesAtivos > 0 && (
          <PendingClientsTable clients={activationData.pendingClientsList} />
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
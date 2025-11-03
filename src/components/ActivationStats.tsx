import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Users, Target, AlertCircle } from 'lucide-react';

interface ActivationStatsProps {
  totalClients: number;
  activatedClients: number;
  activationRate: number;
  solarSalesClients: number;
  nonSolarSalesClients: number;
}

export const ActivationStats = ({
  totalClients,
  activatedClients,
  activationRate,
  solarSalesClients,
  nonSolarSalesClients,
}: ActivationStatsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Revendas</CardTitle>
          <Users className="h-4 w-4 text-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalClients}</div>
          <p className="text-xs text-muted-foreground">
            Estabelecimentos cadastrados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revendas Ativadas</CardTitle>
          <Target className="h-4 w-4 text-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{activatedClients}</div>
          <p className="text-xs text-muted-foreground">
            Vendas acima de R$ 500
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Ativação</CardTitle>
          <TrendingUp className="h-4 w-4 text-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activationRate.toFixed(1)}%</div>
          <Progress value={activationRate} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vendas de Energia Solar</CardTitle>
          <Target className="h-4 w-4 text-foreground" />
        </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${solarSalesClients === 0 ? 'text-destructive' : 'text-accent'}`}>
          {solarSalesClients}
        </div>
        <p className="text-xs text-muted-foreground">
          {solarSalesClients === 1 ? 'Revenda vendeu' : 'Revendas venderam'} Energia Solar
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {nonSolarSalesClients} ainda {nonSolarSalesClients === 1 ? 'não vendeu' : 'não venderam'}
        </p>
      </CardContent>
      </Card>
    </div>
  );
};

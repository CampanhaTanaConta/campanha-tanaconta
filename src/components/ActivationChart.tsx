import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface ActivationChartProps {
  activatedCount: number;
  inProgressCount: number;
  noSalesCount: number;
}

export const ActivationChart = ({ activatedCount, inProgressCount, noSalesCount }: ActivationChartProps) => {
  const pieData = [
    { name: 'Ativados (>R$500)', value: activatedCount, color: 'hsl(var(--success))' },
    { name: 'Em Progresso', value: inProgressCount, color: 'hsl(var(--warning))' },
    { name: 'Sem Vendas', value: noSalesCount, color: 'hsl(var(--muted))' },
  ];

  const barData = [
    { status: 'Ativados', quantidade: activatedCount, fill: 'hsl(var(--success))' },
    { status: 'Em Progresso', quantidade: inProgressCount, fill: 'hsl(var(--warning))' },
    { status: 'Sem Vendas', quantidade: noSalesCount, fill: 'hsl(var(--muted))' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Status de Ativação</CardTitle>
          <CardDescription>Distribuição de clientes por status</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comparativo de Status</CardTitle>
          <CardDescription>Quantidade de clientes por categoria</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantidade" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

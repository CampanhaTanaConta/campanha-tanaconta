import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface ActivationChartProps {
  activatedCount: number;
  inProgressCount: number;
  noSalesCount: number;
  activatedValue: number;
  inProgressValue: number;
  noSalesValue: number;
}

export const ActivationChart = ({ 
  activatedCount, 
  inProgressCount, 
  noSalesCount,
  activatedValue,
  inProgressValue,
  noSalesValue
}: ActivationChartProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const pieData = [
    { 
      name: 'Ativados (>R$500)', 
      value: activatedCount, 
      color: 'hsl(var(--success))',
      total: activatedValue
    },
    { 
      name: 'Em Progresso', 
      value: inProgressCount, 
      color: 'hsl(var(--warning))',
      total: inProgressValue
    },
    { 
      name: 'Sem Vendas', 
      value: noSalesCount, 
      color: 'hsl(var(--muted))',
      total: noSalesValue
    },
  ];

  const barData = [
    { 
      status: 'Ativados', 
      quantidade: activatedCount, 
      fill: 'hsl(var(--success))',
      valor: activatedValue
    },
    { 
      status: 'Em Progresso', 
      quantidade: inProgressCount, 
      fill: 'hsl(var(--warning))',
      valor: inProgressValue
    },
    { 
      status: 'Sem Vendas', 
      quantidade: noSalesCount, 
      fill: 'hsl(var(--muted))',
      valor: noSalesValue
    },
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
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  
                  return (
                    <text 
                      x={x} 
                      y={y} 
                      fill="white" 
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
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold">{payload[0].payload.status}</p>
                        <p className="text-sm">Quantidade: {payload[0].payload.quantidade}</p>
                        <p className="text-sm font-medium text-primary">
                          Total: {formatCurrency(payload[0].payload.valor)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="quantidade" 
                radius={[8, 8, 0, 0]}
                label={(props: any) => {
                  const { x, y, width, height, quantidade, valor } = props;
                  return (
                    <g>
                      {/* Label de valor acima da barra */}
                      <text 
                        x={x + width / 2} 
                        y={y - 10} 
                        fill="hsl(var(--foreground))" 
                        textAnchor="middle" 
                        fontSize={11}
                        fontWeight={600}
                      >
                        {formatCurrency(valor)}
                      </text>
                      {/* Label de quantidade dentro da barra */}
                      <text 
                        x={x + width / 2} 
                        y={y + height / 2} 
                        fill="white" 
                        textAnchor="middle" 
                        dominantBaseline="central"
                        fontSize={14}
                        fontWeight={700}
                      >
                        {quantidade}
                      </text>
                    </g>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

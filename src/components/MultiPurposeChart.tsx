import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface MultiPurposeChartProps {
  activatedCount: number;
  notActivatedCount: number;
  solarClientsCount: number;
  nonSolarClientsCount: number;
  partners30kPlusCount: number;
  partnersBelow30kCount: number;
}

export const MultiPurposeChart = ({ 
  activatedCount, 
  notActivatedCount,
  solarClientsCount,
  nonSolarClientsCount,
  partners30kPlusCount,
  partnersBelow30kCount
}: MultiPurposeChartProps) => {
  const chartData = [
    {
      categoria: 'Ativação',
      positivo: activatedCount,
      negativo: notActivatedCount,
      positivoLabel: 'Ativos',
      negativoLabel: 'Não Ativados'
    },
    {
      categoria: 'Energia Solar',
      positivo: solarClientsCount,
      negativo: nonSolarClientsCount,
      positivoLabel: 'Com Solar',
      negativoLabel: 'Sem Solar'
    },
    {
      categoria: 'Parceiros R$30k+',
      positivo: partners30kPlusCount,
      negativo: partnersBelow30kCount,
      positivoLabel: '≥ R$30k',
      negativoLabel: '< R$30k'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise Multi-Uso</CardTitle>
        <CardDescription>Comparativo de métricas principais</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={chartData}
            layout="horizontal"
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="categoria" />
            <YAxis />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold mb-2">{data.categoria}</p>
                      <p className="text-sm text-success">
                        {data.positivoLabel}: <span className="font-semibold">{data.positivo}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {data.negativoLabel}: <span className="font-semibold">{data.negativo}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="positivo" 
              fill="hsl(var(--success))"
              radius={[8, 8, 0, 0]}
              label={(props: any) => {
                const { x, y, width, height, value } = props;
                if (height < 20) return null; // Não mostrar label se barra muito pequena
                return (
                  <text 
                    x={x + width / 2} 
                    y={y + height / 2} 
                    fill="white" 
                    textAnchor="middle" 
                    dominantBaseline="central"
                    fontSize={14}
                    fontWeight={700}
                  >
                    {value}
                  </text>
                );
              }}
            />
            <Bar 
              dataKey="negativo" 
              fill="hsl(var(--muted))"
              radius={[8, 8, 0, 0]}
              label={(props: any) => {
                const { x, y, width, height, value } = props;
                if (height < 20) return null; // Não mostrar label se barra muito pequena
                return (
                  <text 
                    x={x + width / 2} 
                    y={y + height / 2} 
                    fill="hsl(var(--muted-foreground))" 
                    textAnchor="middle" 
                    dominantBaseline="central"
                    fontSize={14}
                    fontWeight={700}
                  >
                    {value}
                  </text>
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

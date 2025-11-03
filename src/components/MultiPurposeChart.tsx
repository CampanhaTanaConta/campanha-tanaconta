import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
      'Ativados': activatedCount,
      'Não Ativados': notActivatedCount,
    },
    {
      categoria: 'Energia Solar',
      'Com Solar': solarClientsCount,
      'Sem Solar': nonSolarClientsCount,
    },
    {
      categoria: 'Parceiros R$30k+',
      '≥ R$30k': partners30kPlusCount,
      '< R$30k': partnersBelow30kCount,
    }
  ];

  // Map de cores para cada categoria
  const colorMap: Record<string, string> = {
    'Ativados': 'hsl(var(--success))',
    'Com Solar': 'hsl(var(--success))',
    '≥ R$30k': 'hsl(var(--success))',
    'Não Ativados': 'hsl(var(--muted))',
    'Sem Solar': 'hsl(var(--muted))',
    '< R$30k': 'hsl(var(--muted))',
  };

  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, value, fill } = props;
    if (height < 15) return null;
    
    const labelColor = fill === 'hsl(var(--success))' ? 'white' : '#4B5563';
    
    return (
      <text 
        x={x + width / 2} 
        y={y + height / 2} 
        fill={labelColor}
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize={13}
        fontWeight={600}
      >
        {value}
      </text>
    );
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise da carteira</CardTitle>
        <CardDescription>Comparativo de métricas principais</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-success" />
            <span className="text-sm font-medium text-white">Ativados</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted" />
            <span className="text-sm font-medium text-muted-foreground">Não Ativados</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-success" />
            <span className="text-sm font-medium text-white">Com Solar</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted" />
            <span className="text-sm font-medium text-muted-foreground">Sem Solar</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-success" />
            <span className="text-sm font-medium text-white">≥ R$30k</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted" />
            <span className="text-sm font-medium text-muted-foreground">&lt; R$30k</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={chartData}
            margin={{ top: 0, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="categoria" />
            <YAxis />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const total = payload.reduce((sum, entry) => sum + (entry.value as number), 0);
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold mb-2">{payload[0].payload.categoria}</p>
                      {payload.map((entry, index) => {
                        const isPositive = entry.name === 'Ativados' || entry.name === 'Com Solar' || entry.name === '≥ R$30k';
                        return (
                          <p key={index} className={`text-sm ${isPositive ? 'text-success' : 'text-muted-foreground'}`}>
                            {entry.name}: <span className="font-semibold">{entry.value}</span>
                          </p>
                        );
                      })}
                      <p className="text-xs text-muted-foreground mt-1 pt-1 border-t">
                        Total: {total}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="Ativados" 
              stackId="a"
              fill={colorMap['Ativados']}
              radius={[8, 8, 0, 0]}
              label={renderCustomLabel}
            />
            <Bar 
              dataKey="Não Ativados" 
              stackId="a"
              fill={colorMap['Não Ativados']}
              radius={[8, 8, 0, 0]}
              label={renderCustomLabel}
            />
            <Bar 
              dataKey="Com Solar" 
              stackId="b"
              fill={colorMap['Com Solar']}
              radius={[8, 8, 0, 0]}
              label={renderCustomLabel}
            />
            <Bar 
              dataKey="Sem Solar" 
              stackId="b"
              fill={colorMap['Sem Solar']}
              radius={[8, 8, 0, 0]}
              label={renderCustomLabel}
            />
            <Bar 
              dataKey="≥ R$30k" 
              stackId="c"
              fill={colorMap['≥ R$30k']}
              radius={[8, 8, 0, 0]}
              label={renderCustomLabel}
            />
            <Bar 
              dataKey="< R$30k" 
              stackId="c"
              fill={colorMap['< R$30k']}
              radius={[8, 8, 0, 0]}
              label={renderCustomLabel}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

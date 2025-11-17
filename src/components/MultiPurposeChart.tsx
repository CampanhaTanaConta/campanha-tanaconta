import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  // Cada categoria deve ter apenas suas próprias barras, não todas
  const chartData = [
    {
      categoria: 'Ativação',
      'Ativados': activatedCount,
      'Não Ativados': notActivatedCount,
      'Com Solar': 0,  // Não exibir para esta categoria
      'Sem Solar': 0,  // Não exibir para esta categoria
      '≥ R$30k': 0,    // Não exibir para esta categoria
      '< R$30k': 0,    // Não exibir para esta categoria
    },
    {
      categoria: 'Energia Solar',
      'Ativados': 0,   // Não exibir para esta categoria
      'Não Ativados': 0, // Não exibir para esta categoria
      'Com Solar': solarClientsCount,
      'Sem Solar': nonSolarClientsCount,
      '≥ R$30k': 0,    // Não exibir para esta categoria
      '< R$30k': 0,    // Não exibir para esta categoria
    },
    {
      categoria: 'Parceiros R$30k+',
      'Ativados': 0,   // Não exibir para esta categoria
      'Não Ativados': 0, // Não exibir para esta categoria
      'Com Solar': 0,  // Não exibir para esta categoria
      'Sem Solar': 0,  // Não exibir para esta categoria
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
    // Não renderizar label para valores zero (categorias não relevantes)
    if (value === 0 || height < 15) return null;
    
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

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex justify-center gap-6 mb-4">
        {payload.map((entry: any, index: number) => {
          const isPositive = entry.value === 'Ativados' || entry.value === 'Com Solar' || entry.value === '≥ R$30k';
          const bgColor = isPositive ? 'bg-success' : 'bg-muted';
          const textColor = isPositive ? 'text-white' : 'text-muted-foreground';
          
          return (
            <div key={`legend-${index}`} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${bgColor}`} />
              <span className={`text-sm font-medium ${textColor}`}>
                {entry.value}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Carteira</CardTitle>
        <CardDescription>Comparativo de métricas principais</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart 
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="categoria" />
            <YAxis />
            <Legend 
              content={renderLegend}
              verticalAlign="bottom"
              height={80}
            />
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
              stackId="stack"
              fill={colorMap['Ativados']}
              radius={[0, 0, 0, 0]}
              label={renderCustomLabel}
            />
            <Bar 
              dataKey="Não Ativados" 
              stackId="stack"
              fill={colorMap['Não Ativados']}
              radius={[8, 8, 0, 0]}
              label={renderCustomLabel}
            />
            <Bar 
              dataKey="Com Solar" 
              stackId="stack"
              fill={colorMap['Com Solar']}
              radius={[0, 0, 0, 0]}
              label={renderCustomLabel}
            />
            <Bar 
              dataKey="Sem Solar" 
              stackId="stack"
              fill={colorMap['Sem Solar']}
              radius={[8, 8, 0, 0]}
              label={renderCustomLabel}
            />
            <Bar 
              dataKey="≥ R$30k" 
              stackId="stack"
              fill={colorMap['≥ R$30k']}
              radius={[0, 0, 0, 0]}
              label={renderCustomLabel}
            />
            <Bar 
              dataKey="< R$30k" 
              stackId="stack"
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

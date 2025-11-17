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
  // Criar dados com chaves únicas para cada categoria para evitar empilhamento cruzado
  const chartData = [
    {
      categoria: 'Ativação',
      positivo: activatedCount,        // 16
      negativo: notActivatedCount,      // 50
      tipo: 'ativacao'
    },
    {
      categoria: 'Energia Solar',
      positivo: solarClientsCount,      // 2
      negativo: nonSolarClientsCount,   // 64
      tipo: 'solar'
    },
    {
      categoria: 'Parceiros R$30k+',
      positivo: partners30kPlusCount,   // 2
      negativo: partnersBelow30kCount,  // 64
      tipo: 'parceiros'
    }
  ];

  // Labels descritivos para cada categoria
  const labelMap: Record<string, { positivo: string; negativo: string }> = {
    'ativacao': { positivo: 'Ativados', negativo: 'Não Ativados' },
    'solar': { positivo: 'Com Solar', negativo: 'Sem Solar' },
    'parceiros': { positivo: '≥ R$30k', negativo: '< R$30k' }
  };

  // Map de cores (simplificado - agora apenas positivo e negativo)
  const colorPositivo = 'hsl(var(--success))';
  const colorNegativo = 'hsl(var(--muted))';

  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, payload, dataKey, fill } = props;
    
    // Verificar se payload e dataKey existem antes de acessar
    if (!payload || !dataKey) return null;
    
    const value = payload[dataKey];
    if (!value || value === 0 || height < 15) return null;
    
    const labelColor = fill === colorPositivo ? 'white' : '#4B5563';
    
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
        <CardTitle>Análise de Carteira</CardTitle>
        <CardDescription>Comparativo de métricas principais</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart 
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="categoria" />
            <YAxis />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const tipo = data.tipo;
                  const labels = labelMap[tipo];
                  const total = data.positivo + data.negativo;
                  
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold mb-2">{data.categoria}</p>
                      <p className="text-sm text-success">
                        {labels.positivo}: <span className="font-semibold">{data.positivo}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {labels.negativo}: <span className="font-semibold">{data.negativo}</span>
                      </p>
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
              dataKey="negativo" 
              stackId="stack"
              fill={colorNegativo}
              radius={[0, 0, 0, 0]}
              label={renderCustomLabel}
            />
            <Bar 
              dataKey="positivo" 
              stackId="stack"
              fill={colorPositivo}
              radius={[8, 8, 0, 0]}
              label={renderCustomLabel}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';

interface ParticipantData {
  participante: string;
  email: string;
  total_revendas: number;
  revendas_ativas: number;
  revendas_inativas: number;
  vendas_totais: number;
}

interface ParticipantsOverviewTableProps {
  data: ParticipantData[];
}

export const ParticipantsOverviewTable = ({ data }: ParticipantsOverviewTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof ParticipantData>('vendas_totais');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getPerformanceBadge = (taxaAtivacao: number) => {
    if (taxaAtivacao >= 70) {
      return <Badge className="bg-success text-success-foreground">🟢 Excelente</Badge>;
    } else if (taxaAtivacao >= 40) {
      return <Badge className="bg-warning text-warning-foreground">🟡 Bom</Badge>;
    } else {
      return <Badge variant="destructive">🔴 Atenção</Badge>;
    }
  };

  const handleSort = (field: keyof ParticipantData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedData = data
    .filter(participant =>
      participant.participante.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * multiplier;
      }
      return String(aValue).localeCompare(String(bValue)) * multiplier;
    });

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Performance dos Participantes</CardTitle>
          <CardDescription>Nenhum dado de participante disponível</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Performance dos Participantes</CardTitle>
        <CardDescription>
          Visão consolidada de todos os participantes da campanha
        </CardDescription>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('participante')}
                >
                  Participante {sortField === 'participante' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('total_revendas')}
                >
                  Total Revendas {sortField === 'total_revendas' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('revendas_ativas')}
                >
                  Ativas {sortField === 'revendas_ativas' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('revendas_inativas')}
                >
                  Inativas {sortField === 'revendas_inativas' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-right">Taxa Ativação</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('vendas_totais')}
                >
                  Vendas Totais {sortField === 'vendas_totais' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-center">Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.map((participant, index) => {
                const taxaAtivacao = participant.total_revendas > 0
                  ? (participant.revendas_ativas / participant.total_revendas) * 100
                  : 0;

                return (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{participant.participante}</p>
                        <p className="text-xs text-muted-foreground">{participant.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {participant.total_revendas}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-3 w-3 text-success" />
                        <span className="text-success font-medium">{participant.revendas_ativas}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingDown className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{participant.revendas_inativas}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {taxaAtivacao.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(participant.vendas_totais)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPerformanceBadge(taxaAtivacao)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Exibindo {filteredAndSortedData.length} de {data.length} participantes
        </div>
      </CardContent>
    </Card>
  );
};
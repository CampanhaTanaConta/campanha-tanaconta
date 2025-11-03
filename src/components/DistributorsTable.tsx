import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Users, Store, TrendingUp } from 'lucide-react';

interface DistributorData {
  representante: string;
  total_participantes: number;
  total_revendas: number;
  revendas_ativas: number;
  revendas_inativas: number;
  vendas_totais: number;
}

interface DistributorsTableProps {
  data: DistributorData[];
}

export const DistributorsTable = ({ data }: DistributorsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof DistributorData>('vendas_totais');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getRankingBadge = (position: number) => {
    if (position === 0) {
      return <Badge className="bg-warning text-warning-foreground">🥇 1º Lugar</Badge>;
    } else if (position === 1) {
      return <Badge className="bg-muted text-muted-foreground">🥈 2º Lugar</Badge>;
    } else if (position === 2) {
      return <Badge className="bg-muted text-muted-foreground">🥉 3º Lugar</Badge>;
    }
    return null;
  };

  const handleSort = (field: keyof DistributorData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedData = data
    .filter(distributor =>
      distributor.representante.toLowerCase().includes(searchTerm.toLowerCase())
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
          <CardTitle>🏢 Performance dos Distribuidores</CardTitle>
          <CardDescription>Nenhum dado de distribuidor disponível</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🏢 Performance dos Distribuidores</CardTitle>
        <CardDescription>
          Visão consolidada de todos os distribuidores (representantes)
        </CardDescription>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por distribuidor..."
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
                <TableHead className="w-[50px]">Rank</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('representante')}
                >
                  Distribuidor {sortField === 'representante' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('total_participantes')}
                >
                  Participantes {sortField === 'total_participantes' && (sortDirection === 'asc' ? '↑' : '↓')}
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
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('vendas_totais')}
                >
                  Vendas Totais {sortField === 'vendas_totais' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.map((distributor, index) => (
                <TableRow key={index}>
                  <TableCell className="text-center font-bold text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">{distributor.representante}</p>
                        {getRankingBadge(index)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{distributor.total_participantes}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {distributor.total_revendas}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingUp className="h-3 w-3 text-success" />
                      <span className="text-success font-medium">{distributor.revendas_ativas}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {distributor.revendas_inativas}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {formatCurrency(distributor.vendas_totais)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Exibindo {filteredAndSortedData.length} de {data.length} distribuidores
        </div>
      </CardContent>
    </Card>
  );
};
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MapPin } from 'lucide-react';

interface PendingClient {
  cliente_id: string;
  nome: string;
  cidade: string;
  uf: string;
  email: string;
  telefone: string;
  totalVendas: number;
  status: string;
}

interface PendingClientsTableProps {
  clients: PendingClient[];
}

export const PendingClientsTable = ({ clients }: PendingClientsTableProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes Pendentes de Ativação</CardTitle>
        <CardDescription>
          Clientes que ainda não atingiram R$ 500 em vendas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Todos os clientes estão ativados! 🎉
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Total Vendas</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.cliente_id}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold">{client.nome}</p>
                        <p className="text-xs text-muted-foreground">ID: {client.cliente_id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{client.cidade}, {client.uf}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs truncate max-w-[200px]">{client.email}</span>
                          </div>
                        )}
                        {client.telefone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{client.telefone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{formatCurrency(client.totalVendas)}</p>
                        <p className="text-xs text-muted-foreground">
                          Faltam {formatCurrency(500 - client.totalVendas)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.totalVendas > 0 ? "secondary" : "outline"}>
                        {client.totalVendas > 0 ? 'Em Progresso' : 'Sem Vendas'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

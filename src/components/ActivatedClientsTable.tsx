import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Phone, Mail, MapPin } from 'lucide-react';

interface MonthlySales {
  outubro: number;
  novembro: number;
  dezembro: number;
}

interface ActivatedClient {
  cliente_id: string;
  nome: string;
  cidade: string;
  uf: string;
  email: string;
  telefone: string;
  totalVendas: number;
  salesByMonth: MonthlySales;
}

interface ActivatedClientsTableProps {
  clients: ActivatedClient[];
}

export const ActivatedClientsTable = ({ clients }: ActivatedClientsTableProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes Ativados</CardTitle>
        <CardDescription>
          Clientes que atingiram R$ 500 em vendas - Vendas mensais detalhadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum cliente ativado ainda
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-right">Out/24</TableHead>
                  <TableHead className="text-right">Nov/24</TableHead>
                  <TableHead className="text-right">Dez/24</TableHead>
                  <TableHead className="text-right">Total</TableHead>
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
                    <TableCell className="text-right">
                      <span className="font-medium">{formatCurrency(client.salesByMonth.outubro)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium">{formatCurrency(client.salesByMonth.novembro)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium">{formatCurrency(client.salesByMonth.dezembro)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-primary">{formatCurrency(client.totalVendas)}</span>
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

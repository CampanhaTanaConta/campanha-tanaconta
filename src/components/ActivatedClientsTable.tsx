import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Phone, Mail, MapPin, Users } from 'lucide-react';

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
  hasSolarSales: boolean;
  totalSolarSales: number;
  compartilhado?: boolean;
  num_participantes?: number;
  outros_participantes?: string[];
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

  const formatPhoneForWhatsApp = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  };

  const getWhatsAppLink = (phone: string): string => {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    const message = encodeURIComponent(
      'Olá! Como está a adoção da maquininha Tá na Conta? Tem alguma dúvida que eu possa ajudar?'
    );
    return `https://wa.me/${formattedPhone}?text=${message}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revendas Ativadas</CardTitle>
        <CardDescription>
          Revendas que atingiram R$ 500 em vendas - Vendas mensais detalhadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma revenda ativada ainda
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Revenda</TableHead>
                  <TableHead>Clique, faça contato e aumente seu prêmio</TableHead>
                  <TableHead className="text-right">Out/24</TableHead>
                  <TableHead className="text-right">Nov/24</TableHead>
                  <TableHead className="text-right">Dez/24</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Compartilhamento</TableHead>
                  <TableHead className="text-right">Energia Solar</TableHead>
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
                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <a 
                              href={`mailto:${client.email}`}
                              className="text-xs truncate max-w-[200px] text-primary hover:underline cursor-pointer"
                              title="Enviar e-mail"
                            >
                              {client.email}
                            </a>
                          </div>
                        )}
                        {client.telefone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <a
                              href={getWhatsAppLink(client.telefone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline cursor-pointer"
                              title="Abrir WhatsApp"
                            >
                              {client.telefone}
                            </a>
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
                    <TableCell>
                      {client.compartilhado && client.num_participantes ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="gap-1">
                                <Users className="h-3 w-3" />
                                {client.num_participantes} participantes
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-semibold mb-1">Compartilhado com:</p>
                              <ul className="text-xs space-y-1">
                                {client.outros_participantes?.map((p, idx) => (
                                  <li key={idx}>• {p}</li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-xs text-muted-foreground">Exclusivo</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {client.hasSolarSales ? (
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="default" className="bg-accent text-accent-foreground">
                            ☀️ Solar
                          </Badge>
                          <span className="font-medium text-accent">
                            {formatCurrency(client.totalSolarSales)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
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

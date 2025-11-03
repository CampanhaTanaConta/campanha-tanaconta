import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Phone, Mail, MapPin, Users } from 'lucide-react';

interface PendingClient {
  cliente_id: string;
  nome: string;
  cidade: string;
  uf: string;
  email: string;
  telefone: string;
  totalVendas: number;
  status: string;
  compartilhado?: boolean;
  num_participantes?: number;
  outros_participantes?: string[];
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
        <CardTitle>Revendas Pendentes de Ativação</CardTitle>
        <CardDescription>
          Revendas que ainda não atingiram R$ 500 em vendas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Todas as revendas estão ativadas! 🎉
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Revenda</TableHead>
                  <TableHead>Clique, faça contato e aumente seu prêmio</TableHead>
                  <TableHead>Total Vendas</TableHead>
                  <TableHead>Compartilhamento</TableHead>
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
                    <TableCell>
                      <div>
                        <p className="font-semibold">{formatCurrency(client.totalVendas)}</p>
                        <p className="text-xs text-muted-foreground">
                          Faltam {formatCurrency(500 - client.totalVendas)}
                        </p>
                      </div>
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
                    <TableCell>
                      <Badge variant={client.totalVendas > 0 ? "secondary" : "outline"}>
                        {client.totalVendas > 0 ? 'Em Progresso' : 'Sem Vendas desde 15/10/25'}
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

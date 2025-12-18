import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PendingClient {
  cliente_id: string;
  nome: string;
  estab_comercial?: string;
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
    // Remover espaços no início/fim e todos os caracteres não-numéricos
    const cleaned = phone.trim().replace(/\D/g, '');
    console.log('[WhatsApp] Phone input:', phone, '-> cleaned:', cleaned);
    return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  };

  const getWhatsAppLink = (phone: string): string => {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    const message = encodeURIComponent(
      'Olá! Como está a adoção da maquininha Tá na Conta? Tem alguma dúvida que eu possa ajudar?'
    );
    
    // Validar se tem pelo menos 12 dígitos (55 + DDD + número)
    if (formattedPhone.length < 12) {
      console.warn('[WhatsApp] Número inválido:', formattedPhone);
    }
    
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
          <ScrollArea className="h-[500px] rounded-md border" type="always">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Revenda</TableHead>
                  <TableHead>Clique, faça contato e aumente seu prêmio</TableHead>
                  <TableHead>Total Vendas</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.cliente_id}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold">{client.estab_comercial || client.nome}</p>
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
                      <Badge variant={client.totalVendas > 0 ? "secondary" : "outline"}>
                        {client.totalVendas > 0 ? 'Em Progresso' : 'Sem Vendas desde 15/10/25'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

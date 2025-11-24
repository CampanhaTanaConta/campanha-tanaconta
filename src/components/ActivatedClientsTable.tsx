import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Phone, Mail, MapPin, Users } from 'lucide-react';

interface MonthlySales {
  outubro: number;
  novembro: number;
  dezembro: number;
  janeiro: number;
  fevereiro: number;
  marco: number;
}

interface ActivatedClient {
  cliente_id: string;
  nome: string;
  estab_comercial?: string;
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

  // Determinar mês/ano atual para colunas dinâmicas
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-11

  // Definir quais colunas mostrar
  const isIn2025 = currentYear === 2025;
  const isIn2026 = currentYear === 2026;

  // Calcular total de 2025 para cada cliente
  const get2025Total = (sales: MonthlySales) => {
    return sales.outubro + sales.novembro + sales.dezembro;
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
                  
                  {/* COLUNAS DINÂMICAS */}
                  {isIn2025 && (
                    <>
                      <TableHead className="text-right">Out/25</TableHead>
                      <TableHead className="text-right">Nov/25</TableHead>
                      <TableHead className="text-right">Dez/25</TableHead>
                    </>
                  )}
                  
                  {isIn2026 && (
                    <>
                      <TableHead className="text-right">2025</TableHead>
                      <TableHead className="text-right">Jan/26</TableHead>
                      {currentMonth >= 1 && <TableHead className="text-right">Fev/26</TableHead>}
                      {currentMonth >= 2 && <TableHead className="text-right">Mar/26</TableHead>}
                    </>
                  )}
                  
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Energia Solar</TableHead>
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
                    
                    {/* CÉLULAS DINÂMICAS */}
                    {isIn2025 && (
                      <>
                        <TableCell className="text-right">
                          <span className="font-medium">{formatCurrency(client.salesByMonth.outubro)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">{formatCurrency(client.salesByMonth.novembro)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">{formatCurrency(client.salesByMonth.dezembro)}</span>
                        </TableCell>
                      </>
                    )}

                    {isIn2026 && (
                      <>
                        <TableCell className="text-right">
                          <span className="font-medium">{formatCurrency(get2025Total(client.salesByMonth))}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">{formatCurrency(client.salesByMonth.janeiro)}</span>
                        </TableCell>
                        {currentMonth >= 1 && (
                          <TableCell className="text-right">
                            <span className="font-medium">{formatCurrency(client.salesByMonth.fevereiro)}</span>
                          </TableCell>
                        )}
                        {currentMonth >= 2 && (
                          <TableCell className="text-right">
                            <span className="font-medium">{formatCurrency(client.salesByMonth.marco)}</span>
                          </TableCell>
                        )}
                      </>
                    )}
                    
                    <TableCell className="text-right">
                      <span className="font-bold text-primary">{formatCurrency(client.totalVendas)}</span>
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

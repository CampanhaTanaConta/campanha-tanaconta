import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLoadData } from '@/hooks/useLoadData';
import { Loader2, Upload, CheckCircle2, AlertCircle, LogOut, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Admin = () => {
  const navigate = useNavigate();
  const { participante, isAdmin, logout } = useAuth();
  const { loadData, isLoading, result } = useLoadData();

  const [participantsUrl, setParticipantsUrl] = useState('');
  const [walletUrl, setWalletUrl] = useState('');
  const [transactionsUrl, setTransactionsUrl] = useState('');
  const [departmentStoreUrl, setDepartmentStoreUrl] = useState('');
  
  // Admin creation states
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminBirthDate, setNewAdminBirthDate] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (!participante) {
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      // Not authorized, stay on page but show unauthorized message
      return;
    }

    // Load saved URLs from localStorage
    const saved = localStorage.getItem('admin-urls');
    if (saved) {
      try {
        const urls = JSON.parse(saved);
        setParticipantsUrl(urls.participantsUrl || '');
        setWalletUrl(urls.walletUrl || '');
        setTransactionsUrl(urls.transactionsUrl || '');
        setDepartmentStoreUrl(urls.departmentStoreUrl || '');
      } catch (e) {
        console.error('Error loading saved URLs:', e);
      }
    }
  }, [participante, isAdmin, navigate]);

  const handleLoadData = async () => {
    if (!participantsUrl || !walletUrl || !transactionsUrl || !departmentStoreUrl) {
      return;
    }

    // Save URLs to localStorage
    localStorage.setItem('admin-urls', JSON.stringify({
      participantsUrl,
      walletUrl,
      transactionsUrl,
      departmentStoreUrl,
    }));

    await loadData({
      participantsUrl,
      walletUrl,
      transactionsUrl,
      departmentStoreUrl,
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatBirthDate = (value: string) => {
    let formatted = value.replace(/[^\d]/g, '');
    
    if (formatted.length >= 2) {
      formatted = formatted.slice(0, 2) + '/' + formatted.slice(2);
    }
    if (formatted.length >= 5) {
      formatted = formatted.slice(0, 5) + '/' + formatted.slice(5, 9);
    }
    
    return formatted;
  };

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBirthDate(e.target.value);
    setNewAdminBirthDate(formatted);
  };

  const validateDateFormat = (date: string) => {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = date.match(regex);
    
    if (!match) return false;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 1900 || year > 2100) return false;
    
    return true;
  };

  const handleCreateAdmin = async () => {
    if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminBirthDate.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    if (!validateDateFormat(newAdminBirthDate)) {
      toast({
        title: "Data inválida",
        description: "Use o formato DD/MM/AAAA (ex: 22/12/1981)",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingAdmin(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-admin', {
        body: {
          name: newAdminName.trim(),
          email: newAdminEmail.trim(),
          birthDate: newAdminBirthDate,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: "Erro ao criar administrador",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Administrador criado com sucesso",
        description: `${newAdminName} pode fazer login com a data de nascimento como senha`,
      });

      // Clear form
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminBirthDate('');
    } catch (error) {
      console.error('Error creating admin:', error);
      toast({
        title: "Erro ao criar administrador",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao criar o administrador. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  // Show unauthorized message if user is not admin
  if (participante && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Acesso Não Autorizado</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta página. Apenas administradores podem carregar dados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Voltar ao Dashboard
            </Button>
            <Button variant="outline" onClick={handleLogout} className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Admin - Carregar Dados</h1>
            <p className="text-muted-foreground">Importe dados das planilhas CSV</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>URLs das Planilhas</CardTitle>
                <CardDescription>Informe as URLs públicas das planilhas em formato CSV</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="participants">Participantes (E-mails de confirmação)</Label>
                  <Input
                    id="participants"
                    placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                    value={participantsUrl}
                    onChange={(e) => setParticipantsUrl(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wallet">Carteira (Campanha)</Label>
                  <Input
                    id="wallet"
                    placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                    value={walletUrl}
                    onChange={(e) => setWalletUrl(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactions">Transações</Label>
                  <Input
                    id="transactions"
                    placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                    value={transactionsUrl}
                    onChange={(e) => setTransactionsUrl(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departmentStore">Department Store (Estabelecimentos)</Label>
                  <Input
                    id="departmentStore"
                    placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                    value={departmentStoreUrl}
                    onChange={(e) => setDepartmentStoreUrl(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <Button
                  onClick={handleLoadData}
                  disabled={isLoading || !participantsUrl || !walletUrl || !transactionsUrl || !departmentStoreUrl}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando dados...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Carregar Dados
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Administradores</CardTitle>
                <CardDescription>Crie novos administradores para o sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adminName">Nome Completo</Label>
                  <Input
                    id="adminName"
                    placeholder="Ex: João da Silva"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    disabled={isCreatingAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminEmail">E-mail</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="joao@exemplo.com.br"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    disabled={isCreatingAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminBirthDate">Data de Nascimento (será a senha)</Label>
                  <Input
                    id="adminBirthDate"
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/AAAA"
                    value={newAdminBirthDate}
                    onChange={handleBirthDateChange}
                    disabled={isCreatingAdmin}
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Esta data será usada como senha de login do administrador
                  </p>
                </div>

                <Button
                  onClick={handleCreateAdmin}
                  disabled={isCreatingAdmin || !newAdminName || !newAdminEmail || !newAdminBirthDate}
                  className="w-full"
                >
                  {isCreatingAdmin ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando administrador...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Criar Administrador
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="lg:row-span-2">
            <CardHeader>
              <CardTitle>Como publicar planilhas do Google Sheets como CSV</CardTitle>
              <CardDescription>Siga estes passos para obter as URLs públicas das suas planilhas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Abra sua planilha no Google Sheets</li>
                <li>Clique em <strong>Arquivo → Compartilhar → Publicar na Web</strong></li>
                <li>Na primeira lista, selecione a <strong>aba específica</strong> que deseja publicar</li>
                <li>Na segunda lista, escolha <strong>Valores separados por vírgula (.csv)</strong></li>
                <li>Clique em <strong>Publicar</strong> e copie o link gerado</li>
                <li>Cole o link no campo correspondente abaixo</li>
              </ol>
            </CardContent>
          </Card>

          {result && (
            <Card className="border-success">
              <CardHeader>
                <CardTitle className="flex items-center text-success">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Dados Carregados com Sucesso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  <strong>Participantes:</strong> {result.participants} registros
                </p>
                <p className="text-sm">
                  <strong>Carteira:</strong> {result.wallet} registros
                </p>
                <p className="text-sm">
                  <strong>Transações:</strong> {result.transactions} registros
                </p>
                <p className="text-sm">
                  <strong>Estabelecimentos:</strong> {result.departmentStore} registros
                </p>
                {result.errors && result.errors.length > 0 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Erros encontrados:</strong>
                      <ul className="list-disc list-inside mt-2">
                        {result.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;

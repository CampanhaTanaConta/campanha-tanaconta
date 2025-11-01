import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLoadData } from '@/hooks/useLoadData';
import { Loader2, Upload, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';

const Admin = () => {
  const navigate = useNavigate();
  const { participante, logout } = useAuth();
  const { loadData, isLoading, result } = useLoadData();

  const [participantsUrl, setParticipantsUrl] = useState('');
  const [walletUrl, setWalletUrl] = useState('');
  const [transactionsUrl, setTransactionsUrl] = useState('');

  useEffect(() => {
    if (!participante) {
      navigate('/login');
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
      } catch (e) {
        console.error('Error loading saved URLs:', e);
      }
    }
  }, [participante, navigate]);

  const handleLoadData = async () => {
    if (!participantsUrl || !walletUrl || !transactionsUrl) {
      return;
    }

    // Save URLs to localStorage
    localStorage.setItem('admin-urls', JSON.stringify({
      participantsUrl,
      walletUrl,
      transactionsUrl,
    }));

    await loadData({
      participantsUrl,
      walletUrl,
      transactionsUrl,
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

        <div className="grid gap-6 max-w-4xl mx-auto">
          <Card>
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

              <Button
                onClick={handleLoadData}
                disabled={isLoading || !participantsUrl || !walletUrl || !transactionsUrl}
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
                  <strong>Participantes:</strong> {result.participantsCount} registros
                </p>
                <p className="text-sm">
                  <strong>Carteira:</strong> {result.walletCount} registros
                </p>
                <p className="text-sm">
                  <strong>Transações:</strong> {result.transactionsCount} registros
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

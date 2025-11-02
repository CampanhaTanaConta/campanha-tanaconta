import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import logo from '@/assets/logo.png';

const Login = () => {
  const navigate = useNavigate();
  const { login, checkEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [error, setError] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [emailChecked, setEmailChecked] = useState(false);
  const [showPasswordHint, setShowPasswordHint] = useState(false);

  const handlePasswordFocus = async () => {
    setShowPasswordHint(true);
    
    if (!email.trim() || emailChecked) return;
    
    setIsCheckingEmail(true);
    setError('');
    setParticipantName('');
    
    const result = await checkEmail(email);
    
    setIsCheckingEmail(false);
    setEmailChecked(true);
    
    if (result.exists) {
      setParticipantName(result.name || '');
    } else {
      setError('not_registered');
      setPassword('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailChecked) {
      setError('Por favor, clique no campo de senha para verificar o e-mail primeiro.');
      return;
    }
    
    if (password.length !== 8 || !/^\d{8}$/.test(password)) {
      setError('A senha deve conter exatamente 8 números (sua data de nascimento).');
      return;
    }
    
    setIsLoading(true);
    setError('');

    const result = await login(email, password);

    if (result.success) {
      navigate(result.isAdmin ? '/admin' : '/dashboard');
    } else {
      if (result.error === 'not_registered') {
        setError('not_registered');
      } else {
        setError(result.error || 'Erro ao fazer login');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <img src={logo} alt="Logo" className="h-20 w-20 rounded-2xl" />
          </div>
          <CardTitle className="text-2xl font-bold">Tá na Conta e no Cartão!</CardTitle>
          <CardDescription>
            Acompanhe as ativações, vendas e sua premiação acumulada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                  setParticipantName('');
                  setEmailChecked(false);
                }}
                required
                disabled={isLoading || isCheckingEmail}
              />
              {isCheckingEmail && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Verificando e-mail...
                </p>
              )}
            </div>

            {participantName && (
              <Alert className="border-primary/30 bg-primary/5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertDescription>
                  Olá, <strong>{participantName}</strong>!
                </AlertDescription>
              </Alert>
            )}

            {error && error === 'not_registered' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  E-mail não cadastrado na campanha.{' '}
                  <a 
                    href="https://www.cappta.com.br/campanha-intelbras" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline font-semibold"
                  >
                    Cadastre-se aqui
                  </a>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="ddmmaaaa"
                value={password}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '');
                  setPassword(digitsOnly);
                }}
                onFocus={handlePasswordFocus}
                required
                disabled={isLoading || isCheckingEmail}
                maxLength={8}
              />
              {showPasswordHint && (
                <Alert className="border-primary/30 bg-primary/5">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    Digite apenas os 8 números da sua data de nascimento (ddmmaaaa).
                    <br />
                    Exemplo: 15 de agosto de 1990 → 15081990
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {error && error !== 'not_registered' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || isCheckingEmail}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
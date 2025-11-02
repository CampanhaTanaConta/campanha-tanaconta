import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import logo from '@/assets/logo.png';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login, checkEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [error, setError] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [emailChecked, setEmailChecked] = useState(false);
  const [showPasswordHint, setShowPasswordHint] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  // Check for ?debug=1 in URL and activate debug mode
  useEffect(() => {
    if (searchParams.get('debug') === '1') {
      localStorage.setItem('DEBUG_LOGIN', '1');
      setDebugMode(true);
      console.warn('🔍 DEBUG MODE ATIVADO via URL');
      
      // Test hash formats to debug the stored hash
      import('crypto-js').then(CryptoJS => {
        const testDate = '10051984'; // Expected format
        const variations = [
          testDate,
          '1984-05-10',
          '1984-10-05', 
          '05101984',
          '19840510',
          '19841005',
        ];
        
        console.group('🔐 Testing Hash Variations');
        variations.forEach(v => {
          const hash = CryptoJS.default.SHA256(v).toString();
          console.log(`"${v}" => ${hash}`);
        });
        console.log('\nStored hash: d70116a54b20b6af1a5729cb0da7ea3f9f3498e6e2f79fb83dbceaec2bc29d33');
        console.groupEnd();
      });
    } else if (localStorage.getItem('DEBUG_LOGIN') === '1') {
      setDebugMode(true);
    }
  }, [searchParams]);

  const disableDebug = () => {
    localStorage.removeItem('DEBUG_LOGIN');
    setDebugMode(false);
    // Remove ?debug=1 from URL if present
    if (searchParams.get('debug') === '1') {
      searchParams.delete('debug');
      setSearchParams(searchParams);
    }
    console.warn('🔍 DEBUG MODE DESATIVADO');
  };

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
    
    if (debugMode) {
      console.warn('🚀 LOGIN SUBMIT CLICADO', { email, passwordLength: password.length });
    }
    
    if (!emailChecked) {
      setError('Por favor, clique no campo de senha para verificar o e-mail primeiro.');
      if (debugMode) console.error('❌ Email não verificado');
      return;
    }
    
    if (password.length !== 8 || !/^\d{8}$/.test(password)) {
      setError('A senha deve conter exatamente 8 números (sua data de nascimento).');
      if (debugMode) console.error('❌ Senha inválida', { length: password.length, isNumeric: /^\d{8}$/.test(password) });
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
      {debugMode && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg font-bold">
          🔍 DEBUG ATIVO
          <button 
            onClick={disableDebug}
            className="ml-2 hover:bg-yellow-600 rounded p-1"
            title="Desativar debug"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
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
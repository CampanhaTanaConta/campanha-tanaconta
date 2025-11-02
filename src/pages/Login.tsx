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
  const [isAdminUser, setIsAdminUser] = useState(false);

  // Check for ?debug=1 in URL and activate debug mode
  useEffect(() => {
    if (searchParams.get('debug') === '1') {
      localStorage.setItem('DEBUG_LOGIN', '1');
      setDebugMode(true);
      console.warn('🔍 DEBUG MODE ATIVADO via URL');
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
      setIsAdminUser(result.isAdmin);
    } else {
      setError('not_registered');
      setPassword('');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // If admin, accept any password without formatting
    if (isAdminUser) {
      setPassword(value);
      return;
    }
    
    // For participants, format as DD/MM/AAAA
    // Remove non-numeric characters except slashes
    value = value.replace(/[^\d/]/g, '');
    
    // Auto-format with slashes DD/MM/AAAA
    const digitsOnly = value.replace(/\//g, '');
    if (digitsOnly.length <= 2) {
      value = digitsOnly;
    } else if (digitsOnly.length <= 4) {
      value = digitsOnly.slice(0, 2) + '/' + digitsOnly.slice(2);
    } else {
      value = digitsOnly.slice(0, 2) + '/' + digitsOnly.slice(2, 4) + '/' + digitsOnly.slice(4, 8);
    }
    
    // Limit to 10 characters (DD/MM/AAAA)
    if (value.length <= 10) {
      setPassword(value);
    }
  };

  const validateDateFormat = (dateStr: string): boolean => {
    // Check format DD/MM/AAAA
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateStr.match(regex);
    
    if (!match) return false;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    // Basic validation
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > new Date().getFullYear()) return false;
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (debugMode) {
      console.warn('🚀 LOGIN SUBMIT CLICADO', { email, password, passwordLength: password.length, isAdmin: isAdminUser });
    }
    
    if (!emailChecked) {
      setError('Por favor, clique no campo de senha para verificar o e-mail primeiro.');
      if (debugMode) console.error('❌ Email não verificado');
      return;
    }
    
    // For participants, validate date format
    if (!isAdminUser) {
      if (password.length !== 10) {
        setError('A senha deve estar no formato DD/MM/AAAA (10 caracteres).');
        if (debugMode) console.error('❌ Senha com tamanho errado', { length: password.length });
        return;
      }

      if (!validateDateFormat(password)) {
        setError('Data inválida. Use o formato DD/MM/AAAA (ex: 10/05/1984).');
        if (debugMode) console.error('❌ Formato de data inválido', { password });
        return;
      }
    } else {
      // For admins, just check if password is not empty
      if (!password.trim()) {
        setError('Por favor, digite sua senha');
        if (debugMode) console.error('❌ Senha vazia');
        return;
      }
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
        setError(result.error || (isAdminUser ? 'Senha incorreta' : 'Data de nascimento incorreta'));
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
                type={isAdminUser ? "password" : "text"}
                inputMode={isAdminUser ? "text" : "numeric"}
                placeholder={isAdminUser ? "Digite sua senha" : "DD/MM/AAAA"}
                value={password}
                onChange={handlePasswordChange}
                onFocus={handlePasswordFocus}
                required
                disabled={isLoading || isCheckingEmail}
                maxLength={isAdminUser ? undefined : 10}
              />
              {showPasswordHint && !isAdminUser && (
                <Alert className="border-primary/30 bg-primary/5">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    Digite sua data de nascimento no formato DD/MM/AAAA.
                    <br />
                    Exemplo: 15 de agosto de 1990 → 15/08/1990
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
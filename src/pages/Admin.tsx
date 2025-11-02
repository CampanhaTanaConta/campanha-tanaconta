import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  
  // File upload states
  interface UploadedFile {
    file: File;
    blobUrl: string;
    type: 'participants' | 'wallet' | 'transactions' | 'departmentStore' | null;
    autoDetected: boolean;
  }
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
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

  // Função para identificar tipo de arquivo pelo nome
  const identifyFileType = (fileName: string): 'participants' | 'wallet' | 'transactions' | 'departmentStore' | null => {
    const nameLower = fileName.toLowerCase();
    
    if (nameLower.includes('participante')) return 'participants';
    if (nameLower.includes('carteira') || nameLower.includes('wallet')) return 'wallet';
    if (nameLower.includes('transac')) return 'transactions';
    if (nameLower.includes('estabelecimento') || nameLower.includes('loja') || nameLower.includes('department')) return 'departmentStore';
    
    return null;
  };

  const getTypeLabel = (type: string | null): string => {
    switch(type) {
      case 'participants': return 'Participantes';
      case 'wallet': return 'Carteira';
      case 'transactions': return 'Transações';
      case 'departmentStore': return 'Estabelecimentos';
      default: return 'Não identificado';
    }
  };

  const getTypeBadgeColor = (type: string | null): string => {
    switch(type) {
      case 'participants': return 'bg-blue-500';
      case 'wallet': return 'bg-green-500';
      case 'transactions': return 'bg-yellow-500';
      case 'departmentStore': return 'bg-purple-500';
      default: return 'bg-gray-400';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Handlers para drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const newFiles: UploadedFile[] = [];
    
    files.forEach(file => {
      // Validar extensão
      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast({
          title: "Arquivo inválido",
          description: `${file.name} não é um arquivo CSV`,
          variant: "destructive",
        });
        return;
      }
      
      // Validar tamanho (20MB)
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede o limite de 20MB`,
          variant: "destructive",
        });
        return;
      }
      
      // Identificar tipo
      const detectedType = identifyFileType(file.name);
      
      // Verificar duplicatas
      const existingFile = uploadedFiles.find(uf => uf.type === detectedType && detectedType !== null);
      if (existingFile) {
        toast({
          title: "Arquivo duplicado",
          description: `Já existe um arquivo do tipo ${getTypeLabel(detectedType)}`,
          variant: "destructive",
        });
        return;
      }
      
      // Criar Blob URL
      const blobUrl = URL.createObjectURL(file);
      
      newFiles.push({
        file,
        blobUrl,
        type: detectedType,
        autoDetected: detectedType !== null,
      });
      
      if (!detectedType) {
        toast({
          title: "Tipo não identificado",
          description: `Por favor, selecione o tipo para ${file.name}`,
        });
      }
    });
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    const file = uploadedFiles[index];
    URL.revokeObjectURL(file.blobUrl);
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleChangeFileType = (index: number, newType: 'participants' | 'wallet' | 'transactions' | 'departmentStore') => {
    // Verificar se já existe arquivo deste tipo
    const existingFile = uploadedFiles.find((uf, i) => uf.type === newType && i !== index);
    if (existingFile) {
      toast({
        title: "Tipo já em uso",
        description: `Já existe um arquivo do tipo ${getTypeLabel(newType)}`,
        variant: "destructive",
      });
      return;
    }
    
    setUploadedFiles(prev => prev.map((uf, i) => 
      i === index ? { ...uf, type: newType, autoDetected: false } : uf
    ));
  };

  const handleLoadData = async () => {
    // Verificar se todos os arquivos têm tipo definido
    const filesWithoutType = uploadedFiles.filter(uf => uf.type === null);
    if (filesWithoutType.length > 0) {
      toast({
        title: "Ação necessária",
        description: "Por favor, defina o tipo de todos os arquivos antes de carregar",
        variant: "destructive",
      });
      return;
    }

    // Save URLs to localStorage
    localStorage.setItem('admin-urls', JSON.stringify({
      participantsUrl,
      walletUrl,
      transactionsUrl,
      departmentStoreUrl,
    }));

    // Construir payload com arquivos carregados ou URLs
    const payload: any = {};
    
    // Adicionar Blob URLs dos arquivos carregados
    uploadedFiles.forEach(uf => {
      if (uf.type === 'participants') payload.participantsUrl = uf.blobUrl;
      if (uf.type === 'wallet') payload.walletUrl = uf.blobUrl;
      if (uf.type === 'transactions') payload.transactionsUrl = uf.blobUrl;
      if (uf.type === 'departmentStore') payload.departmentStoreUrl = uf.blobUrl;
    });
    
    // Adicionar URLs do Google Sheets (se não foram substituídas por arquivos)
    if (participantsUrl && !payload.participantsUrl) payload.participantsUrl = participantsUrl;
    if (walletUrl && !payload.walletUrl) payload.walletUrl = walletUrl;
    if (transactionsUrl && !payload.transactionsUrl) payload.transactionsUrl = transactionsUrl;
    if (departmentStoreUrl && !payload.departmentStoreUrl) payload.departmentStoreUrl = departmentStoreUrl;

    // Verificar se há pelo menos uma fonte de dados
    if (Object.keys(payload).length === 0) {
      toast({
        title: "Nenhum dado para carregar",
        description: "Por favor, carregue arquivos ou informe URLs das planilhas",
        variant: "destructive",
      });
      return;
    }

    await loadData(payload);
    
    // Limpar arquivos após carregamento bem-sucedido
    uploadedFiles.forEach(uf => URL.revokeObjectURL(uf.blobUrl));
    setUploadedFiles([]);
  };

  // Cleanup de Blob URLs ao desmontar
  useEffect(() => {
    return () => {
      uploadedFiles.forEach(uf => URL.revokeObjectURL(uf.blobUrl));
    };
  }, [uploadedFiles]);

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
                <CardTitle>📊 URLs das Planilhas</CardTitle>
                <CardDescription>Informe as URLs públicas das planilhas ou faça upload dos arquivos CSV</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Área de Drag and Drop */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input')?.click()}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-all duration-200
                    ${isDragging 
                      ? 'border-primary bg-primary/10' 
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
                    }
                    ${isLoading ? 'opacity-50 pointer-events-none' : ''}
                  `}
                >
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <div className="text-4xl">📤</div>
                    <p className="text-sm font-medium">
                      Arraste arquivos CSV aqui
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ou clique para selecionar
                    </p>
                  </div>
                </div>

                {/* Lista de Arquivos Carregados */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Arquivos carregados:</p>
                    {uploadedFiles.map((uf, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-card animate-fade-in"
                      >
                        <div className="text-2xl">📄</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{uf.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(uf.file.size)}
                          </p>
                        </div>
                        {uf.type ? (
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getTypeBadgeColor(uf.type)}`}>
                              {getTypeLabel(uf.type)}
                            </span>
                            <select
                              value={uf.type}
                              onChange={(e) => handleChangeFileType(index, e.target.value as any)}
                              className="text-xs border rounded px-2 py-1 bg-background"
                              disabled={isLoading}
                            >
                              <option value="participants">Participantes</option>
                              <option value="wallet">Carteira</option>
                              <option value="transactions">Transações</option>
                              <option value="departmentStore">Estabelecimentos</option>
                            </select>
                          </div>
                        ) : (
                          <select
                            value=""
                            onChange={(e) => handleChangeFileType(index, e.target.value as any)}
                            className="text-xs border rounded px-2 py-1 bg-background border-destructive"
                            disabled={isLoading}
                          >
                            <option value="">Selecione o tipo</option>
                            <option value="participants">Participantes</option>
                            <option value="wallet">Carteira</option>
                            <option value="transactions">Transações</option>
                            <option value="departmentStore">Estabelecimentos</option>
                          </select>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFile(index)}
                          disabled={isLoading}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          ❌
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Accordion para URLs do Google Sheets */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="urls">
                    <AccordionTrigger className="text-sm">
                      Ou use URLs do Google Sheets
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <div>
                          <label className="block text-sm font-medium mb-2">Participantes</label>
                          <Input
                            value={participantsUrl}
                            onChange={(e) => setParticipantsUrl(e.target.value)}
                            placeholder="URL da planilha de participantes"
                            disabled={isLoading}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Carteira</label>
                          <Input
                            value={walletUrl}
                            onChange={(e) => setWalletUrl(e.target.value)}
                            placeholder="URL da planilha de carteira"
                            disabled={isLoading}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Transações</label>
                          <Input
                            value={transactionsUrl}
                            onChange={(e) => setTransactionsUrl(e.target.value)}
                            placeholder="URL da planilha de transações"
                            disabled={isLoading}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Estabelecimentos</label>
                          <Input
                            value={departmentStoreUrl}
                            onChange={(e) => setDepartmentStoreUrl(e.target.value)}
                            placeholder="URL da planilha de estabelecimentos"
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Button 
                  onClick={handleLoadData} 
                  disabled={isLoading}
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
              <CardTitle>📝 Como Carregar Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-primary">📤 Opção 1: Upload Direto (Recomendado)</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Arraste seus arquivos CSV para a área de upload à esquerda</li>
                  <li>O sistema identificará automaticamente o tipo pelo nome do arquivo:
                    <ul className="list-disc list-inside ml-6 mt-1 space-y-1 text-muted-foreground">
                      <li><strong>Participantes:</strong> arquivo com "participante" no nome</li>
                      <li><strong>Carteira:</strong> arquivo com "carteira" ou "wallet"</li>
                      <li><strong>Transações:</strong> arquivo com "transacao" ou "transacoes"</li>
                      <li><strong>Estabelecimentos:</strong> arquivo com "estabelecimento" ou "loja"</li>
                    </ul>
                  </li>
                  <li>Confirme ou corrija o tipo identificado usando o dropdown</li>
                  <li>Clique em "Carregar Dados"</li>
                </ol>
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm font-medium">💡 Dica:</p>
                  <p className="text-sm mt-1">Você pode atualizar apenas uma planilha por vez. Não é necessário enviar todas!</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <h3 className="font-semibold">🔗 Opção 2: URLs do Google Sheets</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Abra sua planilha no Google Sheets</li>
                  <li>Clique em "Arquivo" → "Compartilhar" → "Publicar na Web"</li>
                  <li>Selecione a aba específica que deseja publicar</li>
                  <li>No formato, selecione "Valores separados por vírgula (.csv)"</li>
                  <li>Clique em "Publicar" e copie o link gerado</li>
                  <li>Expanda "Ou use URLs do Google Sheets" e cole o link</li>
                </ol>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium mb-1">⚠️ Importante:</p>
                  <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                    <li>Certifique-se de que a planilha está publicada publicamente</li>
                    <li>O link deve terminar com "output=csv"</li>
                  </ul>
                </div>
              </div>
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

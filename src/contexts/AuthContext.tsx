import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CryptoJS from 'crypto-js';

interface AuthContextType {
  userEmail: string | null;
  participante: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; participante?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [participante, setParticipante] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const storedEmail = localStorage.getItem('userEmail');
    const storedParticipante = localStorage.getItem('participante');
    
    if (storedEmail && storedParticipante) {
      setUserEmail(storedEmail);
      setParticipante(storedParticipante);
      // Check admin status from database (never trust localStorage)
      checkAdminStatus(storedEmail);
    }
    
    setIsLoading(false);
  }, []);

  const checkAdminStatus = async (email: string) => {
    try {
      const { data: participant } = await supabase
        .from('participants')
        .select('id')
        .eq('email', email)
        .single();

      if (participant) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', participant.id)
          .eq('role', 'admin')
          .maybeSingle();

        setIsAdmin(!!roleData);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Query participant data
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (participantError) {
        console.error('Error fetching participant:', participantError);
        return { success: false, error: 'Erro ao buscar dados do participante' };
      }

      if (!participant) {
        return { success: false, error: 'E-mail não encontrado' };
      }

      // Hash the provided password
      const hashedPassword = CryptoJS.SHA256(password).toString();

      // Compare with stored hash
      if (hashedPassword !== participant.birth_hash) {
        return { success: false, error: 'Senha incorreta' };
      }

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', participant.id)
        .eq('role', 'admin')
        .maybeSingle();

      const userIsAdmin = !!roleData;

      // Set session
      setUserEmail(normalizedEmail);
      setParticipante(participant.participante);
      setIsAdmin(userIsAdmin);
      
      // Store in localStorage (email and participante only, never admin status)
      localStorage.setItem('userEmail', normalizedEmail);
      localStorage.setItem('participante', participant.participante);

      return { success: true, participante: participant.participante };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Erro ao fazer login' };
    }
  };

  const logout = () => {
    setUserEmail(null);
    setParticipante(null);
    setIsAdmin(false);
    localStorage.removeItem('userEmail');
    localStorage.removeItem('participante');
  };

  return (
    <AuthContext.Provider value={{ userEmail, participante, isAdmin, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CryptoJS from 'crypto-js';

interface AuthContextType {
  userEmail: string | null;
  participante: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  checkEmail: (email: string) => Promise<{ exists: boolean; name: string | null; isAdmin: boolean }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; participante?: string; isAdmin?: boolean }>;
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

  const checkEmail = async (email: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Use secure function to check email
      const { data, error } = await supabase
        .rpc('check_email_exists', { p_email: normalizedEmail })
        .single();

      if (error) {
        console.error('Error checking email:', error);
        return { exists: false, name: null, isAdmin: false };
      }

      return {
        exists: data.email_found,
        name: data.user_name,
        isAdmin: data.is_admin_user
      };
    } catch (error) {
      console.error('Error checking email:', error);
      return { exists: false, name: null, isAdmin: false };
    }
  };

  const checkAdminStatus = async (email: string) => {
    try {
      // Use secure function to check email and get user info
      const { data, error } = await supabase
        .rpc('check_email_exists', { p_email: email })
        .single();

      if (error || !data || !data.email_found) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }

      // For now, we trust the is_admin_user flag from the function
      // In a production environment, you'd want additional verification
      setIsAdmin(data.is_admin_user);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const hashedPassword = CryptoJS.SHA256(password).toString();
      
      // Try admin login first
      const { data: adminResult, error: adminError } = await supabase
        .rpc('verify_admin_login', {
          p_email: normalizedEmail,
          p_password_hash: hashedPassword
        })
        .single();

      if (!adminError && adminResult && adminResult.is_valid) {
        // Set session variables in database for RLS policies
        await supabase.rpc('set_user_session', {
          p_email: normalizedEmail,
          p_participante: adminResult.user_name
        });

        // Set session for admin
        setUserEmail(normalizedEmail);
        setParticipante(adminResult.user_name);
        setIsAdmin(adminResult.is_admin);
        
        localStorage.setItem('userEmail', normalizedEmail);
        localStorage.setItem('participante', adminResult.user_name);

        return { success: true, participante: adminResult.user_name, isAdmin: adminResult.is_admin };
      }

      // Try participant login
      const { data: participantResult, error: participantError } = await supabase
        .rpc('verify_participant_login', {
          p_email: normalizedEmail,
          p_birth_hash: hashedPassword
        })
        .single();

      if (participantError) {
        console.error('Error verifying login:', participantError);
        return { success: false, error: 'Erro ao fazer login' };
      }

      if (!participantResult || !participantResult.is_valid) {
        // Check if email exists to show appropriate error
        const { data: emailCheck } = await supabase
          .rpc('check_email_exists', { p_email: normalizedEmail })
          .single();
        
        if (emailCheck && emailCheck.email_found) {
          return { success: false, error: 'Senha incorreta' };
        } else {
          return { success: false, error: 'not_registered' };
        }
      }

      // Set session variables in database for RLS policies
      await supabase.rpc('set_user_session', {
        p_email: normalizedEmail,
        p_participante: participantResult.user_name
      });

      // Set session
      setUserEmail(normalizedEmail);
      setParticipante(participantResult.user_name);
      setIsAdmin(participantResult.is_admin);
      
      localStorage.setItem('userEmail', normalizedEmail);
      localStorage.setItem('participante', participantResult.user_name);

      return { success: true, participante: participantResult.user_name, isAdmin: participantResult.is_admin };
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
    <AuthContext.Provider value={{ userEmail, participante, isAdmin, isLoading, checkEmail, login, logout }}>
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
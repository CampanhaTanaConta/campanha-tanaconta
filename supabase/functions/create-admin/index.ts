import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { HmacSHA256 } from "https://esm.sh/crypto-js@4.2.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateAdminRequest {
  name: string;
  email: string;
  birthDate: string; // DD/MM/AAAA
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { name, email, birthDate } = await req.json() as CreateAdminRequest;

    console.log(`[create-admin] Tentando criar admin: ${email}`);

    // Validações básicas
    if (!name || !email || !birthDate) {
      return new Response(
        JSON.stringify({ error: 'Nome, email e data de nascimento são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar formato DD/MM/AAAA
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!dateRegex.test(birthDate)) {
      return new Response(
        JSON.stringify({ error: 'Data de nascimento deve estar no formato DD/MM/AAAA' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o email já existe em admin_users
    const { data: existingAdmin } = await supabaseClient
      .from('admin_users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingAdmin) {
      return new Response(
        JSON.stringify({ error: 'Já existe um administrador com este email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o email já existe em participants
    const { data: existingParticipant } = await supabaseClient
      .from('participants')
      .select('email')
      .eq('email', email)
      .single();

    if (existingParticipant) {
      return new Response(
        JSON.stringify({ error: 'Já existe um participante com este email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Converter DD/MM/AAAA para YYYY-MM-DD
    const match = birthDate.match(dateRegex);
    if (!match) {
      return new Response(
        JSON.stringify({ error: 'Formato de data inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [, day, month, year] = match;
    const birthRaw = `${year}-${month}-${day}`;

    // Gerar hash COM BARRAS (DD/MM/AAAA)
    const birthHash = HmacSHA256(birthDate, '').toString();
    const passwordHash = birthHash;

    console.log(`[create-admin] Gerando hash para: ${birthDate}`);
    console.log(`[create-admin] Hash gerado: ${birthHash}`);

    // Inserir admin_users
    const { data: newAdmin, error: insertError } = await supabaseClient
      .from('admin_users')
      .insert({
        name,
        email,
        birth_raw: birthRaw,
        birth_hash: birthHash,
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[create-admin] Erro ao inserir admin:', insertError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar administrador: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[create-admin] Admin criado com ID: ${newAdmin.id}`);

    // Inserir role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: newAdmin.id,
        role: 'admin',
      });

    if (roleError) {
      console.error('[create-admin] Erro ao inserir role:', roleError);
      // Tentar deletar o admin criado
      await supabaseClient
        .from('admin_users')
        .delete()
        .eq('id', newAdmin.id);
      
      return new Response(
        JSON.stringify({ error: `Erro ao atribuir permissões: ${roleError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[create-admin] Admin ${email} criado com sucesso!`);

    return new Response(
      JSON.stringify({
        success: true,
        admin: {
          id: newAdmin.id,
          name: newAdmin.name,
          email: newAdmin.email,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-admin] Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

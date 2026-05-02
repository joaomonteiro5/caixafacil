-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.user_status AS ENUM ('pending_payment', 'active', 'blocked');
CREATE TYPE public.lancamento_tipo AS ENUM ('entrada', 'saida');
CREATE TYPE public.fiado_status AS ENUM ('em_aberto', 'pago', 'atrasado');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  status public.user_status NOT NULL DEFAULT 'pending_payment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- get_user_status
CREATE OR REPLACE FUNCTION public.get_user_status(_user_id UUID)
RETURNS public.user_status LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT status FROM public.profiles WHERE id = _user_id
$$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_admin BOOLEAN := lower(NEW.email) = 'jp14lopes07@gmail.com';
BEGIN
  INSERT INTO public.profiles (id, nome, email, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN _is_admin THEN 'active'::public.user_status ELSE 'pending_payment'::public.user_status END
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN _is_admin THEN 'admin'::public.app_role ELSE 'user'::public.app_role END);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- protect admin
CREATE OR REPLACE FUNCTION public.protect_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(OLD.email) = 'jp14lopes07@gmail.com' THEN
    NEW.status := 'active';
    NEW.email := OLD.email;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_protect_admin BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_admin();

CREATE OR REPLACE FUNCTION public.protect_admin_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email TEXT;
BEGIN
  SELECT email INTO _email FROM public.profiles WHERE id = COALESCE(OLD.user_id, NEW.user_id);
  IF lower(_email) = 'jp14lopes07@gmail.com' THEN
    RAISE EXCEPTION 'Não é permitido modificar o papel do administrador principal';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
CREATE TRIGGER user_roles_protect_admin BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_admin_role();

-- RLS profiles
CREATE POLICY "Usuário vê próprio perfil" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admin vê todos os perfis" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Usuário atualiza próprio nome" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admin atualiza qualquer perfil" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS user_roles
CREATE POLICY "Usuário vê próprios papéis" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin vê todos os papéis" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- LANCAMENTOS
CREATE TABLE public.lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
  tipo public.lancamento_tipo NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Geral',
  metodo_pagamento TEXT NOT NULL DEFAULT 'Dinheiro',
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
CREATE INDEX lancamentos_user_data_idx ON public.lancamentos(user_id, data DESC);
CREATE TRIGGER lancamentos_touch BEFORE UPDATE ON public.lancamentos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "Lançamentos: select próprio" ON public.lancamentos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Lançamentos: insert próprio (ativo)" ON public.lancamentos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.get_user_status(auth.uid()) = 'active');
CREATE POLICY "Lançamentos: update próprio (ativo)" ON public.lancamentos FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.get_user_status(auth.uid()) = 'active') WITH CHECK (user_id = auth.uid() AND public.get_user_status(auth.uid()) = 'active');
CREATE POLICY "Lançamentos: delete próprio (ativo)" ON public.lancamentos FOR DELETE TO authenticated USING (user_id = auth.uid() AND public.get_user_status(auth.uid()) = 'active');

-- FIADOS
CREATE TABLE public.fiados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
  valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_pago >= 0),
  vencimento DATE,
  status public.fiado_status NOT NULL DEFAULT 'em_aberto',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fiados ENABLE ROW LEVEL SECURITY;
CREATE INDEX fiados_user_idx ON public.fiados(user_id, created_at DESC);
CREATE TRIGGER fiados_touch BEFORE UPDATE ON public.fiados FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "Fiado: select próprio" ON public.fiados FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Fiado: insert próprio (ativo)" ON public.fiados FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.get_user_status(auth.uid()) = 'active');
CREATE POLICY "Fiado: update próprio (ativo)" ON public.fiados FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.get_user_status(auth.uid()) = 'active') WITH CHECK (user_id = auth.uid() AND public.get_user_status(auth.uid()) = 'active');
CREATE POLICY "Fiado: delete próprio (ativo)" ON public.fiados FOR DELETE TO authenticated USING (user_id = auth.uid() AND public.get_user_status(auth.uid()) = 'active');
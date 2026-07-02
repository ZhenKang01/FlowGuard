-- 0. Drop permissive legacy policies
DROP POLICY IF EXISTS "work_orders: authenticated read" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders: authenticated insert" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders: authenticated update status" ON public.work_orders;

-- 1. Add assigned_worker_id to work_orders
ALTER TABLE public.work_orders ADD COLUMN assigned_worker_id uuid REFERENCES auth.users(id);

-- 2. Create facility_logs table
CREATE TABLE IF NOT EXISTS public.facility_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_worker_id uuid REFERENCES auth.users(id),
    log_text text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.facility_logs ENABLE ROW LEVEL SECURITY;

-- 3. Update profiles role constraint to include 'worker'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'worker', 'facility_manager', 'technician', 'viewer'));

-- 4. Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. Admin Policies (SELECT, INSERT, UPDATE, DELETE all rows)
CREATE POLICY "admin_all_work_orders" ON public.work_orders
  FOR ALL TO authenticated
  USING ( public.get_user_role() = 'admin' )
  WITH CHECK ( public.get_user_role() = 'admin' );

CREATE POLICY "admin_all_facility_logs" ON public.facility_logs
  FOR ALL TO authenticated
  USING ( public.get_user_role() = 'admin' )
  WITH CHECK ( public.get_user_role() = 'admin' );

-- 6. Worker Policies (SELECT and UPDATE own assigned rows only)
CREATE POLICY "worker_select_work_orders" ON public.work_orders
  FOR SELECT TO authenticated
  USING ( public.get_user_role() = 'worker' AND assigned_worker_id = auth.uid() );

CREATE POLICY "worker_update_work_orders" ON public.work_orders
  FOR UPDATE TO authenticated
  USING ( public.get_user_role() = 'worker' AND assigned_worker_id = auth.uid() )
  WITH CHECK ( public.get_user_role() = 'worker' AND assigned_worker_id = auth.uid() );

CREATE POLICY "worker_select_facility_logs" ON public.facility_logs
  FOR SELECT TO authenticated
  USING ( public.get_user_role() = 'worker' AND assigned_worker_id = auth.uid() );

CREATE POLICY "worker_update_facility_logs" ON public.facility_logs
  FOR UPDATE TO authenticated
  USING ( public.get_user_role() = 'worker' AND assigned_worker_id = auth.uid() )
  WITH CHECK ( public.get_user_role() = 'worker' AND assigned_worker_id = auth.uid() );

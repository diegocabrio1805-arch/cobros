-- 1. Add deleted_at to expenses (only table missing it)
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create the Trigger Function to populate deleted_items
CREATE OR REPLACE FUNCTION public.on_record_deleted()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.deleted_items (table_name, record_id, branch_id, deleted_at)
  VALUES (
    TG_TABLE_NAME,
    OLD.id::text,
    CASE 
      WHEN TG_TABLE_NAME = 'clients' THEN OLD.branch_id
      WHEN TG_TABLE_NAME = 'loans' THEN OLD.branch_id
      WHEN TG_TABLE_NAME = 'payments' THEN OLD.branch_id
      WHEN TG_TABLE_NAME = 'collection_logs' THEN OLD.branch_id
      WHEN TG_TABLE_NAME = 'expenses' THEN OLD.branch_id
      ELSE NULL
    END,
    NOW()
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Triggers to main tables
DROP TRIGGER IF EXISTS tr_clients_deletion ON public.clients;
CREATE TRIGGER tr_clients_deletion
AFTER DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.on_record_deleted();

DROP TRIGGER IF EXISTS tr_loans_deletion ON public.loans;
CREATE TRIGGER tr_loans_deletion
AFTER DELETE ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.on_record_deleted();

DROP TRIGGER IF EXISTS tr_payments_deletion ON public.payments;
CREATE TRIGGER tr_payments_deletion
AFTER DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.on_record_deleted();

DROP TRIGGER IF EXISTS tr_logs_deletion ON public.collection_logs;
CREATE TRIGGER tr_logs_deletion
AFTER DELETE ON public.collection_logs
FOR EACH ROW EXECUTE FUNCTION public.on_record_deleted();

DROP TRIGGER IF EXISTS tr_expenses_deletion ON public.expenses;
CREATE TRIGGER tr_expenses_deletion
AFTER DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.on_record_deleted();

-- 4. Enable RLS on deleted_items (already enabled but good to ensure policy)
ALTER TABLE public.deleted_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.deleted_items;
CREATE POLICY "Enable read access for all authenticated users" ON public.deleted_items
FOR SELECT TO authenticated USING (true);

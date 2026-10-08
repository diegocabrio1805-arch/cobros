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
      WHEN TG_TABLE_NAME = 'simulated_orders' THEN OLD.branch_id
      ELSE NULL
    END,
    NOW()
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adjuntar el trigger a simulated_orders
DROP TRIGGER IF EXISTS tr_simulated_orders_deletion ON public.simulated_orders;
CREATE TRIGGER tr_simulated_orders_deletion
AFTER DELETE ON public.simulated_orders
FOR EACH ROW EXECUTE FUNCTION public.on_record_deleted();

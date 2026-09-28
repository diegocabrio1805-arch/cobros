
CREATE OR REPLACE FUNCTION public.get_collector_logs(p_collector_id uuid, p_last_sync timestamp with time zone DEFAULT NULL)
RETURNS SETOF collection_logs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_last_sync IS NOT NULL THEN
    RETURN QUERY SELECT * FROM collection_logs WHERE recorded_by = p_collector_id AND updated_at > p_last_sync;
  ELSE
    RETURN QUERY SELECT * FROM collection_logs WHERE recorded_by = p_collector_id;
  END IF;
END;
$$;


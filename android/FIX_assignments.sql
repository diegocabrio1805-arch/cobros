-- MIGRACIÓN DE CORRECCIÓN DE ASIGNACIONES
BEGIN;

UPDATE public.loans SET collector_id = 'c956ea2f-99d7-4956-93d5-36842aeb0d54' WHERE id = '23cb4ec2-bc49-44d0-91a2-d250e97a41aa'; -- Cliente: NORMA ELIZABETH BENITEZ DE BENITEZ
UPDATE public.loans SET collector_id = '78f8bf14-1d8f-4763-ad21-619fa7724a52' WHERE id = '2bcde7b1-42f6-442b-906e-bb4086a6f14c'; -- Cliente: JORGE DANIEL IBARROLA
UPDATE public.loans SET collector_id = '78f8bf14-1d8f-4763-ad21-619fa7724a52' WHERE id = '9afb1102-f296-4fdd-b246-3ef999c8292b'; -- Cliente: CLIENTE DE PRUEBA Z 2
UPDATE public.loans SET collector_id = '78f8bf14-1d8f-4763-ad21-619fa7724a52' WHERE id = '0aec9f61-daf9-420f-a46b-8b501c12babb'; -- Cliente: FREDY ARNALDO CARDOZO FARINA
UPDATE public.loans SET collector_id = '78f8bf14-1d8f-4763-ad21-619fa7724a52' WHERE id = '0dab578a-4da7-440d-a529-04db0d5b9762'; -- Cliente: CLIENTE DE PRUEBA Z 2
UPDATE public.loans SET collector_id = '78f8bf14-1d8f-4763-ad21-619fa7724a52' WHERE id = 'cd8af43e-9aa1-411f-bef5-9967faa5f226'; -- Cliente: EVARISTO BENEGA QUINTANA
UPDATE public.loans SET collector_id = 'c956ea2f-99d7-4956-93d5-36842aeb0d54' WHERE id = 'bbed1199-2539-4057-b360-68b1347b2701'; -- Cliente: GREGORIA LEON
UPDATE public.loans SET collector_id = '78f8bf14-1d8f-4763-ad21-619fa7724a52' WHERE id = '5344657a-cbbc-490c-8ed0-d493b4448801'; -- Cliente: OLGA ZARACHO COLMAN

-- 2. Normalizar branch_id en clientes (basado en la sucursal del cobrador que tiene el préstamo activo)
UPDATE public.clients SET branch_id = '8ba7162c-353e-4e5f-9271-50a791cd894b' WHERE id = '3807a31e-3e5c-4fab-81f5-ddf462d5fb40'; -- Cobrador: DIEGUITOJEFE
UPDATE public.clients SET branch_id = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec' WHERE id = '4d86d00f-ae8d-4c83-a634-5ed85adbfa7f'; -- Cobrador: FABIAN ARRUA
UPDATE public.clients SET branch_id = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec' WHERE id = 'eef1788b-c6bf-4ef3-8bb7-5d45f3182671'; -- Cobrador: FABIAN ARRUA
UPDATE public.clients SET branch_id = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec' WHERE id = '9d2b6ee2-2540-47d6-be9f-c6917c844007'; -- Cobrador: diego villalba
UPDATE public.clients SET branch_id = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec' WHERE id = '23bfbc88-a5c3-4f8e-bc5c-6fdde3df7eaa'; -- Cobrador: DERLIS ARMOA
UPDATE public.clients SET branch_id = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec' WHERE id = '2684f27c-b4af-4f4e-a56a-ca30aca9149b'; -- Cobrador: FABIAN ARRUA
UPDATE public.clients SET branch_id = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec' WHERE id = '793cb331-5fb9-424d-a9fb-5b0f5a3d6a17'; -- Cobrador: FABIAN ARRUA
UPDATE public.clients SET branch_id = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec' WHERE id = 'f5718c94-79fd-4d1f-809b-d1698a9336ac'; -- Cobrador: FABIAN ARRUA
UPDATE public.clients SET branch_id = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec' WHERE id = '38440526-37d2-437f-80d0-3b0d07a5e678'; -- Cobrador: FABIAN ARRUA
UPDATE public.clients SET branch_id = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec' WHERE id = '42310320-3b70-4546-a79b-d37d8dcd7490'; -- Cobrador: FABIAN ARRUA
UPDATE public.clients SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE id = 'e1015b43-474d-46f3-9d10-fc70f8159cde'; -- Cobrador: Administrador Sistema
UPDATE public.clients SET branch_id = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec' WHERE id = '2ad79826-8563-455d-bab1-f1ac3b0f1489'; -- Cobrador: DERLIS ARMOA
UPDATE public.clients SET branch_id = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec' WHERE id = '9b0a23c7-28b5-43c7-9b56-5b3b0682ba22'; -- Cobrador: DERLIS ARMOA
UPDATE public.clients SET branch_id = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec' WHERE id = 'e4ab9288-1c1e-4d79-8d10-3d27d0734265'; -- Cobrador: DERLIS ARMOA
UPDATE public.clients SET branch_id = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec' WHERE id = 'df5bdac5-03cf-4332-9fb1-5fcda24b7e3f'; -- Cobrador: FABIAN ARRUA
UPDATE public.clients SET branch_id = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec' WHERE id = 'cec02171-a96c-4ed9-8f47-0c8ff83c62fe'; -- Cobrador: DERLIS ARMOA

COMMIT;

-- Fix branch_id for clients created by Fabian (c956e...)
-- They are currently assigned to his own ID, but should be assigned to the Admin ID (0000...001)
-- to be visible on the Web Dashboard.

UPDATE clients
SET branch_id = '00000000-0000-0000-0000-000000000001'
WHERE added_by = 'c956ea2f-99d7-4956-93d5-36842aeb0d54'
  AND branch_id = 'c956ea2f-99d7-4956-93d5-36842aeb0d54';

-- Also fix loans if any
UPDATE loans
SET branch_id = '00000000-0000-0000-0000-000000000001'
WHERE branch_id = 'c956ea2f-99d7-4956-93d5-36842aeb0d54';

const mergeData = (local, remote, pendingAddIds, pendingDeleteIds, isFullSync, isAppendOnly = false) => {
  const remoteMap = new Map((remote || []).map(i => [i.id, i]));
  const resultArr = (remote || []).filter(r => !pendingDeleteIds.has(r.id) && !r.deletedAt);
  const resultMap = new Map(resultArr.map(i => [i.id, i]));

  local.forEach(l => {
    if (!l || !l.id || pendingDeleteIds.has(l.id)) return;
    const r = remoteMap.get(l.id);
    const isRecent = l.updated_at && (Date.now() - new Date(l.updated_at).getTime() < 86400000);

    if (!r) {
      if ((pendingAddIds.has(l.id) || isRecent) && !resultMap.has(l.id)) {
        resultMap.set(l.id, l);
      }
    } else {
      const remoteInstallments = Array.isArray(r.installments) ? r.installments : [];
      const localInstallments = Array.isArray(l.installments) ? l.installments : [];
      const remotePaidCount = remoteInstallments.filter((i) => i.status === 'Pagado').length;
      const localPaidCount = localInstallments.filter((i) => i.status === 'Pagado').length;
      const remoteIsMoreComplete = remoteInstallments.length > localInstallments.length || remotePaidCount > localPaidCount;

      if (!isAppendOnly && !remoteIsMoreComplete && (l.updated_at && r.updated_at && new Date(l.updated_at).getTime() > new Date(r.updated_at).getTime())) {
        resultMap.set(l.id, l);
      } else if (r) {
        const cleanR = Object.fromEntries(Object.entries(r).filter(([_, v]) => v !== undefined));
        resultMap.set(r.id, { ...l, ...cleanR });
      }
    }
  });

  if (!isFullSync) {
    local.forEach(l => {
      if (l && l.id && !pendingDeleteIds.has(l.id) && !remoteMap.has(l.id) && !resultMap.has(l.id)) {
        resultMap.set(l.id, l);
      }
    });
  }
  return Array.from(resultMap.values());
};

// Simulation scenario
const local = []; // initially empty
const remote = [
  {
    id: 'a7ea4843-8390-4a55-bac9-6f779f6fe771',
    clientId: '2e6628f7-d6bc-4f84-9d5c-fc1d8dfb2a1e',
    clientName: 'MARIELA ASUNCION CON SU TIA',
    collectorId: 'a69e2207-db0a-49b7-a764-2787624e5777',
    branchId: 'b3716a78-fb4f-4918-8c0b-92004e3d63ec'
  }
];

const pendingAddIds = new Set();
const pendingDeleteIds = new Set();
const isFullSync = false;

const result = mergeData(local, remote, pendingAddIds, pendingDeleteIds, isFullSync);
console.log("Merge result (incremental, local empty):", result);

const resultFull = mergeData(local, remote, pendingAddIds, pendingDeleteIds, true);
console.log("Merge result (fullSync, local empty):", resultFull);

const fs = require('fs');
const file = 'C:/Users/Usuario/.antigravity/cobros/hooks/useSync.ts';
let content = fs.readFileSync(file, 'utf8');

const search1 = const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                  deletedItemsQuery = deletedItemsQuery.gt('deleted_at', sevenDaysAgo);
              };

const replace1 = const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                  deletedItemsQuery = deletedItemsQuery.gt('deleted_at', sevenDaysAgo);
                  
                  // FASE 1: Limitar pagos a 60 dias para la carga rapida inicial
                  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
                  paymentsQuery = paymentsQuery.gte('updated_at', sixtyDaysAgo);
                  logsQuery = logsQuery.gte('updated_at', sixtyDaysAgo);
              };

content = content.replace(search1, replace1);

const search2 = // Yield thread before heavy React re-render
              await new Promise(r => setTimeout(r, 50));
              if (onDataUpdated) onDataUpdated(result, fullSync);
              return result;;

const replace2 = // Yield thread before heavy React re-render
              await new Promise(r => setTimeout(r, 50));
              if (onDataUpdated) onDataUpdated(result, fullSync);
              
              // FASE 2: Descarga de historial profundo silencioso
              if (fullSync) {
                  setTimeout(() => {
                      if (window._triggerDeepBackfill) window._triggerDeepBackfill();
                  }, 15000); // 15s despues de liberar UI
              }
              
              return result;;

content = content.replace(search2, replace2);

fs.writeFileSync(file, content, 'utf8');

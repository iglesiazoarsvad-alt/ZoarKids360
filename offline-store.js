(() => {
    const DATABASE_NAME = 'zoarkids360-offline';
    const DATABASE_VERSION = 1;
    const RESPONSES_STORE = 'responses';
    const MUTATIONS_STORE = 'mutations';
    let databasePromise;

    function openDatabase() {
        if (databasePromise) return databasePromise;
        databasePromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(RESPONSES_STORE)) {
                    database.createObjectStore(RESPONSES_STORE, { keyPath: 'endpoint' });
                }
                if (!database.objectStoreNames.contains(MUTATIONS_STORE)) {
                    database.createObjectStore(MUTATIONS_STORE, { keyPath: 'id', autoIncrement: true });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('No se pudo abrir el almacenamiento offline.'));
        });
        return databasePromise;
    }

    async function runTransaction(storeName, mode, action) {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(storeName, mode);
            const request = action(transaction.objectStore(storeName));
            let result;
            request.onsuccess = () => { result = request.result; };
            request.onerror = () => reject(request.error || new Error('Falló el almacenamiento offline.'));
            transaction.oncomplete = () => resolve(result);
            transaction.onerror = () => reject(transaction.error || new Error('Falló la transacción offline.'));
            transaction.onabort = () => reject(transaction.error || new Error('Se canceló el almacenamiento offline.'));
        });
    }

    function getTable(endpoint) {
        return endpoint.split('?')[0];
    }

    function canFilterEndpoint(endpoint) {
        const query = endpoint.split('?')[1] || '';
        for (const [field, condition] of new URLSearchParams(query)) {
            if (field === 'select' && condition === '*') continue;
            if (condition.startsWith('eq.') || condition === 'is.null') continue;
            return false;
        }
        return true;
    }

    function matchesEndpoint(row, endpoint) {
        const query = endpoint.split('?')[1] || '';
        const params = new URLSearchParams(query);
        for (const [field, condition] of params) {
            if (['order', 'select', 'limit', 'offset'].includes(field)) continue;
            if (field === 'or') return false;
            if (condition.startsWith('eq.') && String(row[field]) !== condition.slice(3)) return false;
            if (condition === 'is.null' && row[field] != null) return false;
            if (!condition.startsWith('eq.') && condition !== 'is.null') return false;
        }
        return true;
    }

    function stableStringify(value) {
        if (Array.isArray(value)) {
            const ordered = [...value].sort((a, b) => String(a?.id ?? stableStringify(a)).localeCompare(String(b?.id ?? stableStringify(b))));
            return `[${ordered.map(stableStringify).join(',')}]`;
        }
        if (value && typeof value === 'object') {
            return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
        }
        return JSON.stringify(value);
    }

    async function getCachedRows(endpoint) {
        const table = getTable(endpoint);
        const rows = await runTransaction(RESPONSES_STORE, 'readonly', store => store.getAll());
        const exact = rows.find(entry => entry.endpoint === endpoint);
        if (exact && Array.isArray(exact.data)) return exact.data;
        const fullTableSnapshot = rows.find(entry => entry.endpoint === table && Array.isArray(entry.data));
        if (fullTableSnapshot && canFilterEndpoint(endpoint)) {
            return fullTableSnapshot.data.filter(row => matchesEndpoint(row, endpoint));
        }

        const idFilter = new URLSearchParams(endpoint.split('?')[1] || '').get('id');
        if (!idFilter?.startsWith('eq.')) return null;
        const matches = new Map();
        rows.filter(entry => getTable(entry.endpoint) === table && Array.isArray(entry.data))
            .filter(entry => [...new URLSearchParams(entry.endpoint.split('?')[1] || '')]
                .every(([field, value]) => field !== 'select' || value === '*'))
            .forEach(entry => entry.data.filter(row => matchesEndpoint(row, endpoint))
                .forEach(row => matches.set(String(row.id), row)));
        return matches.size ? [...matches.values()] : null;
    }

    async function applyMutationToCaches(endpoint, method, body, offlineId) {
        const table = getTable(endpoint);
        const entries = await runTransaction(RESPONSES_STORE, 'readonly', store => store.getAll());
        const database = await openDatabase();
        await new Promise((resolve, reject) => {
            const transaction = database.transaction(RESPONSES_STORE, 'readwrite');
            const store = transaction.objectStore(RESPONSES_STORE);
            const tableEntries = entries.filter(entry => getTable(entry.endpoint) === table && Array.isArray(entry.data));
            tableEntries
                .forEach(entry => {
                    let data = entry.data;
                    if (method === 'POST') {
                        const rows = Array.isArray(body) ? body : [body];
                        data = [...data, ...rows.filter(row => matchesEndpoint(row, entry.endpoint))
                            .map(row => ({ ...row, __zk360_offline_id: offlineId }))];
                    } else if (method === 'PATCH') {
                        data = data.map(row => matchesEndpoint(row, endpoint) ? { ...row, ...body } : row);
                    } else if (method === 'DELETE') {
                        data = data.filter(row => !matchesEndpoint(row, endpoint));
                    }
                    store.put({ ...entry, data });
                });
            if (!tableEntries.length && method === 'POST') {
                const rows = Array.isArray(body) ? body : [body];
                store.put({
                    endpoint: table,
                    data: rows.map(row => ({ ...row, __zk360_offline_id: offlineId })),
                    updatedAt: new Date().toISOString()
                });
            }
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error || new Error('No se pudo actualizar la caché offline.'));
            transaction.onabort = () => reject(transaction.error || new Error('Se canceló la caché offline.'));
        });
    }

    window.ZK360OfflineStore = {
        async getResponse(endpoint) {
            const exact = await runTransaction(RESPONSES_STORE, 'readonly', store => store.get(endpoint));
            if (exact) return exact.data;
            return getCachedRows(endpoint);
        },
        setResponse(endpoint, data) {
            return runTransaction(RESPONSES_STORE, 'readwrite', store =>
                store.put({ endpoint, data, updatedAt: new Date().toISOString() })
            );
        },
        applyMutationToCaches,
        async enqueueMutation(mutation) {
            const baseline = ['PATCH', 'DELETE'].includes(mutation.method)
                ? await getCachedRows(mutation.endpoint)
                : null;
            if (['PATCH', 'DELETE'].includes(mutation.method) &&
                (!Array.isArray(baseline) || !baseline.length)) {
                throw new Error('No hay una copia local del registro para validar el cambio antes de sincronizarlo.');
            }
            const id = await runTransaction(MUTATIONS_STORE, 'readwrite', store =>
                store.add({ ...mutation, baseline, createdAt: new Date().toISOString() })
            );
            try {
                await applyMutationToCaches(mutation.endpoint, mutation.method, mutation.body, id);
            } catch (error) {
                await runTransaction(MUTATIONS_STORE, 'readwrite', store => store.delete(id));
                throw error;
            }
            return id;
        },
        listMutations() {
            return runTransaction(MUTATIONS_STORE, 'readonly', store => store.getAll())
                .then(rows => rows.sort((a, b) => a.id - b.id));
        },
        removeMutation(id) {
            return runTransaction(MUTATIONS_STORE, 'readwrite', store => store.delete(id));
        },
        async invalidateTable(table) {
            const entries = await runTransaction(RESPONSES_STORE, 'readonly', store => store.getAll());
            const database = await openDatabase();
            await new Promise((resolve, reject) => {
                const transaction = database.transaction(RESPONSES_STORE, 'readwrite');
                const store = transaction.objectStore(RESPONSES_STORE);
                entries.filter(entry => getTable(entry.endpoint) === table)
                    .forEach(entry => store.delete(entry.endpoint));
                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error || new Error('No se pudo invalidar la caché offline.'));
                transaction.onabort = () => reject(transaction.error || new Error('Se canceló la caché offline.'));
            });
        },
        async clearResponses() {
            const database = await openDatabase();
            await new Promise((resolve, reject) => {
                const transaction = database.transaction(RESPONSES_STORE, 'readwrite');
                transaction.objectStore(RESPONSES_STORE).clear();
                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error || new Error('No se pudo borrar la caché offline.'));
                transaction.onabort = () => reject(transaction.error || new Error('Se canceló el borrado de la caché offline.'));
            });
        },
        equalSnapshots: (left, right) => stableStringify(left) === stableStringify(right)
    };
})();

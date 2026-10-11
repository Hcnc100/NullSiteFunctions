# Migración de notificaciones a segunda generación

La versión modernizada inicial era gen1/Node22. submitContact es otra función y es gen2; el runtime Node22 por sí solo no determina la generación.

## Objetivo
notifyEmailV2, Node22, Cloud Run/Eventarc, us-central1, trigger Firestore `emails/{idEmail}`. Mantiene lectura de phones/tokenGCM y el payload móvil; no requiere cambiar la app ni los documentos existentes.

Firebase no cambia en sitio el nombre gen1 a gen2 mediante firebase deploy. La herramienta upgrade de GCP solo cubre HTTP/PubSub, no este trigger Firestore: [Firebase](https://firebase.google.com/docs/functions/2nd-gen-upgrade), [limitaciones GCP](https://docs.cloud.google.com/functions/1stgendocs/migrating/upgrade-gen1-functions).

## Transición segura
1. Actualizar gen1 con una reclamación transaccional compartida antes de desplegar gen2.
2. Crear gen2 mientras gen1 sigue atendiendo: ambos usan el mismo registro y solo el ganador envía.
3. Verificar gen2 ACTIVE, trigger e identidad; conceder invocación autenticada de su servicio a la identidad del trigger.
4. Retirar gen1 después de verificar gen2 y eliminar su export del código. El pipeline pasa a desplegar solo notifyEmailV2.

## Registro interno
Nueva colección notification-deliveries: clave SHA256 derivada del ID del correo, createdAt y version. No guarda texto, correo electrónico ni tokens. No se cambian emails ni phones.

La reclamación se crea antes del envío y no se borra: evita reenvíos por el mismo ID y la doble entrega normal entre generaciones, pero **no garantiza exactamente una entrega**. Si el proceso cae después de reclamar, puede perderse la notificación; se mantienen reintentos deshabilitados. Recrear un correo con el mismo ID tampoco reenviará la notificación. Para contactos nuevos, usar nuevos IDs como hace el backend actual.

IAM runtime: conserva lectura de Firestore y envío FCM; añade datastore.entities.create para el registro interno y Eventarc Event Receiver. Son permisos de proyecto, no limitación por colección; las reglas de cliente no restringen Admin SDK. La colección debe permanecer no accesible a clientes no autorizados; no se amplían reglas de cliente durante esta migración.

## Coste y límites
Gen2 con minInstances 0, maxInstances 3, concurrency 1, memoria 256MiB y timeout 120s. Limita concurrencia para conservar comportamiento; no se promete ahorro frente a gen1, porque Cloud Run/Eventarc tienen un modelo de coste distinto.

## Key Learnings:
1. submitContact gen2 y notifyEmail gen1 son funciones independientes; Node22 no implica segunda generación.
2. El trigger Firestore exige una transición con otro nombre; una reclamación compartida reduce duplicados sin interrumpir el servicio original durante la provisión.
3. La deduplicación elegida prioriza no reenviar y no equivale a garantía de entrega exactamente una vez.

## Handoff
- Objetivo: migrar notificaciones a gen2 conservando el contrato Firebase/móvil.
- Preparado: código de ambas generaciones, reclamación, pruebas y pipeline dirigido a gen2.
- Pendiente de consignar: verificación final de gen2, retirada de gen1 y resultado CI.
- Archivos: functions/index.mjs, functions/delivery.mjs, functions/notify.mjs, functions/test/, .github/workflows/deploy-notifications.yml.

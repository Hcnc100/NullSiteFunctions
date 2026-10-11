# NullSite Notifications

Modernización de la fuente realmente desplegada de `notifyEmail`, recuperada de GCP el 11 de octubre de 2026. Las carpetas antiguas NullSite/NullSite2 no eran idénticas al código remoto. La referencia original se conserva en `reference/deployed-2024/`, sin runtimeconfig ni secretos.

## Contrato Firebase conservado
- Proyecto `nullpointer-716ae`, región `us-central1`, función `notifyEmailV2`, gen2.
- Trigger de creación Firestore: `emails/{idEmail}`.
- Lee `phones` y envía a `tokenGCM`; no modifica ni borra contactos ni teléfonos. Crea reclamaciones internas en `notification-deliveries`.
- Datos FCM: conserva idEmail, email, name, subject, isOpen, message, createdAt, updatedAt; todos cadenas. Añade notify como JSON con id, timestamp numérico y los cuatro textos, compatible con MyFirebaseMessagingService/EmailDeserializer de NullSiteAdmin. Fechas desde Timestamp.toMillis().
- Sin cambios de reglas, índices, documentos existentes, Hosting ni submitContact.
- Runtime Node22; firebase-admin 14.5.0 y firebase-functions 7.4.0, fijados en lockfile.

## Robustez
Valida documentos/fechas y tamaño del payload, omite tokens vacíos, deduplica tokens y limita envíos concurrentes a 10. Espera los envíos y registra solo contadores. Tokens inválidos no se eliminan automáticamente. Mantiene reintentos deshabilitados, como la versión original; los fallos parciales se cuentan y no provocan reenvío de éxitos. Esto no garantiza entrega ni evita duplicados causados por una eventual entrega repetida del evento de Firestore.

## Pruebas
Desde functions: `npm ci`, `npm test`, `npm audit --audit-level=high`.
Incluyen contrato móvil, trigger exportado, datos malformados, límites Unicode, deduplicación, fallos parciales y colección vacía.

## Pipeline
Repositorio: https://github.com/Hcnc100/NullSiteFunctions
No había workflows en las copias locales ni en el repositorio remoto al revisarlo. Se añadió `.github/workflows/deploy-notifications.yml`:
- PR valida sin credenciales.
- Merge/push a main valida y despliega solo `functions:notifyEmailV2`.
- Ejecución manual desde main también disponible.
- WIF sin claves JSON; proveedor nullsitenotifications restringido a este repositorio y main.
- Cuenta deploy dedicada: github-notify-deploy; Cloud Functions Developer, Service Usage Consumer y actAs solo sobre notify-runtime.
- Cuenta runtime notify-runtime: Datastore Viewer, Firebase Cloud Messaging Admin, Eventarc Event Receiver y permiso personalizado datastore.entities.create para reclamaciones. Invocación autenticada solo sobre su servicio Cloud Run. Los permisos Firestore son de proyecto; Admin SDK no se restringe por reglas del cliente. Sin secretos ni permisos de borrado/actualización.

Deploy explícito: `npx --yes firebase-tools@15.22.1 deploy --only functions:notifyEmailV2 --project nullpointer-716ae --non-interactive`.
Nunca desplegar indiscriminadamente todas las funciones desde una copia antigua. No volver a Node16 como rollback: está retirado; conservar versiones compatibles para rollback.

## Key Learnings:
1. La versión original real se reconstruyó desde GCP y conserva el esquema phones/tokenGCM; las copias locales antiguas no eran fuentes fieles.
2. La migración a gen2 conserva trigger/payload y añade una reclamación interna; véase MIGRACION-GEN2.md para límites de entrega y transición.
3. El pipeline de notificaciones se aísla del release de la web y despliega exclusivamente notifyEmailV2.

## Handoff
- Objetivo: recuperar, modernizar y desplegar la función de notificación con CI propio.
- Implementado: fuente Node22, pruebas, referencia original y pipeline WIF.
- Pendiente de comprobación final: resultado del despliegue y entrega real a móvil; ver informe de ejecución de esta sesión.
- Archivos: functions/index.mjs, functions/notify.mjs, functions/test/, firebase.json, .github/workflows/deploy-notifications.yml.

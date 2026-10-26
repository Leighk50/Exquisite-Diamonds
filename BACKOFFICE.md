# Jewellery back office

## Enable the back office

The existing Azure App Service is `Exquisite-Diamonds-Demo-Staging`.

1. In **Settings → Environment variables → App settings**, add `BACKOFFICE_PASSWORD` with a unique password of at least 12 characters. Do not put it in code, a workflow, or public chat.
2. Apply/save the setting and restart the app. Existing passwords can be changed in the same place; a password change invalidates existing sign-in cookies.
3. Open `https://exquisite.villagelimits.co.uk/backoffice/`. No default password exists. If the setting is missing or too short, all administration endpoints remain locked and the public catalogue still works.

Use HTTPS. The session cookie is HttpOnly, Secure on Azure/production, SameSite Strict, and expires after eight hours. Mutations also need a session-specific CSRF token. Login attempts are throttled per server connection address (Azure proxy connections may share a limit). The dashboard is excluded from indexing; API authorization does not rely on hiding its URL.

## Storage and upgrades

This is a Node.js App Service with a static Next.js export and a small server-side catalogue API. There are no live Next.js server components or new runtime packages to install.

On Azure the catalogue, photographs, session key and ten previous catalogue snapshots live under `/home/data/antique-diamonds`, outside `/home/site/wwwroot` and deployment ZIPs. `CATALOGUE_DATA_DIR` may override this with another **persistent** mounted directory. The existing App Service uses the built-in Node code stack, whose `/home` is persistent. If moving to a custom Linux container, explicitly enable its App Service storage mount first. Do not use an ephemeral container path or point at the website deployment directory.

The deployment includes a seed catalogue generated from `app/data/products.js`. It is used **only once** when a new storage directory is initialised. It never overwrites a saved catalogue. Invalid or unexpectedly missing saved data causes a clear startup failure instead of reverting to the seed. The original seven demo listings remain available to edit; their descriptions/certificates still need replacing with actual stock details.

Saves use an atomic rename, a shared write-directory lock and revision checks. Two browser sessions cannot silently overwrite one another. Conflicts preserve the unsaved editor and require reloading the latest catalogue before retrying. The cross-process lock also serializes writers sharing the mounted directory. Do not manually edit the JSON while the app is running.

A previous catalogue snapshot is saved before each successful change. Photos are never automatically deleted, so older snapshots retain their photo references. These snapshots are on the same storage as the live catalogue; they are recovery history, not an independent disaster-recovery backup. Arrange an external backup of the **whole data directory** for disaster recovery. The dashboard's Export catalogue button downloads metadata and image links, not the original image files.

If the process is killed during a write, a `.write-lock` directory can remain. Stop every instance, check catalogue and backups, and remove that stale directory before restarting. Never clear a lock while another instance might be saving. To restore a snapshot, stop all instances, copy the chosen `backups/<revision>.json` to `catalogue.json`, retain the `media` directory and `.session-key`, remove a confirmed stale lock if necessary, then restart. Keep a copy of the original data before restoration.

## Managing stock

- Add/edit name, URL, stock reference, price, type, collection, description, condition, dimensions, ring size, gemstone details and provenance.
- Upload up to 12 JPG/PNG/WebP photos of at most 8 MB each. The first is the cover; arrows reorder them. Uploading photos does not save the item: use **Save item**.
- New items begin as drafts. Publish makes them public immediately. Unpublishing hides them and makes their product URL return 404.
- Marking a published item sold keeps its detail page, disables adding it to the basket and excludes it from homepage/featured picks. Existing baskets do not constitute orders; live checkout remains disabled as before.
- Featured is independent of Just arrived. Lower featured order numbers come first; the first two available featured pieces appear beside the homepage headline. All available featured pieces appear at `/featured/`.
- All jewellery appears at `/collection/`, including Other jewellery. The modern collection remains one combined preloved collection.
- The gemstone-weight clause is automatically displayed on every product page.
- New product URLs work immediately using the generic exported product shell. Browser content refreshes from the API on load and when returning to the tab; all product/HTML/API responses avoid stale caching. Unknown/unpublished product paths return 404.

## Development and tests

`npm install`, `npm test`, then `npm run build`. Run locally with `BACKOFFICE_PASSWORD` set and `npm start`. Local storage defaults to `~/.antique-diamonds`; prefer setting a throwaway `CATALOGUE_DATA_DIR` during testing. Do not commit real catalogue files, photographs or credentials.

The workflow tests and builds, then deploys `out`, `server.js`, `backend/` and `catalogue-seed.json`. It must not deploy or remove the persistent data directory.

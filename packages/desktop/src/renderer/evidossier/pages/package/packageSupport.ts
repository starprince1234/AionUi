/**
 * Package workspace shared popup mounting.
 *
 * Arco portals its popups to `document.body` by default, which would drop the
 * Carbon token scope that lives on `.evd-root`. Every popup surface in the
 * workbench therefore mounts inside the Evidossier root.
 */

/** Mounts Arco popups inside the Evidossier theme scope. */
export const getPopupMount = (): HTMLElement => {
  if (typeof document === 'undefined') return undefined as unknown as HTMLElement;
  const root = document.querySelector('.evd-root');
  return root instanceof HTMLElement ? root : document.body;
};

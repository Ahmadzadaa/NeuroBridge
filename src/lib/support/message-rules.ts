/** How long after sending a message its author may still edit or delete it. Shared by browser and server. */
export const EDIT_WINDOW_MINUTES = 15;
export const EDIT_WINDOW_MS = EDIT_WINDOW_MINUTES * 60 * 1000;

export const withinEditWindow = (createdAt: Date | string, now: number = Date.now()) => now - new Date(createdAt).getTime() < EDIT_WINDOW_MS;

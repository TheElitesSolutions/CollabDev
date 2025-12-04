'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import type { Awareness } from 'y-protocols/awareness';

// User awareness state from Yjs
export interface AwarenessUser {
  name: string;
  color: string;
  colorLight?: string;
}

export interface AwarenessState {
  user?: AwarenessUser;
}

// Enhanced state with activity tracking
interface CursorWithActivity {
  state: AwarenessState;
  lastActivityAt: number;
  isIdle: boolean;
}

interface CursorPresenceProps {
  awareness: Awareness | null;
  idleTimeoutMs?: number; // Configurable idle timeout (default: 45s)
}

// Time constants
const DEFAULT_IDLE_TIMEOUT_MS = 45000; // 45 seconds
const IDLE_CHECK_INTERVAL_MS = 10000; // Check every 10 seconds

/**
 * CursorPresence Component
 *
 * Injects dynamic CSS for remote user cursors based on Yjs awareness protocol.
 * Each connected user gets unique cursor colors and name labels.
 * Features:
 * - Idle cursor fading after configurable timeout
 * - Smooth transitions for cursor appearance/fading
 * - Labels positioned to the right to avoid blocking code
 */
export function CursorPresence({
  awareness,
  idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS
}: CursorPresenceProps) {
  const [awarenessStates, setAwarenessStates] = useState<Map<number, CursorWithActivity>>(new Map());

  // Track last activity time for each client
  const activityMapRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    if (!awareness) return;

    const updateStates = () => {
      const states = new Map<number, CursorWithActivity>();
      const now = Date.now();

      awareness.getStates().forEach((state, clientId) => {
        // Skip our own client
        if (clientId !== awareness.clientID) {
          const lastActivity = activityMapRef.current.get(clientId) || now;
          const isIdle = (now - lastActivity) > idleTimeoutMs;

          states.set(clientId, {
            state: state as AwarenessState,
            lastActivityAt: lastActivity,
            isIdle,
          });
        }
      });
      setAwarenessStates(new Map(states));
    };

    const handleChange = () => {
      const now = Date.now();
      // Update activity timestamp for all clients that changed
      awareness.getStates().forEach((_, clientId) => {
        if (clientId !== awareness.clientID) {
          activityMapRef.current.set(clientId, now);
        }
      });
      updateStates();
    };

    // Initial update
    updateStates();

    // Listen for awareness changes
    awareness.on('change', handleChange);

    // Periodic idle check to update opacity
    const idleInterval = setInterval(updateStates, IDLE_CHECK_INTERVAL_MS);

    return () => {
      awareness.off('change', handleChange);
      clearInterval(idleInterval);
    };
  }, [awareness, idleTimeoutMs]);

  // Generate CSS for all remote users with idle state handling
  const cursorStyles = useMemo(() => {
    const styles: string[] = [];

    awarenessStates.forEach(({ state, isIdle }, clientId) => {
      if (!state.user) return;

      const { name, color, colorLight } = state.user;
      const selectionColor = colorLight || `${color}40`; // 40 = 25% opacity in hex

      // Reduce opacity when idle
      const opacity = isIdle ? 0.3 : 1;
      const borderWidth = isIdle ? '1px' : '2px';

      styles.push(`
        /* Client ${clientId} - ${name} ${isIdle ? '(idle)' : '(active)'} */
        .yRemoteSelection-${clientId} {
          background-color: ${selectionColor};
          opacity: ${opacity};
          transition: opacity 0.3s ease-in-out;
        }
        .yRemoteSelectionHead-${clientId} {
          --user-color: ${color};
          border-left-color: ${color};
          border-left-width: ${borderWidth};
          opacity: ${opacity};
          transition: opacity 0.3s ease-in-out, border-left-width 0.2s ease-in-out;
        }
        .yRemoteSelectionHead-${clientId}::after {
          content: "${name}";
          background-color: ${color};
          opacity: 1;
        }
      `);
    });

    return styles.join('\n');
  }, [awarenessStates]);

  // Render active collaborators list
  const collaborators = useMemo(() => {
    return Array.from(awarenessStates.entries())
      .filter(([, { state }]) => state.user)
      .map(([clientId, { state, isIdle }]) => ({
        clientId,
        isIdle,
        ...state.user!,
      }));
  }, [awarenessStates]);

  // Count active vs idle collaborators
  const activeCount = collaborators.filter(c => !c.isIdle).length;
  const idleCount = collaborators.filter(c => c.isIdle).length;

  return (
    <>
      {/* Dynamic cursor styles */}
      <style dangerouslySetInnerHTML={{ __html: cursorStyles }} />

      {/* Collaborator indicators */}
      {collaborators.length > 0 && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
          <div className="flex -space-x-2">
            {collaborators.slice(0, 4).map((collab) => (
              <div
                key={collab.clientId}
                className="collaborator-avatar flex items-center justify-center text-[10px] font-medium text-white"
                style={{
                  backgroundColor: collab.color,
                  borderColor: collab.color,
                  opacity: collab.isIdle ? 0.5 : 1,
                  transition: 'opacity 0.3s ease-in-out',
                }}
                title={`${collab.name}${collab.isIdle ? ' (idle)' : ''}`}
              >
                {getInitials(collab.name)}
              </div>
            ))}
          </div>
          {collaborators.length > 4 && (
            <div className="px-2 py-1 rounded-full text-xs bg-gray-600 text-white">
              +{collaborators.length - 4}
            </div>
          )}
          <span className="ml-2 text-xs text-gray-400">
            {activeCount > 0 && `${activeCount} active`}
            {activeCount > 0 && idleCount > 0 && ', '}
            {idleCount > 0 && `${idleCount} idle`}
          </span>
        </div>
      )}
    </>
  );
}

/**
 * Get initials from a user name
 */
function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a consistent color for a user based on their ID/name
 */
export function getUserColor(identifier: string): { color: string; colorLight: string } {
  const colors = [
    { color: '#ef4444', colorLight: '#ef444440' }, // red
    { color: '#f97316', colorLight: '#f9731640' }, // orange
    { color: '#eab308', colorLight: '#eab30840' }, // yellow
    { color: '#22c55e', colorLight: '#22c55e40' }, // green
    { color: '#14b8a6', colorLight: '#14b8a640' }, // teal
    { color: '#3b82f6', colorLight: '#3b82f640' }, // blue
    { color: '#8b5cf6', colorLight: '#8b5cf640' }, // violet
    { color: '#ec4899', colorLight: '#ec489940' }, // pink
    { color: '#06b6d4', colorLight: '#06b6d440' }, // cyan
    { color: '#84cc16', colorLight: '#84cc1640' }, // lime
  ];

  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

export default CursorPresence;

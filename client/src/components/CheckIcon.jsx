import { useBecameTrue } from '../motion';
import './CheckIcon.css';

/**
 * Checkbox glyph. Both states are always rendered and crossfaded (with a
 * touch of blur) rather than swapped; the orange fill is revealed with a
 * circular clip mask, and the whole icon pulses once when a task is ticked.
 */
export default function CheckIcon({ checked }) {
  const pulseKey = useBecameTrue(checked);
  return (
    <span
      className={`check-icon ${checked ? 'check-icon--on' : ''} ${pulseKey ? 'check-icon--pulse' : ''}`}
      aria-hidden="true"
    >
      <svg className="check-icon-off" width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="10" stroke="#D0CECA" strokeWidth="1.5" />
      </svg>
      <svg className="check-icon-on" width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="10" fill="var(--primary)" />
        <polyline points="6,11 9.5,14.5 16,8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </span>
  );
}

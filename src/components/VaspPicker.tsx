import type { Channel, VaspInfo } from '../types';

/**
 * Both views the brief asked about: "All" shows every VASP together with a
 * VASP column, or pick one to see just its side.
 */
export function VaspPicker({
  vasps,
  selected,
  onSelect,
}: {
  vasps: VaspInfo[];
  selected: string | null;
  onSelect: (name: string | null) => void;
}) {
  return (
    <div className="seg" role="group" aria-label="VASP">
      <button aria-pressed={selected === null} onClick={() => onSelect(null)}>
        All VASPs
      </button>
      {vasps.map((v) => (
        <button key={v.name} aria-pressed={selected === v.name} onClick={() => onSelect(v.name)} title={v.did}>
          {v.name}
        </button>
      ))}
    </div>
  );
}

export function ChannelPicker({ value, onChange }: { value: Channel; onChange: (c: Channel) => void }) {
  return (
    <div className="seg" role="group" aria-label="Channel">
      <button aria-pressed={value === 'notabene'} onClick={() => onChange('notabene')} title="The live Notabene Transact V2 API">
        Notabene
      </button>
      <button aria-pressed={value === 'local'} onClick={() => onChange('local')} title="In-memory stand-in on the Java server - same encryption, no network">
        Local
      </button>
    </div>
  );
}

import { useState, useCallback } from 'react';

interface ColorSwatchProps {
  value: [number, number, number]; // RGB 0–1
  onChange: (color: [number, number, number]) => void;
  variant: 'gallery' | 'room';
}

function toCss(value: [number, number, number]): string {
  const [r, g, b] = value;
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

const COLOR_CHANNELS = [
  { label: 'R', name: 'red' },
  { label: 'G', name: 'green' },
  { label: 'B', name: 'blue' },
] as const;

export function ColorSwatch({ value, onChange, variant }: ColorSwatchProps) {
  const [open, setOpen] = useState(false);

  const handleSlider = useCallback(
    (channel: number, val: string) => {
      const next = [...value] as [number, number, number];
      next[channel] = parseFloat(val);
      onChange(next);
    },
    [value, onChange],
  );

  return (
    <div className={`color-swatch color-swatch--${variant}`}>
      <button
        type="button"
        className="color-swatch__chip"
        style={{ backgroundColor: toCss(value) }}
        onClick={() => setOpen(!open)}
        aria-label={`Color: ${toCss(value)}`}
      />
      {open && (
        <div className="color-swatch__popover">
          {COLOR_CHANNELS.map((channel, i) => (
            <label key={channel.name} className="color-swatch__channel">
              <span>{channel.label}</span>
              <input
                type="range"
                name={channel.name}
                min={0}
                max={1}
                step={0.01}
                value={value[i]}
                onChange={(e) => handleSlider(i, e.target.value)}
              />
            </label>
          ))}
          <div className="color-swatch__preview" style={{ backgroundColor: toCss(value) }} />
        </div>
      )}
    </div>
  );
}

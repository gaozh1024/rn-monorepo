import { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface DropdownSelectProps {
  value: string;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
}

export function DropdownSelect({
  value,
  options,
  placeholder = '请选择',
  className = '',
  onChange,
}: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedOption = useMemo(
    () => options.find(option => option.value === value),
    [options, value]
  );

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function selectOption(option: DropdownOption) {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
  }

  return (
    <div className={`dropdown-select ${className}`} ref={rootRef}>
      <button
        type="button"
        className={`dropdown-trigger ${open ? 'is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => setOpen(current => !current)}
      >
        <span className="dropdown-trigger-content">
          <span className={`dropdown-label ${selectedOption ? '' : 'is-placeholder'}`}>
            {selectedOption?.label ?? placeholder}
          </span>
          {selectedOption?.description ? (
            <span className="dropdown-description">{selectedOption.description}</span>
          ) : null}
        </span>
        <span className="dropdown-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div className="dropdown-menu" id={listboxId} role="listbox">
          {options.map(option => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className={`dropdown-option ${selected ? 'is-selected' : ''}`}
                disabled={option.disabled}
                role="option"
                aria-selected={selected}
                onClick={() => selectOption(option)}
              >
                <span className="dropdown-option-copy">
                  <span className="dropdown-label">{option.label}</span>
                  {option.description ? (
                    <span className="dropdown-description">{option.description}</span>
                  ) : null}
                </span>
                {selected ? (
                  <span className="dropdown-option-check" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

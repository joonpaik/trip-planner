import React, { useEffect, useRef, useState } from 'react';

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Free, keyless address lookup via OpenStreetMap's Nominatim API.
export const AddressAutocompleteInput: React.FC<
  AddressAutocompleteInputProps
> = ({ value, onChange, placeholder, className }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextFetchRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = value.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=5&q=${encodeURIComponent(query)}`
        );
        if (!response.ok) throw new Error('Address lookup failed');
        const data = await response.json();
        const results: string[] = Array.isArray(data)
          ? data.map((item: any) => item.display_name)
          : [];
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (err) {
        console.error('Failed to fetch address suggestions:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleSelect = (suggestion: string) => {
    skipNextFetchRef.current = true;
    onChange(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-blue-500" />
        </div>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(suggestion)}
              title={suggestion}
              className="block w-full truncate border-b border-gray-100 px-3 py-2 text-left text-sm text-gray-700 last:border-b-0 hover:bg-gray-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressAutocompleteInput;

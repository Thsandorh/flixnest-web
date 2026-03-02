import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';

export default function SearchInput() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const currentName = searchParams.get('name')?.toString() || '';
  const [inputValue, setInputValue] = useState<string>(currentName);
  const searchValue = useDebounce(inputValue);

  useEffect(() => {
    setInputValue(currentName);
  }, [currentName]);

  useEffect(() => {
    const normalizedSearchValue = searchValue.trim();
    if (normalizedSearchValue === currentName) return;

    const params = new URLSearchParams(searchParams.toString());

    if (normalizedSearchValue) {
      params.set('name', normalizedSearchValue);
    } else {
      params.delete('name');
    }

    const query = params.toString();
    replace(query ? `${pathname}?${query}` : pathname);
  }, [currentName, pathname, replace, searchParams, searchValue]);

  return (
    <input
      type="text"
      className="tv-input w-full h-full rounded-2xl border border-white/10 bg-white px-4 text-base text-black shadow-[0_16px_44px_rgba(0,0,0,0.14)] lg:text-lg"
      placeholder="Enter movie name..."
      onChange={(e) => setInputValue(e.target.value)}
      value={inputValue}
    />
  );
}

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';

export default function SearchInput() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const [inputValue, setInputValue] = useState<string>(searchParams.get('name')?.toString() || '');
  const searchValue = useDebounce(inputValue);

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams);

    if (term.trim()) {
      params.set('name', term);
    } else {
      params.delete('name');
    }
    replace(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    if (searchParams.get('name')?.toString() === inputValue) return;
    handleSearch(searchValue);
  }, [searchValue]);

  return (
    <input
      type="text"
      className="tv-input w-full h-full rounded-2xl border border-white/10 bg-white px-4 text-base text-black shadow-[0_16px_44px_rgba(0,0,0,0.14)] lg:text-lg"
      placeholder="Enter movie name..."
      onChange={(e) => setInputValue(e.target.value)}
      defaultValue={searchParams.get('name')?.toString()}
    />
  );
}
